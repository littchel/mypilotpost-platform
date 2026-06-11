// packages/api/src/core/billing/checkout.js
// Checkout session orchestrator — YOCO sandbox wiring.
//
// Price resolution order (Correction 2):
//   1. brands.billing_country + brands.billing_currency (brand-stored)
//   2. regional_plans lookup for that country
//   3. Fallback: request.cf.country → getRegion() → regional_plans
//   4. Final fallback: plan canonical price (ZAR)
//
// The resolved country is snapshotted on checkouts.country.
// Webhooks from Yoco carry checkout_id in metadata — that is the only link.

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { getRegion } from "../../lib/geo.js";

const YOCO_API     = "https://payments.yoco.com/api/checkouts";
const CHECKOUT_TTL = 30; // minutes

// ─── Price Resolution ─────────────────────────────────────────────────────────

async function resolvePrice(db, plan, brand, requestCountry) {
  // Step 1: brand's stored billing country takes precedence
  const country  = brand.billing_country  || requestCountry || "ZA";
  const currency = brand.billing_currency || null;

  // Step 2: map country to pricing region
  const region = getRegion(country);

  // Step 3: look for a regional override
  const regional = await db.prepare(`
    SELECT price_monthly, price_yearly, currency
    FROM regional_plans
    WHERE plan_id = ? AND region = ?
    LIMIT 1
  `).bind(plan.id, region).first().catch(() => null);

  if (regional) {
    return {
      canonical_price: plan.price_cents,
      localized_price: regional.price_monthly,
      localized_yearly: regional.price_yearly,
      currency: regional.currency,
      fx_rate: regional.currency !== (plan.currency || "ZAR") ? null : 1.0,
      pricing_region: country,
    };
  }

  // Step 4: canonical plan price
  return {
    canonical_price: plan.price_cents,
    localized_price: plan.price_cents,
    localized_yearly: plan.price_yearly || plan.price_cents * 10,
    currency: currency || plan.currency || "ZAR",
    fx_rate: 1.0,
    pricing_region: country,
  };
}

// ─── Create Checkout ──────────────────────────────────────────────────────────

