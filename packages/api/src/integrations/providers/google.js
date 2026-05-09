/**
 * Google Provider Adapter
 * Handles profile normalization for YouTube & Analytics Access.
 */

export async function normalize(tokenData, env) {
  // Fetch user info using the access token
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!profileRes.ok) throw new Error("Failed to fetch Google profile");
  const profile = await profileRes.json();

  return {
    account_id: profile.sub,
    platform_username: profile.email || profile.name,
    meta: {
      picture_url: profile.picture,
      hd: profile.hd, // Hosted domain if G-Suite
      verified_email: profile.email_verified
    }
  };
}
