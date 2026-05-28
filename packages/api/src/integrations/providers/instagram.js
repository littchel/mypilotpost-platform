/**
 * Instagram Business OAuth Adapter
 * Exchanges user token for a Page access token and resolves the connected
 * Instagram Business Account ID required for the Content Publishing API.
 */
export async function normalize(tokenData, env) {
  const userAccessToken = tokenData.access_token;

  console.log(`[META_INSTAGRAM_SCOPES] normalizing instagram token (token_length=${userAccessToken?.length})`);

  // Step 1: Fetch connected Facebook Pages (pages_show_list scope)
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
  );
  const pagesData = await pagesRes.json();

  if (!pagesRes.ok) {
    console.error(`[META_INSTAGRAM_NORMALIZE_FAILED] pages_fetch status=${pagesRes.status} error=${pagesData.error?.message} code=${pagesData.error?.code}`);
    throw new Error("Failed to fetch Meta pages for Instagram: " + (pagesData.error?.message || "Unknown error"));
  }

  console.log(`[META_INSTAGRAM_SCOPES] pages_found=${pagesData.data?.length ?? 0}`);

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found. An Instagram Business account must be connected to a Facebook Page.");
  }

  // Step 2: Find first Page with a connected Instagram Business Account
  const pageWithIg = pagesData.data.find(p => p.instagram_business_account);

  if (!pageWithIg) {
    console.error(`[META_INSTAGRAM_NORMALIZE_FAILED] no page has instagram_business_account — pages=${JSON.stringify(pagesData.data.map(p => p.id))}`);
    throw new Error("No Instagram Business Account found linked to your Facebook Pages. Go to Facebook Settings and connect your Instagram Business account to a Page first.");
  }

  const igAccountId = pageWithIg.instagram_business_account.id;
  console.log(`[META_INSTAGRAM_SCOPES] ig_account_id=${igAccountId} page_id=${pageWithIg.id} page_name="${pageWithIg.name}"`);

  // Step 3: Fetch IG Business Account username/name for display
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,name,username&access_token=${pageWithIg.access_token}`
  );
  const igData = await igRes.json();

  if (!igRes.ok) {
    console.warn(`[META_INSTAGRAM_SCOPES] ig_detail_fetch failed (non-fatal) status=${igRes.status} error=${igData.error?.message}`);
  }

  // Swap: store the Page access token — required for IG Content Publishing API calls
  tokenData.access_token = pageWithIg.access_token;

  return {
    account_id: igAccountId,
    platform_username: igData.username || igData.name || igAccountId,
    meta: {
      page_id: pageWithIg.id,
      page_name: pageWithIg.name,
      ig_account_id: igAccountId
    }
  };
}
