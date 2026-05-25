/**
 * Threads OAuth Provider Adapter
 * Normalizes the token exchange response into the social_connections contract.
 * Threads issues short-lived tokens (1 hour) — must exchange for long-lived immediately.
 */
export async function normalize(tokenData, env) {
  let access_token = tokenData.access_token;

  // Exchange short-lived token for long-lived token (60 days, no refresh_token)
  try {
    const credKey = "META";
    const llRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${env[`${credKey}_CLIENT_SECRET`]}&access_token=${access_token}`
    );
    if (llRes.ok) {
      const llData = await llRes.json();
      if (llData.access_token) {
        access_token = llData.access_token;
        tokenData.access_token = access_token;
        // Long-lived tokens expire in 60 days
        tokenData.expires_in = llData.expires_in || 5183944;
      }
    }
  } catch (err) {
    console.warn("[THREADS] Long-lived token exchange failed, using short-lived:", err.message);
  }

  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${access_token}`
  );

  if (!profileRes.ok) {
    throw new Error(`Threads profile fetch failed: ${await profileRes.text()}`);
  }

  const profile = await profileRes.json();

  tokenData.account_id = profile.id;
  tokenData.account_name = profile.username || profile.name;

  return {
    account_id: profile.id,
    platform_username: profile.username || profile.name,
    meta: {
      name: profile.name,
      link: `https://www.threads.net/@${profile.username}`,
    },
  };
}
