// packages/api/src/core/billing/yoco-webhook.js

import { applyBillingEvent } from "./subscription-engine.js";
import { writeSystemEvent } from "../../api/admin/observability.js";

/**
 * Yoco Webhook Handler (Svix spec)
 * ---------------------------------
 * 1. Verify signature (HMAC-SHA256, whsec_ base64 secret)
 * 2. Replay protection (±3 min timestamp window)
 * 3. Parse event
 * 4. Insert payment (idempotent via UNIQUE provider_event_id)
 * 5. Create billing event + trigger subscription state machine
 * 6. Always return 200 to Yoco
 *
 * NOT behind any auth middleware — called directly from server.js public block.
 */

export async function handleYocoWebhook(request, env) {
  /* =====================================================
     1. READ RAW BODY (required before any await on request)
     ===================================================== */
  const rawBody = await request.text();
  const headers = request.headers;

  const webhookId = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");

  const isDev = env.ENVIRONMENT !== "production";

  if (!webhookId || !timestamp || !signatureHeader) {
    // In dev, accept unsigned local test payloads via X-Dev-Webhook: 1
    if (isDev && headers.get("x-dev-webhook") === "1") {
      console.warn("[YOCO-DEV] Accepting unsigned webhook — dev mode only");
    } else {
      return new Response("Missing webhook headers", { status: 401 });
    }
  }

  /* =====================================================
     2. REPLAY PROTECTION (±3 minutes) — skipped in dev
     ===================================================== */
  if (!isDev) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 180) {
      return new Response("Webhook timestamp expired", { status: 401 });
    }
  }

  /* =====================================================
     3. SIGNATURE VERIFICATION — production only
     Dev mode: bypassed when YOCO_WEBHOOK_SECRET absent or X-Dev-Webhook: 1 present
     ===================================================== */
  const fullSecret = env.YOCO_WEBHOOK_SECRET;
  const devBypass  = isDev && (!fullSecret || headers.get("x-dev-webhook") === "1");

  if (!devBypass) {
    if (!fullSecret || !fullSecret.startsWith("whsec_")) {
      console.error("[YOCO] YOCO_WEBHOOK_SECRET missing or malformed");
      return new Response("Webhook secret misconfigured", { status: 500 });
    }

    const secretBytes = Uint8Array.from(
      atob(fullSecret.slice("whsec_".length)),
      (c) => c.charCodeAt(0)
    );

    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signedContent = `${webhookId}.${timestamp}.${rawBody}`;

    // Signature header format: "v1,<base64>" — Svix may send multiple, take first v1
    const providedSig = signatureHeader
      ? signatureHeader.split(" ").map(s => s.trim()).find(s => s.startsWith("v1,"))?.slice(3)
      : null;

    if (!providedSig) {
      return new Response("Invalid signature format", { status: 401 });
    }

    let sigBytes;
    try {
      sigBytes = Uint8Array.from(atob(providedSig), (c) => c.charCodeAt(0));
    } catch {
      return new Response("Malformed signature", { status: 401 });
    }

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(signedContent)
    );

    if (!valid) {
      return new Response("Invalid webhook signature", { status: 401 });
    }
  } else {
    console.warn("[YOCO-DEV] Signature verification bypassed — dev mode");
  }

  /* =====================================================
     4. PARSE EVENT (safe after verification)
     ===================================================== */
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  /* =====================================================
     5. MAP EVENT TYPE
     ===================================================== */
  const eventType = event.type;
  const data = event.data;

  // brand_id MUST be in metadata to associate payment with a customer
  if (!data?.metadata?.brand_id) {
    return new Response("OK", { status: 200 });
  }

  const brandId    = data.metadata.brand_id;
  const planId     = data.metadata.plan_id || null;
  const checkoutId = data.metadata.checkout_id || null;

  let paymentStatus;
  let billingEventType;

  if (eventType === "payment.succeeded") {
    paymentStatus = "succeeded";
    billingEventType = "payment_received";
  } else if (eventType === "payment.failed") {
    paymentStatus = "failed";
    billingEventType = "payment_failed";
  } else if (eventType === "refund.succeeded") {
    paymentStatus = "refunded";
    billingEventType = "refund_received";
  } else {
    return new Response("OK", { status: 200 });
  }

  /* =====================================================
     6. INSERT PAYMENT (idempotent — UNIQUE on provider+provider_event_id)
     ===================================================== */
  let isNewPayment = true;
  try {
    await env.DB.prepare(`
      INSERT INTO payments
        (id, brand_id, provider, provider_event_id, provider_payment_id, amount, currency, status,
         occurred_at, created_at, checkout_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      brandId,
      "yoco",
      event.id,
      data.id || null,
      data.amount,
      data.currency || "ZAR",
      paymentStatus,
      new Date((event.created || 0) * 1000).toISOString(),
      new Date().toISOString(),
      checkoutId
    ).run();
  } catch {
    // UNIQUE violation = duplicate event; skip state machine to ensure full idempotency
    isNewPayment = false;
  }

  /* =====================================================
     7. BILLING EVENT + SUBSCRIPTION STATE MACHINE
     Only runs for genuinely new payments to prevent duplicate billing events.
     ===================================================== */
  if (billingEventType && isNewPayment) {
    try {
      await env.DB.prepare(`
        INSERT INTO billing_events (id, brand_id, event_type, amount, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        brandId,
        billingEventType,
        data.amount,
        new Date().toISOString()
      ).run();
    } catch (err) {
      console.error("[YOCO] billing_events insert failed", err);
    }

    await applyBillingEvent(env, {
      customerId: brandId,
      eventType: billingEventType,
      amount: data.amount,
      planId,
      currency: data.currency || "USD",
      billingInterval: data.metadata?.billing_interval || "monthly",
      checkoutId,
      paymentId: data.id || null,
    });

    // Advance checkout status to match payment outcome
    if (checkoutId) {
      const checkoutStatus = billingEventType === "payment_received" ? "paid"
                           : billingEventType === "payment_failed"   ? "failed"
                           : null;
      if (checkoutStatus) {
        env.DB.prepare(
          "UPDATE checkouts SET status=?, completed_at=datetime('now') WHERE id=? AND status NOT IN ('paid','cancelled','expired')"
        ).bind(checkoutStatus, checkoutId).run().catch(() => {});
      }
    }

    writeSystemEvent(env, {
      severity: billingEventType === 'payment_failed' ? 'warning' : 'info',
      source: 'billing',
      message: `${billingEventType.replace('_', ' ')} for brand ${brandId} — ${data.currency} ${(data.amount / 100).toFixed(2)}`,
      metadata: JSON.stringify({ brand_id: brandId, plan_id: planId, amount: data.amount, event_type: billingEventType })
    }).catch(() => {});
  }

  return new Response("OK", { status: 200 });
}
