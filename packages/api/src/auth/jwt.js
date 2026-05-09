// packages/api/src/auth/jwt.js
// Cloudflare Workers–native JWT (HS256)

function arrayBufferToBase64Url(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToUint8Array(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function issueJWT(payload, env, options = {}) {
  const secret = env?.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: options.expiresIn ? now + options.expiresIn : now + 60 * 60 * 24 * 7,
  };

  const encoder = new TextEncoder();
  const data = `${arrayBufferToBase64Url(encoder.encode(JSON.stringify(header)))}.${arrayBufferToBase64Url(encoder.encode(JSON.stringify(fullPayload)))}`;

  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${arrayBufferToBase64Url(signatureBuffer)}`;
}

export async function verifyJWT(token, secretFromEnv) {
  const secret = secretFromEnv;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed");

  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = base64UrlToUint8Array(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(data));

    if (!valid) throw new Error("Invalid signature");

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
    if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error("Expired");

    return payload;
  } catch (err) {
    console.error(`[AUTH:JWT:VERIFY_FAILED] ${err.message}`);
    throw err;
  }
}
