/**
 * LinkedIn Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  const profile = await profileRes.json();
  if (!profileRes.ok) throw new Error("LinkedIn profile fetch failed");

  return {
    account_id: profile.sub,
    platform_username: profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim(),
    meta: {
      email: profile.email || null,
      profile_picture: profile.picture || null
    }
  };
}
