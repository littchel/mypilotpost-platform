const API_BASE = "http://127.0.0.1:8787";

async function test() {
  console.log("🚀 Starting Support DO Validation...");

  // 1. Authorize
  const authRes = await fetch(`${API_BASE}/api/v1/support/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ other_id: "test-admin" })
  }).then(r => r.json());

  if (!authRes.success) {
    console.error("❌ Auth failed:", authRes);
    process.exit(1);
  }
  console.log("✅ Auth Success. Ticket:", authRes.ticket);

  // 2. Test Message
  const msgRes = await fetch(`${API_BASE}/api/v1/support/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiver_id: "test-admin", message: "E2E Verify Message" })
  }).then(r => r.json());

  if (!msgRes.success) {
     console.error("❌ Message send failed:", msgRes);
     process.exit(1);
  }
  console.log("✅ Message Send Success.");

  // 3. Test History
  const historyRes = await fetch(`${API_BASE}/api/v1/support/history/test-admin`).then(r => r.json());
  if (historyRes.success && historyRes.data.length > 0) {
    console.log("✅ History Retrieval Success. Messages:", historyRes.data.length);
  } else {
    console.error("❌ History failed:", historyRes);
    process.exit(1);
  }

  console.log("\n✨ ALL CORE SUPPORT INFRASTRUCTURE VERIFIED.");
}

test();
