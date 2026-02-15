// packages/api/src/core/billing/yoco-webhook.js

import { applyBillingEvent } from "./subscription-engine.js";

/**
 * Yoco Webhook Handler
 * --------------------
 * Responsibilities (Milestone 8):
 * 1. Verify webhook signature (Yoco spec)
 * 2. Prevent replay attacks
 * 3. Parse payment event
 * 4. Extract brand_id from metadata
 * 5. Insert payment (idempotent)
 * 6. Create billing_event (audit trail)
 * 7. Trigger subscription state machine
 * 8. Always return 200 OK to Yoco
 *
 * IMPORTANT:
 * - No admin auth
 * - No customer auth
 * - No hard enforcement
 * - Provider-agnostic core logic
 */

export async function handleYocoWebhook(request, env) {
  /* =====================================================
     1️⃣ READ RAW BODY (REQUIRED FOR SIGNATURE)
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
     2️⃣ REPLAY PROTECTION (3 MINUTES)
     ===================================================== */
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 180) {
    return new Response("Webhook timestamp expired", { status: 401 });
  }

  /* =====================================================
     3️⃣ SIGNATURE VERIFICATION (YOCO SPEC)
     ===================================================== */
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;

  const fullSecret = env.YOCO_WEBHOOK_SECRET;
  if (!fullSecret || !fullSecret.startsWith("whsec_")) {
    return new Response("Webhook secret misconfigured", { status: 500 });
  }

  const secretBase64 = fullSecret.split("_")[1];
  const secretBytes = Uint8Array.from(
    atob(secretBase64),
    (c) => c.charCodeAt(0)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent)
  );

  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  const providedSignature = signatureHeader.split(",")[1];
  if (!providedSignature) {
    return new Response("Invalid signature format", { status: 401 });
  }

  const expectedBytes = Uint8Array.from(
    atob(expectedSignature),
    (c) => c.charCodeAt(0)
  );
  const providedBytes = Uint8Array.from(
    atob(providedSignature),
    (c) => c.charCodeAt(0)
  );

  if (
    expectedBytes.length !== providedBytes.length ||
    !crypto.timingSafeEqual(expectedBytes, providedBytes)
  ) {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  /* =====================================================
     4️⃣ PARSE EVENT (SAFE AFTER VERIFICATION)
     ===================================================== */
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  /* =====================================================
     5️⃣ MAP YOCO EVENT → CANONICAL PAYMENT
     ===================================================== */
  const eventType = event.type;
  const data = event.data;

  // brand_id MUST be provided via metadata
  if (!data || !data.metadata || !data.metadata.brand_id) {
    // Cannot associate payment → ignore safely
    return new Response("OK", { status: 200 });
  }

  const brandId = data.metadata.brand_id;

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
    billingEventType = null; // refunds do not auto-change entitlement
  } else {
    // Unsupported / irrelevant event
    return new Response("OK", { status: 200 });
  }

  /* =====================================================
     6️⃣ INSERT PAYMENT (IDEMPOTENT FACT RECORD)
     ===================================================== */
  try {
    await env.DB.prepare(
      `
      INSERT INTO payments (
        id,
        customer_id,
        provider,
        provider_event_id,
        amount,
        currency,
        status,
        occurred_at,
        created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      `
    ).bind(
      crypto.randomUUID(),
      brandId,
      "yoco",
      event.id,
      data.amount,
      data.currency,
      paymentStatus,
      new Date(event.created * 1000).toISOString(),
      new Date().toISOString()
    ).run();
  } catch {
    // Duplicate payment (provider + provider_event_id)
    // Safe to ignore (idempotency)
  }

  /* =====================================================
     7️⃣ CREATE BILLING EVENT + APPLY STATE MACHINE
     ===================================================== */
  if (billingEventType) {
    await env.DB.prepare(
      `
      INSERT INTO billing_events (
        id,
        customer_id,
        event_type,
        amount,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
      `
    ).bind(
      crypto.randomUUID(),
      brandId,
      billingEventType,
      data.amount,
      new Date().toISOString()
    ).run();

    // Apply subscription state transition (rules-based)
    await applyBillingEvent(env, {
      customerId: brandId,
      eventType: billingEventType,
      amount: data.amount,
    });
  }

  /* =====================================================
     ✅ COMPLETE — ALWAYS ACKNOWLEDGE YOCO
     ===================================================== */
  return new Response("OK", { status: 200 });
}
