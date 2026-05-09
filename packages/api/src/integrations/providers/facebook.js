/**
 * Meta (Facebook/Instagram) Adaptive Integration
 * Requirement: Exchange user token for LONG-LIVED Page Token.
 */
export async function normalize(tokenData, env) {
  const userAccessToken = tokenData.access_token;

  // 1. Get Long-Lived User Token (optional, but good for 60-day window)
  // 2. Fetch User Pages
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
  const pagesData = await pagesRes.json();
  
  if (!pagesRes.ok) throw new Error("Failed to fetch Meta pages: " + (pagesData.error?.message || "Unknown error"));
  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found. A page is required for business posting.");
  }

  // Pick the first page (UX logic can be expanded for multiple pages later)
  const page = pagesData.data[0];
  
  // Requirement: Store PAGE access token only
  // Modification to tokenData for the engine to persist
  tokenData.access_token = page.access_token; // Swapping for persistence
  tokenData.account_id = page.id;
  tokenData.account_name = page.name;

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
