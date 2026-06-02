/**
 * LinkedIn Personal Provider Adapter
 * Scopes: openid profile email w_member_social
 * No organization endpoints — personal profile only.
 */

export async function normalize(tokenData, env) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "LinkedIn-Version": "202306"
    }
  });

  const profile = await res.json();
  if (!res.ok) throw new Error(`LinkedIn userinfo failed: ${profile.message || res.status}`);

  return {
    account_id: profile.sub,
    platform_username: profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim(),
    meta: {
      email:           profile.email   || null,
      profile_picture: profile.picture || null
    }
  };
}
