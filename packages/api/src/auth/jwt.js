// packages/api/src/auth/jwt.js
// Cloudflare Workers–native JWT (HS256)

/**
 * Issue a CUSTOMER JWT (HS256)
 * - ALWAYS uses env.JWT_SECRET
 * - Impossible to mismatch secrets
 */
export async function issueJWT(payload, env, options = {}) {
  if (!env?.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: options.expiresIn
      ? now + options.expiresIn
      : now + 60 * 60 * 24 * 7, // 7 days default
  };

  const encoder = new TextEncoder();

  const base64url = (input) =>
    btoa(input)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );

  const signature = base64url(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return `${data}.${signature}`;
}

/**
 * Verify a JWT (HS256)
 * - Uses provided secret (middleware supplies env.JWT_SECRET)
 */
export async function verifyJWT(token, secret) {
  if (!secret) {
    throw new Error("JWT secret missing");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(data)
  );

  if (!valid) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
  );

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}
