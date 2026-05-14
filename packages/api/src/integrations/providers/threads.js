/**
 * Threads OAuth Provider Adapter
 * Normalizes the token exchange response into the social_connections contract.
 */
export async function normalize(tokenData, _env) {
  const { access_token, user_id } = tokenData;

  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${access_token}`
  );

  if (!profileRes.ok) {
    throw new Error(`Threads profile fetch failed: ${await profileRes.text()}`);
  }

  const profile = await profileRes.json();

  tokenData.account_id = profile.id || user_id;
  tokenData.account_name = profile.username || profile.name;

  return {
    account_id: profile.id || user_id,
    platform_username: profile.username || profile.name,
    meta: {
      name: profile.name,
      link: `https://www.threads.net/@${profile.username}`,
    },
  };
}
