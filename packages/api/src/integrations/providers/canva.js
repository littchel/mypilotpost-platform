export async function normalize(tokenData, env) {
  // Canva REST API v1 /users/me could be used, but token often contains basic info
  // For now, we extract from tokenData or use placeholder
  
  return {
    account_id: tokenData.user_id || "canva-user",
    platform_username: tokenData.user_name || "Canva Library",
    meta: {
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      // Store design button preferences if any
    }
  };
}
