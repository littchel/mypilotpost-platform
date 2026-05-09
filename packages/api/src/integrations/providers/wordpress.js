/**
 * WordPress Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://public-api.wordpress.com/rest/v1.1/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const profile = await profileRes.json();
  if (!profileRes.ok) throw new Error("WordPress profile fetch failed");

  return {
    account_id: profile.ID.toString(),
    account_name: profile.display_name || profile.username,
    metadata: {
      email: profile.email,
      primary_blog: profile.primary_blog
    }
  };
}
