/**
 * myPilotPost — Production Crypto Utilities
 * AES-GCM (256-bit) with PBKDF2 Key Derivation & Bounded Isolate-Memory Key Cache
 */

const KEY_CACHE_LIMIT = 10;
const keyCache = new Map(); // SHA256(secret) hex -> CryptoKey

/**
 * Computes a fast SHA-256 digest of the secret to use as a collision-resistant,
 * non-sensitive cache key. Raw secrets are never stored as map keys.
 */
async function getCacheKey(secret) {
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a secret string using PBKDF2 (100,000 iterations).
 * Caches derived keys in isolate memory with an LRU eviction policy (max 10 entries)
 * to avoid repetitive 100k-iteration key derivation CPU overhead across requests.
 */
async function getKey(secret) {
  if (!secret || typeof secret !== "string") {
    throw new Error("Encryption secret missing");
  }

  const cacheKey = await getCacheKey(secret);

  if (keyCache.has(cacheKey)) {
    const key = keyCache.get(cacheKey);
    // Refresh LRU position (delete and re-insert at end)
    keyCache.delete(cacheKey);
    keyCache.set(cacheKey, key);
    return key;
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("mypilotpost-crypto-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  // Enforce bounded cache limit before insertion
  if (keyCache.size >= KEY_CACHE_LIMIT) {
    const oldestKey = keyCache.keys().next().value;
    keyCache.delete(oldestKey);
  }

  keyCache.set(cacheKey, derivedKey);
  return derivedKey;
}

/**
 * URL-safe Base64 encoding without padding.
 */
function base64UrlEncode(bytes) {
  let binStr = "";
  for (let i = 0; i < bytes.length; i++) {
    binStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * URL-safe Base64 decoding with strict character validation.
 */
function base64UrlDecode(str) {
  if (typeof str !== "string" || !str || !/^[A-Za-z0-9_-]+$/.test(str)) {
    throw new Error("Invalid base64url characters");
  }
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts plaintext using AES-256-GCM and returns a versioned envelope:
 *   v1:<base64url(iv[12] + ciphertext + tag[16])>
 *
 * Avoids double-encryption if input is already a valid v1 ciphertext under the same secret.
 */
export async function encrypt(text, secret) {
  if (!secret || typeof secret !== "string") {
    throw new Error("Encryption secret missing");
  }
  if (text === null || text === undefined) {
    throw new Error("Encryption text missing");
  }

  const strText = String(text);

  // Avoid double-encrypting already encrypted v1 ciphertext
  if (strText.startsWith("v1:")) {
    try {
      await decrypt(strText, secret);
      return strText;
    } catch {
      // If it doesn't decrypt cleanly under this secret, treat as plaintext
    }
  }

  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(strText);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return "v1:" + base64UrlEncode(combined);
}

/**
 * Decrypts ciphertext with AES-256-GCM.
 * Supports:
 *   - Versioned envelope: `v1:<base64url-payload>`
 *   - Legacy unprefixed envelope: `<base64url-payload>`
 *
 * Rejects unsupported version headers (e.g., `v2:`) and malformed/tampered ciphertext.
 * Fails closed without falling back to plaintext.
 */
export async function decrypt(token, secret) {
  if (!secret || typeof secret !== "string") {
    throw new Error("Decryption secret missing");
  }
  if (!token || typeof token !== "string") {
    throw new Error("Decryption token missing");
  }

  let payload = token;
  const isVersioned = token.startsWith("v1:");

  if (isVersioned) {
    payload = token.slice(3);
  } else if (/^v[0-9]+:/.test(token)) {
    throw new Error("Unsupported ciphertext version");
  }

  if (!payload) {
    throw new Error("Malformed ciphertext payload");
  }

  const combined = base64UrlDecode(payload);

  // Minimum length: 12-byte IV + 16-byte AES-GCM tag = 28 bytes
  if (combined.length < 28) {
    throw new Error("Truncated or malformed ciphertext");
  }

  const key = await getKey(secret);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Diagnostic / test helpers for key cache verification.
 */
export function _getCacheSize() {
  return keyCache.size;
}

export function _clearKeyCache() {
  keyCache.clear();
}
