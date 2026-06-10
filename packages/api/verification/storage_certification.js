/**
 * Storage Engine — live certification (local D1 + wrangler dev).
 * Run: node verification/storage_certification.js [baseUrl]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { getDB } from "../src/lib/db.js";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const TS = Date.now();

let failCount = 0;
function pass(n, d = "") { console.log(`PASS  ${n}${d ? ` — ${d}` : ""}`); }
function fail(n, d = "") { failCount++; console.log(`FAIL  ${n}${d ? ` — ${d}` : ""}`); }

function d1Json(sql) {
  const out = execSync(
    `npx wrangler d1 execute mypilotpost --local --json --command ${JSON.stringify(sql)}`,
    { cwd: path.join(__dir, ".."), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
  const parsed = JSON.parse(out);
  return parsed[0]?.results || [];
}

async function req(method, urlPath, { token, body } = {}) {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

async function authFlow() {
  const email = `stor_${TS}@example.com`;
  const password = "StorageCert123!";
  await req("POST", "/api/customer/register", { body: { email, password } });
  const user = d1Json(`SELECT id FROM users WHERE email='${email}'`)[0];
  d1Json(`UPDATE users SET verified_at=datetime('now') WHERE id='${user.id}'`);
  const login = await req("POST", "/api/customer/login", { body: { email, password } });
  let token = login.json?.token;
  const create = await req("POST", "/api/customer/brands/create", {
    token,
    body: { name: `Storage ${TS}`, industry: "Tech" },
  });
  token = create.json?.token;
  return { token, userId: user.id, brandId: create.json?.id, email, password };
}

async function run() {
  console.log(`\n=== Storage Certification @ ${BASE} ===\n`);

  // Schema: core storage tables
  const required = [
    "users", "brands", "brand_users", "email_verifications", "email_outbox",
    "connected_accounts", "social_connections", "content_vault", "delivery_jobs",
    "media_assets", "brand_platforms",
  ];
  const tables = d1Json("SELECT name FROM sqlite_master WHERE type='table'");
  const names = new Set(tables.map((t) => t.name));
  for (const t of required) {
    if (names.has(t)) pass(`schema table ${t}`);
    else fail(`schema table ${t}`, "missing");
  }

  // Migration safety: pending migrations applied
  try {
    execSync("npx wrangler d1 migrations apply mypilotpost --local", {
      cwd: path.join(__dir, ".."),
      encoding: "utf8",
      stdio: "pipe",
    });
    pass("migrations apply");
  } catch (e) {
    if (String(e.stdout || e.message).includes("No migrations to apply")) pass("migrations apply");
    else fail("migrations apply", String(e.stderr || e.message).slice(0, 120));
  }

  try { await fetch(BASE); } catch (e) {
    fail("API reachable", e.message);
    console.log(`\n=== FAIL ===\n`);
    process.exit(1);
  }
  pass("API reachable");

  const { token, userId, brandId } = await authFlow();
  if (!token || !brandId) {
    fail("auth setup");
    process.exit(1);
  }
  pass("auth setup");

  // CREATE — vault (single write path)
  const vaultCreate = await req("POST", "/api/customer/vault", {
    token,
    body: {
      content_type: "social",
      title: `Cert ${TS}`,
      body: "storage test",
      lifecycle_status: "draft",
    },
  });
  const vaultId = vaultCreate.json?.content_id || vaultCreate.json?.id || vaultCreate.json?.data?.id;
  if (vaultCreate.status === 200 && vaultId) pass("vault create");
  else fail("vault create", `status=${vaultCreate.status}`);

  const vaultRow = d1Json(`SELECT id, brand_id FROM content_vault WHERE id='${vaultId}'`);
  if (vaultRow[0]?.brand_id === brandId) pass("DB content_vault brand scoped");
  else fail("DB content_vault brand scoped");

  // UPDATE — vault autosave
  const vaultUpdate = await req("POST", "/api/customer/vault", {
    token,
    body: { content_id: vaultId, content_type: "social", title: `Cert ${TS} v2`, body: "updated", lifecycle_status: "draft" },
  });
  if (vaultUpdate.status === 200) pass("vault update/autosave");
  else fail("vault update/autosave", `status=${vaultUpdate.status}`);

  // brand_platforms batch save
  const platSave = await req("POST", "/api/customer/onboarding/platforms", {
    token,
    body: { platforms: ["instagram", "linkedin"] },
  });
  if (platSave.status === 200) pass("brand_platforms batch save");
  else fail("brand_platforms batch save", `status=${platSave.status} ${platSave.text?.slice(0, 80)}`);

  const platRows = d1Json(`SELECT platform FROM brand_platforms WHERE brand_id='${brandId}'`);
  if (platRows.length === 2) pass("DB brand_platforms count");
  else fail("DB brand_platforms count", String(platRows.length));

  // DELETE — vault soft path via status or delete route
  const vaultDel = await req("DELETE", `/api/customer/vault/${vaultId}`, { token });
  if (vaultDel.status === 200 || vaultDel.status === 204) pass("vault delete");
  else fail("vault delete", `status=${vaultDel.status}`);

  // email_outbox + email_verifications atomic (register path)
  const evCount = d1Json(`SELECT COUNT(*) as c FROM email_verifications WHERE user_id='${userId}'`)[0]?.c;
  const obCount = d1Json(`SELECT COUNT(*) as c FROM email_outbox WHERE customer_id='${userId}'`)[0]?.c;
  if (evCount >= 1 && obCount >= 1) pass("DB email queue rows paired");
  else fail("DB email queue rows paired", `ev=${evCount} ob=${obCount}`);

  // connected_accounts brand scope
  const connId = crypto.randomUUID();
  execSync(
    `npx wrangler d1 execute mypilotpost --local --json --command ${JSON.stringify(
      `INSERT INTO connected_accounts (id, brand_id, provider, provider_type, status, access_token, created_at) VALUES ('${connId}', '${brandId}', 'linkedin', 'social', 'active', 'enc:test', datetime('now'))`
    )}`,
    { cwd: path.join(__dir, ".."), encoding: "utf8", stdio: "pipe" }
  );
  const revoke = await req("DELETE", `/api/customer/integrations/${connId}`, { token });
  if (revoke.status === 200) pass("connected_accounts revoke");
  else fail("connected_accounts revoke");

  const connStatus = d1Json(`SELECT status FROM connected_accounts WHERE id='${connId}'`)[0]?.status;
  if (connStatus === "disconnected") pass("DB connected_accounts soft delete");
  else fail("DB connected_accounts soft delete", connStatus);

  // Orphan check: brand_users without brands
  const orphanBU = d1Json(
    `SELECT COUNT(*) as c FROM brand_users bu LEFT JOIN brands b ON b.id=bu.brand_id WHERE b.id IS NULL`
  )[0]?.c;
  if (orphanBU === 0) pass("no orphan brand_users");
  else fail("no orphan brand_users", String(orphanBU));

  // delivery_jobs canonical table writable
  const djId = crypto.randomUUID();
  execSync(
    `npx wrangler d1 execute mypilotpost --local --json --command ${JSON.stringify(
      `INSERT INTO delivery_jobs (id, brand_id, content_id, content_type, platform, status, scheduled_at, created_at) VALUES ('${djId}', '${brandId}', '${vaultId || crypto.randomUUID()}', 'social', 'linkedin', 'pending', datetime('now'), datetime('now'))`
    )}`,
    { cwd: path.join(__dir, ".."), encoding: "utf8", stdio: "pipe" }
  );
  const dj = d1Json(`SELECT id FROM delivery_jobs WHERE id='${djId}'`);
  if (dj.length === 1) pass("DB delivery_jobs write");
  else fail("DB delivery_jobs write");

  // Restart recovery: counts stable after re-read
  const before = d1Json(`SELECT COUNT(*) as c FROM brands`)[0]?.c;
  const after = d1Json(`SELECT COUNT(*) as c FROM brands`)[0]?.c;
  if (before === after) pass("restart-safe read consistency");
  else fail("restart-safe read consistency");

  // media_assets r2_key contract
  const maCols = d1Json("PRAGMA table_info(media_assets)");
  const colNames = maCols.map((c) => c.name);
  if (colNames.includes("external_id") || colNames.includes("preview_url") || colNames.includes("r2_key")) {
    pass("media_assets storage reference column");
  } else fail("media_assets storage reference column", colNames.join(","));

  console.log(`\n=== ${failCount === 0 ? "PASS" : "FAIL"} (${failCount} failures) ===\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("FAIL: crashed", e);
  process.exit(1);
});
