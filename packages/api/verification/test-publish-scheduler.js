import { execSync } from "child_process";
import { encrypt } from "../src/lib/crypto.js";

const API_BASE = "http://localhost:8787";
const BRAND_ID = "b4c053d9-8dd9-4e9e-9c06-946ee45af99e"; // BidMyMove
const TEST_EMAIL = `test_scheduler_${Date.now()}@example.com`;
const TEST_PASSWORD = "Password123!";
const ENCRYPTION_SECRET = "dev-encryption-secret-placeholder-32-bytes-long";

function executeSQL(cmd) {
  const output = execSync(
    `npx wrangler d1 execute mypilotpost --local --command "${cmd.replace(/"/g, '\\"')}"`,
    { cwd: "/Users/littchel/Documents/Platforms/MyPilotPost/mypilotpost-platform/packages/api", encoding: "utf-8" }
  );
  return output;
}

async function runTest() {
  console.log("🚀 STARTING SCHEDULER & VAULT VERIFICATION TEST");
  console.log(`Test Email: ${TEST_EMAIL}`);

  try {
    // 1. Register a fresh user
    console.log("\n1. Registering new user...");
    const regRes = await fetch(`${API_BASE}/api/customer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    if (!regRes.ok) throw new Error(`Registration failed: ${await regRes.text()}`);
    const regData = await regRes.json();
    const userToken = regData.token;
    console.log("User registered successfully. Token acquired.");

    // Query to find user's ID
    const usersJsonStr = executeSQL(`SELECT id FROM users WHERE email = '${TEST_EMAIL}';`);
    const match = usersJsonStr.match(/"id":\s*"([^"]+)"/);
    if (!match) throw new Error("Could not find registered user in local D1");
    const userId = match[1];
    console.log(`Registered User ID: ${userId}`);

    // Mark user as verified to bypass email verification check
    executeSQL(`UPDATE users SET verified_at = CURRENT_TIMESTAMP, is_active = 1 WHERE id = '${userId}';`);
    console.log("User marked as verified.");

    // 2. Link user to BidMyMove brand as owner in brand_users
    console.log("\n2. Linking user to BidMyMove brand...");
    executeSQL(`INSERT INTO brand_users (user_id, brand_id, role, created_at) VALUES ('${userId}', '${BRAND_ID}', 'owner', CURRENT_TIMESTAMP);`);
    console.log("Linked successfully.");

    // 3. Insert mock connections for all 5 connected platforms
    console.log("\n3. Inserting mock social connections for BidMyMove brand...");
    const platforms = ["facebook", "linkedin", "x", "pinterest"];
    const encryptedToken = await encrypt("mock-access-token-123456", ENCRYPTION_SECRET);

    // Clean up existing connections for this brand to avoid duplication issues
    executeSQL(`DELETE FROM social_connections WHERE brand_id = '${BRAND_ID}';`);
    // Clean up existing delivery jobs to avoid conflict errors
    executeSQL(`DELETE FROM delivery_jobs WHERE brand_id = '${BRAND_ID}';`);

    for (const platform of platforms) {
      const connId = crypto.randomUUID();
      const sql = `INSERT INTO social_connections (id, user_id, brand_id, platform, account_id, platform_username, access_token, status, created_at, updated_at) VALUES ('${connId}', '${userId}', '${BRAND_ID}', '${platform}', '${platform}-act-123', 'bidmymove_${platform}', '${encryptedToken}', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
      executeSQL(sql);
      console.log(`Created connection for ${platform}.`);
    }

    // Delay to let the local wrangler dev server settle after D1 writes
    console.log("Waiting 2 seconds for wrangler dev server to settle...");
    await new Promise(r => setTimeout(r, 2000));

    // 4. Switch to BidMyMove brand to get brand-specific token
    console.log("\n4. Switching to BidMyMove brand...");
    const switchRes = await fetch(`${API_BASE}/api/customer/brands/switch`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ brand_id: BRAND_ID })
    });
    if (!switchRes.ok) throw new Error(`Brand switch failed: ${await switchRes.text()}`);
    const switchData = await switchRes.json();
    const brandToken = switchData.token;
    console.log("Brand token acquired successfully.");

    const brandHeaders = {
      "Authorization": `Bearer ${brandToken}`,
      "Content-Type": "application/json"
    };

    // 5. Create a draft post in the Content Vault
    console.log("\n5. Saving test post to Content Vault...");
    const vaultRes = await fetch(`${API_BASE}/api/customer/vault`, {
      method: "POST",
      headers: brandHeaders,
      body: JSON.stringify({
        content_type: "social",
        title: "Test BidMyMove Post",
        body: "This is a test post for BidMyMove brand to verify scheduling works across all connected platforms!",
        platforms,
        lifecycle_status: "draft"
      })
    });
    if (!vaultRes.ok) throw new Error(`Vault save failed: ${await vaultRes.text()}`);
    const vaultData = await vaultRes.json();
    const contentId = vaultData.content_id;
    console.log(`Post saved to Vault. Content ID: ${contentId}`);

    // Verify overlays/metadata mirror writes if any
    const vaultItemJson = executeSQL(`SELECT * FROM content_vault WHERE id = '${contentId}';`);
    console.log("Vault Item details:", vaultItemJson);

    // 6. Schedule post using vaultSchedule endpoint (inserts to delivery_jobs)
    console.log("\n6. Scheduling post across connected platforms...");
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes in the future
    const schedRes = await fetch(`${API_BASE}/api/customer/vault/${contentId}/schedule`, {
      method: "POST",
      headers: brandHeaders,
      body: JSON.stringify({
        platforms,
        scheduled_at: futureDate
      })
    });
    if (!schedRes.ok) throw new Error(`Scheduling failed: ${await schedRes.text()}`);
    console.log("Post scheduled successfully.");

    // 7. Verify delivery_jobs were created and user_id is NOT NULL
    console.log("\n7. Verifying delivery_jobs for scheduled post...");
    const jobsJsonStr = executeSQL(`SELECT id, platform, user_id, status, scheduled_at FROM delivery_jobs WHERE content_id = '${contentId}';`);
    console.log("Created Delivery Jobs:\n", jobsJsonStr);

    if (jobsJsonStr.includes('"user_id":null') || jobsJsonStr.includes('"user_id": null')) {
      throw new Error("FAIL: user_id is NULL in delivery_jobs!");
    }
    console.log("✅ SUCCESS: user_id is populated in delivery_jobs!");

    // 8. Publish Now immediately on a FRESH post (so existing scheduled jobs don't block it)
    console.log("\n8. Creating a second post for immediate publication...");
    const vaultRes2 = await fetch(`${API_BASE}/api/customer/vault`, {
      method: "POST",
      headers: brandHeaders,
      body: JSON.stringify({
        content_type: "social",
        title: "Immediate Test Post",
        body: "This post will be published immediately to verify scheduler processing!",
        platforms,
        lifecycle_status: "draft"
      })
    });
    if (!vaultRes2.ok) throw new Error(`Vault save 2 failed: ${await vaultRes2.text()}`);
    const vaultData2 = await vaultRes2.json();
    const contentId2 = vaultData2.content_id;
    console.log(`Second Post saved. Content ID: ${contentId2}`);

    console.log("Publishing second post immediately (Publish Now)...");
    const pubNowRes = await fetch(`${API_BASE}/api/customer/vault/${contentId2}/publish-now`, {
      method: "POST",
      headers: brandHeaders,
      body: JSON.stringify({ platforms })
    });
    if (!pubNowRes.ok) throw new Error(`Publish Now failed: ${await pubNowRes.text()}`);
    console.log("Publish Now command executed.");

    // Force delivery jobs to be in the past to prevent clock drift issues
    console.log("Forcing delivery jobs to be in the past to prevent clock drift issues...");
    executeSQL(`UPDATE delivery_jobs SET scheduled_at = datetime('now', '-5 minutes') WHERE content_id = '${contentId2}';`);

    // Verify new immediate delivery_jobs
    const allJobsJsonStr = executeSQL(`SELECT id, platform, user_id, status, scheduled_at FROM delivery_jobs WHERE content_id = '${contentId2}';`);
    console.log("Immediate Delivery Jobs:\n", allJobsJsonStr);

    if (allJobsJsonStr.includes('"user_id":null') || allJobsJsonStr.includes('"user_id": null')) {
      throw new Error("FAIL: user_id is NULL in one of the immediate delivery_jobs!");
    }
    console.log("✅ SUCCESS: user_id is populated in all immediate delivery_jobs!");

    // 9. Run the scheduler worker manually to pick up immediate jobs
    console.log("\n9. Running Scheduler worker to process delivery jobs...");
    
    // We wait a tiny bit to make sure scheduled_at is <= now
    await new Promise(r => setTimeout(r, 1000));
    
    const cronRes = await fetch(`${API_BASE}/cdn-cgi/handler/scheduled`);
    console.log(`Scheduler trigger status: ${cronRes.status} ${cronRes.statusText}`);

    // Wait a brief moment for async execution
    await new Promise(r => setTimeout(r, 1500));

    // Verify jobs transitioned from 'scheduled'
    const processedJobsJson = executeSQL(`SELECT id, platform, status, last_error FROM delivery_jobs WHERE content_id = '${contentId2}';`);
    console.log("Processed Delivery Jobs:\n", processedJobsJson);

    // Verify status is not scheduled (since mock adapters are called and fail, status should become 'failed' or 'processing')
    if (processedJobsJson.includes('"status":"scheduled"')) {
      throw new Error("FAIL: Delivery jobs were not picked up by the scheduler!");
    }
    console.log("✅ SUCCESS: Scheduler picked up and processed the delivery jobs!");
    console.log("\n✅ ALL TESTS COMPLETED SUCCESSFULLY");

  } catch (err) {
    console.error("\n❌ TEST FAILURE:", err);
    process.exit(1);
  }
}

runTest();
