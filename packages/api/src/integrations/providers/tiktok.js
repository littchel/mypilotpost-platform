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

  if (!profileRes.ok) {
    const errText = await profileRes.text().catch(() => "");
    throw new Error(`TikTok profile fetch failed with status ${profileRes.status}: ${errText}`);
  }

  const payload = await profileRes.json();
  const user = payload?.data?.user;
  if (!user) {
    throw new Error("TikTok profile fetch returned empty user data");
  }

  return {
    account_id: user.open_id,
    platform_username: user.display_name,
    meta: {
      avatar_url: user.avatar_url,
      union_id: user.union_id
    }
  };
}
