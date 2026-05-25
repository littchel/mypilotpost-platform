/**
 * LinkedIn Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "X-Restli-Protocol-Version": "2.0.0"
    }
  });

  const profile = await profileRes.json();
  if (!profileRes.ok) throw new Error("LinkedIn profile fetch failed");

  return {
    account_id: profile.id,
    platform_username: `${profile.localizedFirstName} ${profile.localizedLastName}`.trim(),
    meta: {
      profile_picture: profile.profilePicture || null,
      vanity_name: profile.vanityName || null
    }
  };
}
