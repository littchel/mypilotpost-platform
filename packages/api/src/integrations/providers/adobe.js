/**
 * Adobe IMS Provider Adapter
 */

export async function normalize(tokenData, env) {
  // Adobe IMS standard openid userinfo or profile
  const profileRes = await fetch("https://ims-na1.adobelogin.com/ims/userinfo/v2", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const profile = await profileRes.json();
  if (!profileRes.ok) {
    // Try profile fallback if userinfo/v2 fails
    const fallbackRes = await fetch("https://ims-na1.adobelogin.com/ims/profile/v1", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      return {
        account_id: fbData.userId || fbData.sub || "unknown_adobe",
        platform_username: fbData.displayName || fbData.email || "Adobe User",
        meta: {
          email: fbData.email || null,
          name: fbData.name || null
        }
      };
    }
    throw new Error("Adobe profile fetch failed");
  }

  return {
    account_id: profile.sub || profile.userId || "unknown_adobe",
    platform_username: profile.name || profile.email || "Adobe User",
    meta: {
      email: profile.email || null,
      name: profile.name || null
    }
  };
}
