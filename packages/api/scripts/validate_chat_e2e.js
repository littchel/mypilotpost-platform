const API_BASE = "http://127.0.0.1:8787/api/v1";

// Support ID as defined in FloatingChat.jsx
const SUPPORT_ID = "0f1bfe50-06d2-458d-bd54-ac4d47fa9e5e";

async function testDurableChat() {
  console.log("Starting Durable Object Chat Validation...");

  // 1. Get tokens
  const adminToken = await login("admin@test.com");
  const customer1Token = await login("customer@test.com");
  const customer2Token = await login("customer2@test.com"); // Assuming this exists or will fail if not

  // 2. Authorize streams for Customer 1 and Admin (for Customer 1)
  const c1Ticket = await authorize(customer1Token, SUPPORT_ID);
  const a1Ticket = await authorize(adminToken, "9218839f-d9d2-4f4b-b38b-14abe9258bcc"); // Customer 1 ID

  console.log("SSE Tickets acquired.");

  // 3. Connect to Customer 1 stream
  // We'll use fetch to simulate the stream connection and check the first message
  const c1StreamPromise = fetch(`${API_BASE}/support/stream?ticket=${c1Ticket.ticket}`);
  
  // 4. Admin sends message to Customer 1
  console.log("Admin sending message to Customer 1...");
  const msgRes = await fetch(`${API_BASE}/support/message`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      receiver_id: "9218839f-d9d2-4f4b-b38b-14abe9258bcc",
      message: "DO Verification: Instant Sync!"
    })
  });

  const streamRes = await c1StreamPromise;
  const reader = streamRes.body.getReader();
  
  let found = false;
  const timeout = setTimeout(() => {
    console.log("❌ Timeout waiting for SSE message");
    process.exit(1);
  }, 5000);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = new TextDecoder().decode(value);
    console.log(`[CLIENT RECEIVED] ${text}`);
    if (text.includes("Instant Sync!")) {
      found = true;
      break;
    }
  }

  clearTimeout(timeout);
  if (found) {
    console.log("✅ SUCCESS: Real-time message received via Durable Object!");
    process.exit(0);
  } else {
    console.log("❌ FAILED: Message not found in stream");
    process.exit(1);
  }
}

async function login(email) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" })
  });
  const data = await res.json();
  return data.token;
}

async function authorize(token, otherId) {
  const res = await fetch(`${API_BASE}/support/authorize`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ other_id: otherId })
  });
  return res.json();
}

testDurableChat();
