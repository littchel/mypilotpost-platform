/**
 * TikTok Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://open-api.tiktok.com/user/info/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: tokenData.access_token,
      fields: ["open_id", "union_id", "avatar_url", "display_name"]
    })
  });

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
