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

  if (!webhookId || !timestamp || !signatureHeader) {
    return new Response("Missing webhook headers", { status: 401 });
  }

  /* =====================================================
     2. REPLAY PROTECTION (±3 minutes)
     ===================================================== */
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 180) {
    return new Response("Webhook timestamp expired", { status: 401 });
  }

  /* =====================================================
     3. SIGNATURE VERIFICATION (constant-time via subtle.verify)
     ===================================================== */
  const fullSecret = env.YOCO_WEBHOOK_SECRET;
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
  const providedSig = signatureHeader.split(" ")
    .map(s => s.trim())
    .find(s => s.startsWith("v1,"))
    ?.slice(3);

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

  const brandId = data.metadata.brand_id;
  const planId = data.metadata.plan_id || null;

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
      INSERT INTO payments (id, brand_id, provider, provider_event_id, amount, currency, status, occurred_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      brandId,
      "yoco",
      event.id,
      data.amount,
      data.currency || "ZAR",
      paymentStatus,
      new Date((event.created || 0) * 1000).toISOString(),
      new Date().toISOString()
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
    });

    writeSystemEvent(env, {
      severity: billingEventType === 'payment_failed' ? 'warning' : 'info',
      source: 'billing',
      message: `${billingEventType.replace('_', ' ')} for brand ${brandId} — ${data.currency} ${(data.amount / 100).toFixed(2)}`,
      metadata: JSON.stringify({ brand_id: brandId, plan_id: planId, amount: data.amount, event_type: billingEventType })
    }).catch(() => {});
  }

  return new Response("OK", { status: 200 });
}
