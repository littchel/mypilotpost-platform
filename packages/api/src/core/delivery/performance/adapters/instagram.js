/**
 * Instagram Business Performance Adapter
 * Fetches lifetime metrics for a published Instagram media object.
 * Requires a Page access token (stored at connection time via normalize()).
 */

async function appSecretProof(accessToken, appSecret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchInstagramMetrics({ accessToken, externalPostId, env }) {
  if (!externalPostId) throw new Error("Missing externalPostId for Instagram ingestion");

  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(accessToken, env.META_CLIENT_SECRET)
    : null;
  const proofParam = proof ? `&appsecret_proof=${proof}` : "";

  // Fetch basic counters (like_count, comments_count)
  const basicRes = await fetch(
    `https://graph.facebook.com/v21.0/${externalPostId}?fields=id,like_count,comments_count,timestamp&access_token=${accessToken}${proofParam}`
  );
  const basic = basicRes.ok ? await basicRes.json() : {};

  // Fetch insights (impressions, reach, engagement, saved, shares)
  // Note: Insights not available for all media types or personal accounts
  let insights = { data: [] };
  try {
    const insightsRes = await fetch(
      `https://graph.facebook.com/v21.0/${externalPostId}/insights?metric=impressions,reach,engagement,saved,shares&period=lifetime&access_token=${accessToken}${proofParam}`
    );
    if (insightsRes.ok) insights = await insightsRes.json();
  } catch { /* non-fatal — basic metrics still available */ }

  return { basic, insights };
}
