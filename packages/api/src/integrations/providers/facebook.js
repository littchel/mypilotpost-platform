/**
 * Meta (Facebook/Instagram) Adaptive Integration
 * Exchanges user token for a long-lived Page access token via /me/accounts.
 */
export async function normalize(tokenData, env) {
  const userAccessToken = tokenData.access_token;

  console.log(`[META_NORMALIZE] fetching pages with user token (token length=${userAccessToken?.length})`);

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,tasks,access_token&access_token=${userAccessToken}`
  );
  const pagesData = await pagesRes.json();

  if (!pagesRes.ok) {
    console.error(`[META_NORMALIZE_FAILED] status=${pagesRes.status} error=${pagesData.error?.message} code=${pagesData.error?.code}`);
    throw new Error("Failed to fetch Meta pages: " + (pagesData.error?.message || "Unknown error"));
  }

  console.log(`[META_NORMALIZE] pages_found=${pagesData.data?.length ?? 0}`);

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found. A Facebook Page linked to a Business account is required.");
  }

  // Use the first page — multi-page selection can be added in a future UX pass
  const page = pagesData.data[0];

  console.log(`[META_NORMALIZE] selected page_id=${page.id} page_name="${page.name}"`);

  // Swap user token for page token — only the page token is persisted
  tokenData.access_token = page.access_token;

  return {
    account_id: page.id,
    platform_username: page.name,
    meta: {
      category: page.category,
      perms: page.tasks,
      link: `https://facebook.com/${page.id}`
    }
  };
}
