// packages/api/src/api/admin/refund.js
//
// Admin refund flow: Request → Eligibility Engine → Approve/Reject → Yoco
//
// No freeform amounts. Policy engine owns the refund_amount.
// Statutory override requires explicit statutory_reason; admin must confirm.
// Yoco refund endpoint: POST /api/payments/{provider_payment_id}/refund

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { computeRefundEligibility, POLICY_VERSION } from "../../core/billing/refund-policy.js";

const YOCO_API = "https://payments.yoco.com/api";

// ─── Request ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/billing/refund/request
 * Body: { payment_id, reason, statutory_override?, statutory_reason? }
 *
 * Runs policy engine. Creates refund_request.
 * Does NOT call Yoco — approve step does that.
 */
export async function requestRefund(request, env, auth) {
  const db   = getDB(env);
  const body = await request.json().catch(() => ({}));
  const { payment_id, reason, statutory_override = false, statutory_reason } = body;

  if (!payment_id) return error("payment_id required", "BAD_REQUEST", null, 400);
  if (!reason)     return error("reason required",     "BAD_REQUEST", null, 400);
  if (statutory_override && !statutory_reason)
    return error("statutory_reason required when statutory_override is true", "BAD_REQUEST", null, 400);

  // Load payment with billing_interval from checkout (or default monthly)
  const payment = await db.prepare(`
    SELECT
      p.id, p.brand_id, p.amount, p.currency, p.status, p.occurred_at,
      p.provider_payment_id,
      COALESCE(c.billing_interval, 'monthly') AS billing_interval
    FROM payments p
    LEFT JOIN checkouts c ON c.id = p.checkout_id
    WHERE p.id = ?
  `).bind(payment_id).first();

  if (!payment) return error("Payment not found", "NOT_FOUND", null, 404);
  if (payment.status !== "succeeded")
    return error("Only succeeded payments can be refunded", "BAD_REQUEST", null, 400);

  // Block duplicate open requests for same payment
  const existing = await db.prepare(
    "SELECT id, status FROM refund_requests WHERE payment_id = ? AND status NOT IN ('rejected','completed') LIMIT 1"
  ).bind(payment_id).first();
  if (existing)
    return error(
      `A refund request already exists for this payment (status: ${existing.status})`,
      "CONFLICT",
      { refund_request_id: existing.id },
      409
    );

  // Determine if renewal by checking prior succeeded payments for this brand
  const priorCount = await db.prepare(
    "SELECT COUNT(*) AS cnt FROM payments WHERE brand_id = ? AND status = 'succeeded' AND occurred_at < ?"
  ).bind(payment.brand_id, payment.occurred_at).first();
  const is_renewal = (priorCount?.cnt ?? 0) > 0;

  const decision = computeRefundEligibility({
    payment_date: payment.occurred_at,
    is_renewal,
    interval:     payment.billing_interval,
    amount:       payment.amount,
  });

  // Statutory override: eligible flag is true regardless of policy, but both are logged
  const final_eligible    = statutory_override ? true : decision.eligible;
  const final_percent     = statutory_override ? (decision.percent || 100) : decision.percent;
  const final_amount      = statutory_override ? (decision.refund_amount || payment.amount) : decision.refund_amount;

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO refund_requests
      (id, payment_id, brand_id, requested_by, reason, policy_version,
       eligible, refund_percent, refund_amount, status,
       statutory_override, statutory_reason, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'requested',?,?,datetime('now'),datetime('now'))
  `).bind(
    id, payment_id, payment.brand_id, auth.user_id, reason, POLICY_VERSION,
    final_eligible ? 1 : 0, final_percent, final_amount,
    statutory_override ? 1 : 0, statutory_reason || null
  ).run();

  return json({
    refund_request_id: id,
    eligible:          final_eligible,
    refund_percent:    final_percent,
    refund_amount:     final_amount,
    currency:          payment.currency,
    policy_reason:     decision.reason,
    statutory:         statutory_override,
    status:            "requested",
  }, 201);
}

// ─── Get ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/billing/refund/:id
 */
export async function getRefundRequest(request, env, refundId) {
  const db = getDB(env);
  const row = await db.prepare(`
    SELECT
      rr.*,
      p.amount AS payment_amount, p.currency, p.occurred_at AS payment_date,
      p.provider_payment_id,
      b.name AS brand_name,
      u.email AS owner_email
    FROM refund_requests rr
    JOIN payments p ON p.id = rr.payment_id
    JOIN brands   b ON b.id = rr.brand_id
    JOIN users    u ON u.id = b.owner_user_id
    WHERE rr.id = ?
  `).bind(refundId).first();

  if (!row) return error("Refund request not found", "NOT_FOUND", null, 404);
  return json({ refund_request: row });
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/billing/refunds
 */
export async function listRefundRequests(env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT
      rr.id, rr.status, rr.eligible, rr.refund_percent, rr.refund_amount,
      rr.statutory_override, rr.created_at,
      p.amount AS payment_amount, p.currency, p.occurred_at AS payment_date,
      b.name AS brand_name,
      u.email AS owner_email
    FROM refund_requests rr
    JOIN payments p ON p.id = rr.payment_id
    JOIN brands   b ON b.id = rr.brand_id
    JOIN users    u ON u.id = b.owner_user_id
    ORDER BY rr.created_at DESC
    LIMIT 200
  `).all();
  return json({ refund_requests: results || [] });
}

