/**
 * Pinterest Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!profileRes.ok) throw new Error("Pinterest profile fetch failed");
  const profile = await profileRes.json();

  return {
    account_id: profile.username, // Pinterest often uses username as ID in v5
    platform_username: profile.username,
    meta: {
      account_type: profile.account_type,
      profile_image: profile.profile_image,
      website_url: profile.website_url
    }
  };
}
