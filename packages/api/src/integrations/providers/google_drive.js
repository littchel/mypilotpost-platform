/**
 * Google Drive Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const profile = await profileRes.json();
  if (!profileRes.ok) throw new Error("Google Drive profile fetch failed");

  return {
    account_id: profile.id,
    platform_username: profile.email || profile.name,
    meta: {
      email: profile.email,
      picture: profile.picture
    }
  };
}
