const API_BASE = "http://localhost:8787";

async function setupTestUsers() {
  const users = [
    { email: "customer@test.com", password: "password123", role: "user" },
    { email: "admin@test.com", password: "password123", role: "super_admin" }
  ];

  const results = {};

  for (const user of users) {
    console.log(`Setting up ${user.email}...`);
    
    // Register
    const regRes = await fetch(`${API_BASE}/api/customer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    console.log(`Registration for ${user.email} status: ${regRes.status}`);
    if (!regRes.ok) console.log(`Registration error: ${await regRes.text()}`);

    // Login
    const loginRes = await fetch(`${API_BASE}/api/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password })
    });

    if (loginRes.ok) {
      const { token } = await loginRes.json();
      
      // Get Profile to get userId
      const profileRes = await fetch(`${API_BASE}/api/customer/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      const userId = profileData.user?.id;

      results[user.email] = { token, userId };
      console.log(`Logged in ${user.email}. UserID: ${userId}`);
    } else {
      console.error(`Failed to login ${user.email}: ${await loginRes.text()}`);
    }
  }

  // Promote admin
  if (results["admin@test.com"]) {
     console.log("Promoting admin@test.com in database...");
     // Note: This requires access to the sqlite file directly
     // We will use the 'sqlite3' command in the shell after this script
  }

  console.log("\nTEST TOKENS:");
  console.log(JSON.stringify(results, null, 2));
}

setupTestUsers();
