/**
 * X (Twitter) Provider Adapter
 * Requirement: OAuth 2.0 PKCE Handshake.
 */

export async function normalize(tokenData, env) {
  // Fetch user info from Twitter API v2
  const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!profileRes.ok) {
    const err = await profileRes.json();
    throw new Error("Failed to fetch X profile: " + (err.detail || "Unknown error"));
  }
  
  const { data: profile } = await profileRes.json();

  return {
    account_id: profile.id,
    platform_username: profile.username,
    meta: {
      account_name: profile.name,
      profile_image_url: profile.profile_image_url,
      verified: profile.verified
    }
  };
}
