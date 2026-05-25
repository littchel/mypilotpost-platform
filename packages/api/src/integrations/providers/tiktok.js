/**
 * TikTok Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
    {
      method: "GET",
      headers: { "Authorization": `Bearer ${tokenData.access_token}` }
    }
  );

  const { data: profile } = await profileRes.json();
  if (!profileRes.ok) throw new Error("TikTok profile fetch failed");

  return {
    account_id: profile.user.open_id,
    platform_username: profile.user.display_name,
    meta: {
      avatar_url: profile.user.avatar_url,
      union_id: profile.user.union_id
    }
  };
}
