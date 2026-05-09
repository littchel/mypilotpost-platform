// packages/api/src/webhooks/yoco.js
import { json, error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { updateSubscription } from "../core/billing/billing.js";

/**
 * POST /api/webhooks/yoco
 * Authoritative production payment handler
 */
export async function handleYocoWebhook(request, env) {
  const db = getDB(env);
  
  // 1. SECURITY — HMAC Verification
  const signature = request.headers.get("X-Yoco-Signature");
  if (!signature) return error("Missing signature", 401);

  const bodyText = await request.text();
  const isValid = await verifyYocoSignature(bodyText, signature, env.YOCO_WEBHOOK_SECRET);
  if (!isValid) return error("Invalid signature", 401);

  const event = JSON.parse(bodyText);
  
  // 2. IDEMPOTENCY
  const existing = await db.prepare("SELECT 1 FROM processed_webhooks WHERE event_id = ?").bind(event.id).first();
  if (existing) return json({ ok: true, message: "Duplicate event suppressed" });

  // 3. VALIDATION
  const { type, payload } = event;
  if (type !== 'payment.successful') return json({ ok: true, message: "Ignored event type" });

  const userId = payload.metadata?.user_id;
  const planId = payload.metadata?.plan_id;
  if (!userId || !planId) return error("Missing metadata in payment", 400);

  // 4. ATOMIC ACTIVATION
  try {
    // Check amount matches plan (e.g. payload.amount is in cents)
    const plan = await db.prepare("SELECT price_monthly, price_yearly FROM plans WHERE id = ?").bind(planId).first();
    if (!plan) return error("Invalid plan in metadata", 400);

    // Allow slight variation or check strictly
    if (payload.amount !== plan.price_monthly && payload.amount !== plan.price_yearly) {
      console.warn(`[YOCO WEBHOOK] Amount mismatch: Received ${payload.amount}, Expected ${plan.price_monthly} or ${plan.price_yearly}`);
      // In production, we might still activate if it's close or log for manual review
    }

    await db.batch([
      // Mark as processed (Idempotency)
      db.prepare(`INSERT INTO processed_webhooks (event_id, source) VALUES (?, 'yoco')`).bind(event.id),
      // Update subscription
      db.prepare(`
        UPDATE subscriptions 
        SET plan_id = ?, status = 'active', updated_at = datetime('now'),
            current_period_start = datetime('now'),
            current_period_end = datetime('now', '+1 month')
        WHERE user_id = ?
      `).bind(planId, userId),
      // Log event
      db.prepare(`
        INSERT INTO subscription_events (id, user_id, old_plan_id, new_plan_id, event_type, metadata)
        VALUES (?, ?, ?, ?, 'renewal', ?)
      `).bind(crypto.randomUUID(), userId, null, planId, JSON.stringify(payload))
    ]);

    return json({ ok: true, activated: true });
  } catch (err) {
    console.error("[YOCO WEBHOOK FAILED]", err);
    return error("Internal webhook processing error", 500);
  }
}

/**
 * verifyYocoSignature(body, signature, secret)
 * Logic for HMAC-SHA256 signature verification
 */
async function verifyYocoSignature(body, signature, secret) {
  if (!secret) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', 
    encoder.encode(secret), 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['verify']
  );
  
  const signatureBytes = hexToBytes(signature);
  const data = encoder.encode(body);
  
  return await crypto.subtle.verify('HMAC', key, signatureBytes, data);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
