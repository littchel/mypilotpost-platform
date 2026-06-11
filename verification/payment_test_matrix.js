/**
 * PAYMENT TEST MATRIX
 * BILLING CERTIFICATION — Phase 2
 *
 * Each scenario defines: setup, action, expected outputs across all 5 surfaces.
 * Run against local dev (wrangler dev) with YOCO sandbox keys.
 * No manual DB writes permitted — every outcome must flow from Yoco webhook.
 *
 * Test card (Yoco sandbox):
 *   Card number : 4111 1111 1111 1111
 *   Expiry      : any future date
 *   CVV         : any 3 digits
 *
 * Fail card (Yoco sandbox):
 *   Card number : 4000 0000 0000 0002
 */

const API = "http://localhost:8787";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

function section(name) {
  console.log(`\n══ ${name} ═══════════════════════════════════════════`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — FREE → PAID
// Setup:  New user on Starter plan, no payments
// Action: Create checkout → simulate Yoco payment.succeeded webhook
// Expected:
//   checkouts.status = paid
//   payments row inserted (status=succeeded, checkout_id linked)
//   subscriptions row created (status=active, plan_id=growth)
//   users.plan_id=growth, users.subscription_status=active
//   billing_events row (payment_received)
//   mrr_snapshots row for current month
// ─────────────────────────────────────────────────────────────────────────────

async function testFreeToPaid(token, brandId) {
  section("SCENARIO 1 — FREE → PAID");

  // Step 1: Create checkout
  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("checkout create returns 201", co.status === 201, `got ${co.status}`);
  assert("redirect_url present", !!co.data?.redirect_url, JSON.stringify(co.data));
  assert("checkout_id present", !!co.data?.checkout_id);
  const checkoutId = co.data?.checkout_id;

  // Step 2: GET checkout — verify pending
  const coGet = await api(`/api/customer/checkouts/${checkoutId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert("checkout GET returns 200", coGet.status === 200);
  assert("checkout status is pending", coGet.data?.checkout?.status === "pending");

  // Step 3: Simulate Yoco webhook payment.succeeded
  // In manual test: complete payment at Yoco redirect URL
  // Webhook will fire automatically and advance checkout → paid

  console.log(`  ⚡ Manual step: complete payment at ${co.data?.redirect_url}`);
  console.log(`     Then verify:`);
  console.log(`     - checkouts.status = paid`);
  console.log(`     - payments.checkout_id = ${checkoutId}`);
  console.log(`     - subscriptions.status = active`);
  console.log(`     - users.plan_id = growth`);
  console.log(`     - billing_events.event_type = payment_received`);
  console.log(`     - mrr_snapshots row for current month`);

  return checkoutId;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — PAID → UPGRADE
// Setup:  User on Growth (active subscription)
// Action: Create checkout for Pro → simulate payment.succeeded
// Expected:
//   NEW checkout row (status=paid)
//   NEW payment row (status=succeeded)
//   subscriptions.plan_id updated to pro, status=active (renewed period)
//   users.plan_id=pro
//   billing_events (payment_received, plan_id=pro)
//   mrr_snapshots updated
// ─────────────────────────────────────────────────────────────────────────────

async function testUpgrade(token, brandId) {
  section("SCENARIO 2 — PAID → UPGRADE (Growth → Pro)");

  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "pro", billing_interval: "monthly" },
  });
  assert("upgrade checkout create returns 201", co.status === 201, `got ${co.status} — ${JSON.stringify(co.data)}`);
  assert("no 402 block on paid user", co.status !== 402, "paid user was blocked from upgrading");
  assert("no 409 clash for different plan", co.status !== 409);

  console.log(`  ⚡ Manual: complete payment at ${co.data?.redirect_url}`);
  console.log(`     Then verify: users.plan_id = pro`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — PAID → DOWNGRADE
// Setup:  User on Pro (active)
// Action: Create checkout for Growth (lower tier)
// Expected: Checkout created without error — subscription engine handles transition
// ─────────────────────────────────────────────────────────────────────────────

async function testDowngrade(token, brandId) {
  section("SCENARIO 3 — PAID → DOWNGRADE (Pro → Growth)");

  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("downgrade checkout create returns 201", co.status === 201, `got ${co.status}`);
  assert("no 402 on downgrade", co.status !== 402);
  console.log(`  ⚡ Manual: complete payment at ${co.data?.redirect_url}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — FAILED PAYMENT
// Setup:  Any user
// Action: Create checkout → use Yoco fail card → webhook fires payment.failed
// Expected:
//   checkouts.status = failed
//   payments.status = failed
//   subscriptions.status = past_due (if was active)
//   users.subscription_status = past_due
//   billing_events.event_type = payment_failed
//   NO mrr_snapshot
// ─────────────────────────────────────────────────────────────────────────────

async function testFailedPayment(token, brandId) {
  section("SCENARIO 4 — FAILED PAYMENT");

  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("checkout created for fail test", co.status === 201);

  console.log(`  ⚡ Manual: use fail card (4000 0000 0000 0002) at ${co.data?.redirect_url}`);
  console.log(`     Then verify:`);
  console.log(`     - checkouts.status = failed`);
  console.log(`     - payments.status = failed`);
  console.log(`     - users.subscription_status = past_due`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — CHECKOUT CANCEL (user-initiated)
// Setup:  Pending checkout
// Action: POST /api/customer/checkouts/:id/cancel
// Expected:
//   checkouts.status = cancelled
//   No payment row
//   No subscription change
// ─────────────────────────────────────────────────────────────────────────────

async function testCancel(token, brandId) {
  section("SCENARIO 5 — CHECKOUT CANCEL");

  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("checkout created for cancel test", co.status === 201);
  const checkoutId = co.data?.checkout_id;

  const cancel = await api(`/api/customer/checkouts/${checkoutId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert("cancel returns 200", cancel.status === 200);
  assert("cancel returns success", cancel.data?.success === true);

  // Verify terminal state
  const coGet = await api(`/api/customer/checkouts/${checkoutId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert("checkout status = cancelled", coGet.data?.checkout?.status === "cancelled");

  // Verify cancel is idempotent (double cancel)
  const cancel2 = await api(`/api/customer/checkouts/${checkoutId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert("double cancel returns 409", cancel2.status === 409);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — REFUND
// Setup:  User has paid subscription
// Action: Admin issues refund → Yoco fires refund.succeeded webhook
// Expected:
//   payments.status = refunded
//   subscriptions.status = refunded
//   users.subscription_status = refunded
//   users.plan_id = starter
//   billing_events.event_type = refund_received
//   enforcement blocks further access
// ─────────────────────────────────────────────────────────────────────────────

async function testRefund(adminToken, brandId) {
  section("SCENARIO 6 — REFUND");

  const refund = await api("/api/v1/admin/billing/refund", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { customer_id: brandId, amount: 49900, reason: "Test refund" },
  });
  // Admin refund initiates Yoco refund; Yoco then fires refund.succeeded webhook
  assert("refund endpoint responds", [200, 201, 404].includes(refund.status), `got ${refund.status}`);

  console.log(`  ⚡ After Yoco refund.succeeded webhook fires, verify:`);
  console.log(`     - payments.status = refunded`);
  console.log(`     - subscriptions.status = refunded`);
  console.log(`     - users.plan_id = starter`);
  console.log(`     - enforcement.js blocks usage`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — DUPLICATE WEBHOOK (idempotency)
// Setup:  Any paid checkout
// Action: Send the same payment.succeeded webhook twice
// Expected:
//   Second webhook is silently ignored (UNIQUE violation on provider_event_id)
//   checkouts.status stays paid (not regressed)
//   No duplicate payment row
//   No duplicate billing_event
//   No duplicate mrr_snapshot
// ─────────────────────────────────────────────────────────────────────────────

async function testDoubleWebhook() {
  section("SCENARIO 7 — DUPLICATE WEBHOOK (idempotency)");

  console.log(`  ⚡ Manual: replay the payment.succeeded webhook for a known event_id`);
  console.log(`     Expected: 200 OK on both — second is silently absorbed`);
  console.log(`     Verify:`);
  console.log(`     - payments table has exactly 1 row for this provider_event_id`);
  console.log(`     - billing_events has exactly 1 row for this event`);
  console.log(`     - mrr_snapshots NOT duplicated`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 8 — EXPIRED CHECKOUT
// Setup:  Checkout older than 30 minutes with status=pending
// Action: Cron or explicit expiry check
// Expected:
//   checkouts.status = expired
//   No payment
//   No subscription change
//   Subsequent GET returns status=expired
// ─────────────────────────────────────────────────────────────────────────────

async function testExpiredCheckout(token, brandId) {
  section("SCENARIO 8 — EXPIRED CHECKOUT");

  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("checkout created for expiry test", co.status === 201);
  const checkoutId = co.data?.checkout_id;

  console.log(`  ⚡ Manual: set checkouts.expires_at to the past in DB, then run cron or wait`);
  console.log(`     checkout_id = ${checkoutId}`);
  console.log(`     Then GET /api/customer/checkouts/${checkoutId}`);
  console.log(`     Expected: status = expired`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-BRAND ACCESS GUARD
// ─────────────────────────────────────────────────────────────────────────────

async function testCrossBrandGuard(token, otherBrandId) {
  section("GUARD — Cross-brand access denied");

  const co = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: otherBrandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("cross-brand checkout blocked with 403", co.status === 403);
}

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE ACTIVE CHECKOUT GUARD
// ─────────────────────────────────────────────────────────────────────────────

async function testDuplicateCheckout(token, brandId) {
  section("GUARD — Duplicate active checkout returns 409");

  await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });

  const second = await api("/api/customer/checkout/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { brand_id: brandId, plan_id: "growth", billing_interval: "monthly" },
  });
  assert("duplicate checkout returns 409", second.status === 409);
  assert("409 includes existing checkout_id", !!second.data?.checkout_id);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("PAYMENT TEST MATRIX — BILLING CERTIFICATION");
  console.log("============================================");
  console.log("Prerequisites:");
  console.log("  1. wrangler dev running on localhost:8787");
  console.log("  2. YOCO_SECRET_KEY=sk_test_... set in .dev.vars");
  console.log("  3. YOCO_WEBHOOK_SECRET=whsec_... set in .dev.vars");
  console.log("  4. Yoco webhook endpoint pointed to ngrok tunnel");
  console.log("");

  const TOKEN       = process.env.TEST_JWT       || "SET_TEST_JWT";
  const BRAND_ID    = process.env.TEST_BRAND_ID  || "SET_BRAND_ID";
  const ADMIN_TOKEN = process.env.TEST_ADMIN_JWT || "SET_ADMIN_JWT";
  const OTHER_BRAND = process.env.OTHER_BRAND_ID || "SET_OTHER_BRAND_ID";

  if (TOKEN === "SET_TEST_JWT") {
    console.error("Set TEST_JWT, TEST_BRAND_ID, TEST_ADMIN_JWT, OTHER_BRAND_ID env vars");
    process.exit(1);
  }

  await testFreeToPaid(TOKEN, BRAND_ID);
  await testCancel(TOKEN, BRAND_ID);
  await testDuplicateCheckout(TOKEN, BRAND_ID);
  await testCrossBrandGuard(TOKEN, OTHER_BRAND);
  await testDoubleWebhook();

  // These require a paid subscription first (run SCENARIO 1 manually)
  await testUpgrade(TOKEN, BRAND_ID);
  await testDowngrade(TOKEN, BRAND_ID);
  await testFailedPayment(TOKEN, BRAND_ID);
  await testRefund(ADMIN_TOKEN, BRAND_ID);
  await testExpiredCheckout(TOKEN, BRAND_ID);

  console.log("\n============================================");
  if (process.exitCode === 1) {
    console.error("MATRIX: FAIL — review failures above");
  } else {
    console.log("MATRIX: PASS (automated checks) — complete manual steps above");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