export async function createCheckout(request, env, auth) {
  const db   = getDB(env);
  const body = await request.json().catch(() => ({}));
  const { brand_id, plan_id, billing_interval = "monthly" } = body;

  if (!brand_id) return error("brand_id required", "BAD_REQUEST", null, 400);
  if (!plan_id)  return error("plan_id required",  "BAD_REQUEST", null, 400);
  if (!["monthly", "yearly"].includes(billing_interval))
    return error("billing_interval must be monthly or yearly", "BAD_REQUEST", null, 400);

  // Correction 1: caller must own the brand
  const brand = await db.prepare(`
    SELECT id, owner_user_id, billing_country, billing_currency
    FROM brands WHERE id = ? AND owner_user_id = ?
  `).bind(brand_id, auth.user_id).first();
  if (!brand) return error("Brand not found or access denied", "FORBIDDEN", null, 403);

  // Validate plan is purchasable
  const plan = await db.prepare(`
    SELECT id, name, price_cents, price_yearly, currency
    FROM plans
    WHERE id = ? AND is_active = 1 AND status != 'archived'
  `).bind(plan_id).first();
  if (!plan) return error("Plan not found or inactive", "NOT_FOUND", null, 404);

  // Correction 4: allow upgrade / downgrade / renew — no 402 block.
  // Only block if a non-terminal checkout already exists for this brand+plan.
  const clash = await db.prepare(`
    SELECT id FROM checkouts
    WHERE brand_id = ? AND plan_id = ? AND status IN ('created','pending')
    LIMIT 1
  `).bind(brand_id, plan_id).first();
  if (clash) {
    return error(
      "An active checkout already exists for this plan",
      "CHECKOUT_EXISTS",
      { checkout_id: clash.id },
      409
    );
  }

  // Correction 2: resolve price from brand billing country, fallback to request.cf
  const requestCountry = request.cf?.country || null;
  const priceData = await resolvePrice(db, plan, brand, requestCountry);

  const chargeAmount =
    billing_interval === "yearly"
      ? priceData.localized_yearly
      : priceData.localized_price;

  const checkoutId = crypto.randomUUID();
  const expiresAt  = new Date(Date.now() + CHECKOUT_TTL * 60 * 1000).toISOString();
  const apiUrl     = (env.BASE_URL || "https://api.mypilotpost.com").replace(/\/$/, "");

  // API handles the browser redirect from Yoco and forwards to the app with result params.
  // This avoids requiring React Router routes in the SPA.
  const successUrl = `${apiUrl}/api/checkout/success?checkout_id=${checkoutId}`;
  const cancelUrl  = `${apiUrl}/api/checkout/cancel?checkout_id=${checkoutId}`;

  // Insert record now so the ID is available for Yoco metadata + idempotency key
  await db.prepare(`
    INSERT INTO checkouts
      (id, brand_id, user_id, plan_id, billing_interval, provider,
       currency, canonical_price, localized_price, fx_rate, country,
       status, redirect_url, cancel_url, expires_at)
    VALUES (?,?,?,?,?,'yoco',?,?,?,?,?,'created',?,?,?)
  `).bind(
    checkoutId, brand_id, auth.user_id, plan_id, billing_interval,
    priceData.currency, priceData.canonical_price, chargeAmount,
    priceData.fx_rate ?? 1.0, priceData.pricing_region,
    successUrl, cancelUrl, expiresAt
  ).run();

  if (!env.YOCO_API_KEY) {
    await db.prepare(
      "UPDATE checkouts SET status='failed', completed_at=datetime('now') WHERE id=?"
    ).bind(checkoutId).run();
    return error("Payment provider not configured", "PROVIDER_ERROR", null, 500);
  }

  // Call Yoco to create the hosted checkout session
  let yocoData;
  try {
    const resp = await fetch(YOCO_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.YOCO_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": checkoutId,
      },
      body: JSON.stringify({
        amount: chargeAmount,
        currency: priceData.currency,
        successUrl,
        cancelUrl,
        metadata: { checkout_id: checkoutId, brand_id, plan_id },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error("[CHECKOUT] Yoco error", resp.status, errText);
      await db.prepare(
        "UPDATE checkouts SET status='failed', completed_at=datetime('now') WHERE id=?"
      ).bind(checkoutId).run();
      return error("Payment provider error", "PROVIDER_ERROR", { detail: errText }, 502);
    }

    yocoData = await resp.json();
  } catch (err) {
    console.error("[CHECKOUT] Yoco unreachable", err);
    await db.prepare(
      "UPDATE checkouts SET status='failed', completed_at=datetime('now') WHERE id=?"
    ).bind(checkoutId).run();
    return error("Payment provider unreachable", "PROVIDER_UNAVAILABLE", null, 503);
  }

  // Advance to pending, store provider session ID + raw metadata
  await db.prepare(`
    UPDATE checkouts
    SET status = 'pending',
        provider_session_id = ?,
        provider_metadata   = ?
    WHERE id = ?
  `).bind(
    yocoData.id || null,
    JSON.stringify(yocoData),
    checkoutId
  ).run();

  return json({
    checkout_id:  checkoutId,
    redirect_url: yocoData.redirectUrl,
    expires_at:   expiresAt,
  }, 201);
}

// ─── Get Checkout ─────────────────────────────────────────────────────────────

export async function getCheckout(request, env, auth, checkoutId) {
  const db = getDB(env);

  const checkout = await db.prepare(`
    SELECT c.id, c.plan_id, c.billing_interval, c.currency,
           c.canonical_price, c.localized_price, c.status,
           c.created_at, c.expires_at, c.completed_at,
           c.country AS pricing_region, c.brand_id
    FROM checkouts c
    WHERE c.id = ?
      AND c.brand_id IN (
        SELECT id FROM brands WHERE owner_user_id = ?
      )
  `).bind(checkoutId, auth.user_id).first();

  if (!checkout) return error("Checkout not found", "NOT_FOUND", null, 404);
  return json({ checkout });
}

// ─── Cancel Checkout ──────────────────────────────────────────────────────────

export async function cancelCheckout(request, env, auth, checkoutId) {
  const db = getDB(env);

  const checkout = await db.prepare(
    "SELECT id, status, brand_id FROM checkouts WHERE id = ?"
  ).bind(checkoutId).first();
  if (!checkout) return error("Checkout not found", "NOT_FOUND", null, 404);

  const brand = await db.prepare(
    "SELECT id FROM brands WHERE id = ? AND owner_user_id = ?"
  ).bind(checkout.brand_id, auth.user_id).first();
  if (!brand) return error("Access denied", "FORBIDDEN", null, 403);

  if (["paid", "failed", "cancelled", "expired"].includes(checkout.status)) {
    return error(
      `Checkout already in terminal status: ${checkout.status}`,
      "CONFLICT",
      { status: checkout.status },
      409
    );
  }

  await db.prepare(
    "UPDATE checkouts SET status='cancelled', completed_at=datetime('now') WHERE id=?"
  ).bind(checkoutId).run();

  return json({ success: true });
}

// ─── Success Redirect Target ──────────────────────────────────────────────────
// Correction 3: never trust URL params — always read from DB and verify.
//
// Browser redirect from Yoco (Accept: text/html) → 302 to app with result params.
// Frontend poll (Accept: application/json) → JSON status.

export async function checkoutSuccess(request, env) {
  const db  = getDB(env);
  const url = new URL(request.url);
  const checkoutId = url.searchParams.get("checkout_id");
  const appUrl = (env.APP_BASE_URL || "https://app.mypilotpost.com").replace(/\/$/, "");

  if (!checkoutId) {
    return isBrowserRequest(request)
      ? Response.redirect(`${appUrl}/?checkout_result=error`, 302)
      : json({ status: "error", message: "checkout_id required" }, 400);
  }

  // Fetch from DB — do NOT trust any other URL state
  const checkout = await db.prepare(`
    SELECT c.id, c.status, c.plan_id, c.brand_id, c.provider,
           b.owner_user_id
    FROM checkouts c
    JOIN brands b ON b.id = c.brand_id
    WHERE c.id = ?
  `).bind(checkoutId).first();

  if (!checkout) {
    return isBrowserRequest(request)
      ? Response.redirect(`${appUrl}/?checkout_result=not_found`, 302)
      : json({ status: "not_found" }, 404);
  }

  if (checkout.provider !== "yoco") {
    return isBrowserRequest(request)
      ? Response.redirect(`${appUrl}/?checkout_result=error`, 302)
      : json({ status: "error", message: "Unknown provider" }, 400);
  }

  if (isBrowserRequest(request)) {
    // Webhook may have already fired and set status=paid, or it's still pending.
    // Frontend will poll GET /api/customer/checkouts/:id to confirm.
    const params = new URLSearchParams({
      checkout_result: checkout.status === "paid" ? "success" : "pending",
      checkout_id:     checkoutId,
      plan_id:         checkout.plan_id,
    });
    return Response.redirect(`${appUrl}/?${params}`, 302);
  }

  return json({
    status:   checkout.status,
    plan_id:  checkout.plan_id,
    brand_id: checkout.brand_id,
    verified: true,
  });
}

// ─── Cancel Redirect Target ───────────────────────────────────────────────────

export async function checkoutCancel(request, env) {
  const db  = getDB(env);
  const url = new URL(request.url);
  const checkoutId = url.searchParams.get("checkout_id");
  const appUrl = (env.APP_BASE_URL || "https://app.mypilotpost.com").replace(/\/$/, "");

  if (!checkoutId) {
    return isBrowserRequest(request)
      ? Response.redirect(`${appUrl}/?checkout_result=cancelled`, 302)
      : json({ status: "error", message: "checkout_id required" }, 400);
  }

  const checkout = await db.prepare(
    "SELECT id, status FROM checkouts WHERE id = ?"
  ).bind(checkoutId).first();

  if (!checkout) {
    return isBrowserRequest(request)
      ? Response.redirect(`${appUrl}/?checkout_result=not_found`, 302)
      : json({ status: "not_found" }, 404);
  }

  if (["created", "pending"].includes(checkout.status)) {
    await db.prepare(
      "UPDATE checkouts SET status='cancelled', completed_at=datetime('now') WHERE id=?"
    ).bind(checkoutId).run();
  }

  if (isBrowserRequest(request)) {
    return Response.redirect(`${appUrl}/?checkout_result=cancelled`, 302);
  }

  return json({ status: "cancelled" });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isBrowserRequest(request) {
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html");
}
