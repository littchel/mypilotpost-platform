/**
 * Dropbox Provider Adapter
 */

export async function normalize(tokenData, env) {
  const profileRes = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const profile = await profileRes.json();
  if (!profileRes.ok) throw new Error("Dropbox account fetch failed");

  return {
    account_id: profile.account_id,
    account_name: profile.name.display_name,
    metadata: {
      email: profile.email,
      profile_photo_url: profile.profile_photo_url
    }
  };
}