// ─── Approve ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/billing/refund/:id/approve
 * Calls Yoco and marks completed. Writes billing_event.
 */
export async function approveRefund(request, env, auth, refundId) {
  const db = getDB(env);

  const rr = await db.prepare(
    "SELECT * FROM refund_requests WHERE id = ?"
  ).bind(refundId).first();
  if (!rr) return error("Refund request not found", "NOT_FOUND", null, 404);

  if (rr.status !== "requested")
    return error(`Cannot approve — status is already '${rr.status}'`, "CONFLICT", null, 409);

  if (!rr.eligible)
    return error("Refund request is not eligible per policy. Use statutory_override when requesting.", "FORBIDDEN", null, 403);

  // Get the Yoco payment ID for the refund call
  const payment = await db.prepare(
    "SELECT provider_payment_id, provider_event_id, amount, currency FROM payments WHERE id = ?"
  ).bind(rr.payment_id).first();
  if (!payment) return error("Payment not found", "NOT_FOUND", null, 404);

  if (!env.YOCO_API_KEY)
    return error("Payment provider not configured", "PROVIDER_ERROR", null, 500);

  // Mark as processing before Yoco call
  await db.prepare(
    "UPDATE refund_requests SET status='processing', updated_at=datetime('now') WHERE id=?"
  ).bind(refundId).run();

  const yocoPaymentId = payment.provider_payment_id || payment.provider_event_id;
  let yocoResult = null;
  let yocoError  = null;

  try {
    const resp = await fetch(`${YOCO_API}/payments/${yocoPaymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${env.YOCO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: rr.refund_amount,
        note:   `Refund request ${refundId} — ${rr.reason}`,
      }),
    });

    const responseText = await resp.text();

    if (!resp.ok) {
      yocoError = responseText;
      console.error("[REFUND] Yoco error", resp.status, responseText);
    } else {
      try { yocoResult = JSON.parse(responseText); } catch { yocoResult = {}; }
    }
  } catch (err) {
    yocoError = err.message;
    console.error("[REFUND] Yoco unreachable", err);
  }

  if (yocoError) {
    // Roll back to requested so admin can retry
    await db.prepare(
      "UPDATE refund_requests SET status='requested', updated_at=datetime('now') WHERE id=?"
    ).bind(refundId).run();
    return error("Yoco refund failed — request rolled back to 'requested'", "PROVIDER_ERROR", { detail: yocoError }, 502);
  }

  const providerRefundId = yocoResult?.id || null;

  // Complete
  await db.prepare(
    "UPDATE refund_requests SET status='completed', provider_refund_id=?, updated_at=datetime('now') WHERE id=?"
  ).bind(providerRefundId, refundId).run();

  // Write billing_event (webhook will also fire refund.succeeded for subscription state)
  await db.prepare(`
    INSERT INTO billing_events (id, brand_id, event_type, amount, created_at)
    VALUES (?, ?, 'refund_issued', ?, datetime('now'))
  `).bind(crypto.randomUUID(), rr.brand_id, rr.refund_amount).run().catch(() => {});

  return json({
    success:            true,
    provider_refund_id: providerRefundId,
    refund_amount:      rr.refund_amount,
    status:             "completed",
  });
}

// ─── Reject ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/billing/refund/:id/reject
 * Body: { rejection_reason }
 */
export async function rejectRefund(request, env, refundId) {
  const db   = getDB(env);
  const body = await request.json().catch(() => ({}));
  const { rejection_reason } = body;

  if (!rejection_reason)
    return error("rejection_reason required", "BAD_REQUEST", null, 400);

  const rr = await db.prepare(
    "SELECT id, status FROM refund_requests WHERE id = ?"
  ).bind(refundId).first();
  if (!rr) return error("Refund request not found", "NOT_FOUND", null, 404);

  if (!["requested"].includes(rr.status))
    return error(`Cannot reject — status is '${rr.status}'`, "CONFLICT", null, 409);

  await db.prepare(
    "UPDATE refund_requests SET status='rejected', rejection_reason=?, updated_at=datetime('now') WHERE id=?"
  ).bind(rejection_reason, refundId).run();

  return json({ success: true, status: "rejected" });
}

// ─── Customer View ────────────────────────────────────────────────────────────

/**
 * GET /api/customer/billing/refunds
 * Visible to brand owner only — shows refund status + history.
 */
export async function getCustomerRefunds(request, env, auth) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT
      rr.id, rr.status, rr.eligible, rr.refund_percent, rr.refund_amount,
      rr.statutory_override, rr.rejection_reason, rr.created_at, rr.updated_at,
      p.amount AS payment_amount, p.currency, p.occurred_at AS payment_date,
      p.provider AS payment_provider
    FROM refund_requests rr
    JOIN payments p ON p.id = rr.payment_id
    JOIN brands   b ON b.id = rr.brand_id
    WHERE b.owner_user_id = ?
    ORDER BY rr.created_at DESC
    LIMIT 20
  `).bind(auth.user_id).all();
  return json({ refunds: results || [] });
}
