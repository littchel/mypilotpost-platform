import { issueJWT, verifyJWT } from "../auth/jwt.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { getDB } from "../lib/db.js";
import { getProvider } from "./registry.js";
import { getAdapter } from "./providers/index.js";

/**
 * Generate a signed, expiring OAuth state
 */
export async function generateState(brand_id, user_id, provider, env) {
  const db = getDB(env);
  const state_id = crypto.randomUUID();
  
  // Signed payload for cross-check
  const state_token = await issueJWT({
    state_id,
    brand_id,
    user_id,
    provider,
    purpose: "oauth_state"
  }, env, { expiresIn: 900 }); // 15 mins

  await db.prepare(`
    INSERT INTO oauth_states (
      state, 
      brand_id, 
      user_id, 
      provider, 
      redirect_uri, 
      expires_at, 
      state_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    state_id,
    brand_id,
    user_id,
    provider,
    `${env.BASE_URL}/api/customer/oauth/${provider}/callback`,
    new Date(Date.now() + 900000).toISOString(),
    state_token
  ).run();

  return state_id;
}

/**
 * Verify and consume OAuth state
 */
export async function verifyAndConsumeState(state_id, env) {
  const db = getDB(env);
  
  const record = await db.prepare(`
    SELECT * FROM oauth_states 
    WHERE state = ? AND consumed = 0
  `).bind(state_id).first();

  if (!record) throw new Error("Invalid or consumed state");
  if (new Date(record.expires_at) < new Date()) throw new Error("State expired");

  // Verify signed token integrity
  const payload = await verifyJWT(record.state_token, env.JWT_SECRET);
  if (payload.state_id !== state_id) throw new Error("State mismatch");

  // Mark as consumed
  await db.prepare(`
    UPDATE oauth_states SET consumed = 1, used_at = CURRENT_TIMESTAMP WHERE state = ?
  `).bind(state_id).run();

  return payload;
}

/**
 * Exchange OAuth code for tokens
 */
export async function exchangeCode(providerKey, code, env) {
  const provider = getProvider(providerKey);
  const redirect_uri = `${env.BASE_URL}/api/customer/oauth/${providerKey}/callback`;
  
  // These should be in env or vault
  const credKey = (provider.credential_key || providerKey).toUpperCase();
  const client_id = env[`${credKey}_CLIENT_ID`];
  const client_secret = env[`${credKey}_CLIENT_SECRET`];

  if (!client_id || !client_secret) {
    throw new Error(`Missing credentials for provider: ${providerKey}`);
  }

  const response = await fetch(provider.endpoints.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id,
      client_secret
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Token exchange failed");

  return data;
}

/**
 * Securely save or update a connected account
 */
export async function saveConnection(brand_id, user_id, providerKey, tokenData, env) {
  const db = getDB(env);
  const provider = getProvider(providerKey);
  const adapter = getAdapter(providerKey);
  const secret = env.ENCRYPTION_SECRET;

  // Normalize data using provider-specific adapter if available
  let account_id = tokenData.account_id || tokenData.user_id || tokenData.id;
  let account_name = tokenData.account_name || tokenData.name || providerKey;
  let providerMetadata = {};

  if (adapter) {
    try {
      const normalized = await adapter.normalize(tokenData, env);
      account_id = normalized.account_id || account_id;
      account_name = normalized.account_name || account_name;
      providerMetadata = normalized.metadata || {};
    } catch (err) {
      console.warn(`[INTEGRATION:NORMALIZE_FAILED] ${providerKey}: ${err.message}`);
    }
  }

  const access_token_enc = await encrypt(tokenData.access_token, secret);
  const refresh_token_enc = tokenData.refresh_token ? await encrypt(tokenData.refresh_token, secret) : null;
  
  const expires_at = tokenData.expires_in 
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const metadata = JSON.stringify({
    ...providerMetadata,
    raw_response: tokenData,
    linked_at: new Date().toISOString()
  });

  // Unique constraint handles updates (brand_id, provider, provider_account_id)
  await db.prepare(`
    INSERT INTO connected_accounts (
      id,
      brand_id,
      provider,
      provider_type,
      provider_account_name,
      provider_account_id,
      status,
      access_token_encrypted,
      refresh_token_encrypted,
      token_expires_at,
      scopes,
      metadata,
      created_by,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(brand_id, provider, provider_account_id) DO UPDATE SET
      provider_account_name = excluded.provider_account_name,
      access_token_encrypted = excluded.access_token_encrypted,
      refresh_token_encrypted = excluded.refresh_token_encrypted,
      token_expires_at = excluded.token_expires_at,
      status = 'active',
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    crypto.randomUUID(),
    brand_id,
    providerKey,
    provider.type,
    account_name,
    account_id,
    access_token_enc,
    refresh_token_enc,
    expires_at,
    tokenData.scope || null,
    metadata,
    user_id
  ).run();
}
