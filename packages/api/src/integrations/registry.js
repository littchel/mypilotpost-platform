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
    type: "media",
    capabilities: ["import_media"],
    auth: "oauth2",
    endpoints: {
      auth: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token"
    }
  },
  dropbox: {
    type: "media",
    capabilities: ["import_media"],
    auth: "oauth2",
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
    scopes: "r_liteprofile r_emailaddress w_member_social",
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
      auth: "https://www.tiktok.com/auth/authorize/",
      token: "https://open-api.tiktok.com/oauth/access_token/"
    }
  },
  pinterest: {
    name: "Pinterest",
    type: "publishing",
    capabilities: ["publish_social"],
    auth: "oauth2",
    scopes: "boards:read,pins:read,pins:write",
    endpoints: {
      auth: "https://www.pinterest.com/oauth/",
      token: "https://api.pinterest.com/v5/oauth/token"
    }
  },

  // --- BLOG / PUBLISHING ---
  wordpress: {
    type: "publishing",
    capabilities: ["publish_blog"],
    auth: "oauth2",
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
  if (!provider) throw new Error(`Unknown provider: ${key}`);
  return provider;
}
