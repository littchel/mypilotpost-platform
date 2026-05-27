/**
 * myPilotPost — Provider Registry
 * Defines first-wave and second-wave platform configurations.
 */

export const PROVIDERS = {
  // --- MEDIA / DESIGN (Import) ---
  canva: {
    name: "Canva",
    type: "media",
    capabilities: ["import_media"],
    auth: "oauth2",
    scopes: "design:content:read asset:read profile:read",
    endpoints: {
      auth: "https://www.canva.com/api/oauth/authorize",
      token: "https://api.canva.com/rest/v1/oauth/token"
    }
  },
  google_drive: {
    name: "Google Drive",
    type: "media",
    capabilities: ["import_media"],
    auth: "oauth2",
    credential_key: "GOOGLE",
    scopes: "openid email profile https://www.googleapis.com/auth/drive.readonly",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },
  dropbox: {
    type: "media",
    capabilities: ["import_media"],
    auth: "oauth2",
    scopes: "account_info.read files.content.read files.metadata.read",
    auth_params: {
      token_access_type: "offline"
    },
    endpoints: {
      auth: "https://www.dropbox.com/oauth2/authorize",
      token: "https://api.dropboxapi.com/oauth2/token"
    }
  },

  // --- SOCIAL / PUBLISHING ---
  linkedin: {
    name: "LinkedIn",
    type: "publishing",
    capabilities: ["publish_social", "sync_analytics"],
    auth: "oauth2",
    scopes: "openid profile email w_member_social",
    endpoints: {
      auth: "https://www.linkedin.com/oauth/v2/authorization",
      token: "https://www.linkedin.com/oauth/v2/accessToken"
    }
  },
  meta: {
    name: "Meta (Facebook & Instagram)",
    type: "publishing",
    capabilities: ["publish_social", "sync_analytics"],
    auth: "oauth2",
    scopes: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
    endpoints: {
      auth: "https://www.facebook.com/v19.0/dialog/oauth",
      token: "https://graph.facebook.com/v19.0/oauth/access_token"
    }
  },
  // Aliases — both frontend IDs route through the unified Meta OAuth flow
  facebook: {
    name: "Facebook",
    type: "publishing",
    capabilities: ["publish_social", "sync_analytics"],
    auth: "oauth2",
    credential_key: "META",  // uses META_CLIENT_ID / META_CLIENT_SECRET
    scopes: "pages_show_list,pages_read_engagement,pages_manage_posts,business_management",
    endpoints: {
      auth: "https://www.facebook.com/v19.0/dialog/oauth",
      token: "https://graph.facebook.com/v19.0/oauth/access_token"
    }
  },
  instagram: {
    name: "Instagram",
    type: "publishing",
    capabilities: ["publish_social"],
    auth: "oauth2",
    credential_key: "META",  // uses META_CLIENT_ID / META_CLIENT_SECRET
    scopes: "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish",
    endpoints: {
      auth: "https://www.facebook.com/v19.0/dialog/oauth",
      token: "https://graph.facebook.com/v19.0/oauth/access_token"
    }
  },
  google: {
    name: "Google (YouTube & Analytics)",
    type: "publishing",
    capabilities: ["publish_social", "sync_analytics"],
    auth: "oauth2",
    scopes: "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/youtube.readonly",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },
  x: {
    name: "X (Twitter)",
    type: "publishing",
    capabilities: ["publish_social"],
    auth: "oauth2",
    scopes: "tweet.read tweet.write users.read offline.access",
    endpoints: {
      auth: "https://twitter.com/i/oauth2/authorize",
      token: "https://api.twitter.com/2/oauth2/token"
    },
    auth_params: {
      code_challenge_method: "S256"
    }
  },
  tiktok: {
    name: "TikTok",
    type: "publishing",
    capabilities: ["publish_social"],
    auth: "oauth2",
    scopes: "user.info.basic,video.upload,video.list",
    endpoints: {
      auth: "https://www.tiktok.com/v2/auth/authorize/",
      token: "https://open.tiktokapis.com/v2/oauth/token/"
    }
  },
  pinterest: {
    name: "Pinterest",
    type: "publishing",
    capabilities: ["publish_social"],
    auth: "oauth2",
    scopes: "boards:read,pins:read,pins:write,user_accounts:read",
    endpoints: {
      auth: "https://www.pinterest.com/oauth/",
      token: "https://api.pinterest.com/v5/oauth/token"
    }
  },

  // --- THREADS ---
  threads: {
    name: "Threads",
    type: "publishing",
    capabilities: ["publish_social"],
    auth: "oauth2",
    credential_key: "META",
    scopes: "threads_basic,threads_content_publish",
    endpoints: {
      auth: "https://threads.net/oauth/authorize",
      token: "https://graph.threads.net/oauth/access_token"
    }
  },

  // --- YOUTUBE (shares GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) ---
  youtube: {
    name: "YouTube",
    type: "publishing",
    capabilities: ["publish_social", "sync_analytics"],
    auth: "oauth2",
    credential_key: "GOOGLE",
    scopes: "openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },

  // --- GOOGLE ANALYTICS (shares GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) ---
  google_analytics: {
    name: "Google Analytics",
    type: "analytics",
    capabilities: ["sync_analytics"],
    auth: "oauth2",
    credential_key: "GOOGLE",
    scopes: "openid email profile https://www.googleapis.com/auth/analytics.readonly",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },

  // --- GOOGLE BUSINESS PROFILE (shares GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) ---
  google_business: {
    name: "Google Business Profile",
    type: "publishing",
    capabilities: ["publish_social", "sync_analytics"],
    auth: "oauth2",
    credential_key: "GOOGLE",
    scopes: "openid email profile https://www.googleapis.com/auth/business.manage",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },

  // --- GOOGLE SEARCH CONSOLE (shares GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) ---
  google_search_console: {
    name: "Google Search Console",
    type: "analytics",
    capabilities: ["sync_analytics"],
    auth: "oauth2",
    credential_key: "GOOGLE",
    scopes: "openid email profile https://www.googleapis.com/auth/webmasters.readonly",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },

  // --- BLOG / PUBLISHING ---
  wordpress: {
    type: "publishing",
    capabilities: ["publish_blog"],
    auth: "oauth2",
    scopes: "global",
    endpoints: {
      auth: "https://public-api.wordpress.com/oauth2/authorize",
      token: "https://public-api.wordpress.com/oauth2/token"
    }
  },

  // --- AUTOMATION ---
  zapier: {
    type: "automation",
    capabilities: ["sync_events"],
    auth: "oauth2", // Zapier often acts as a consumer, but we might host a provider flow
    endpoints: {}
  }
};

export function getProvider(key) {
  const provider = PROVIDERS[key];
  if (!provider) return null;
  return provider;
}
