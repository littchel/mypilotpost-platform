/**
 * Platform Requirements & Validation Engine
 * Converts content constraints into SAFE, WARNING, or BLOCKED states.
 */

export const PLATFORM_LIMITS = {
  facebook: {
    maxChars: 63206,
    optimalChars: 80,
    maxHashtags: 30, // Recommended
    mediaRatios: ["1.91:1", "1:1", "4:5"],
    videoMaxDurationSeconds: 14400, // 240 mins
  },
  facebook_story: {
    maxChars: 2200,
    optimalChars: 80,
    mediaRatios: ["9:16"],
    videoMaxDurationSeconds: 60,
    hasSafeZones: true
  },
  facebook_reel: {
    maxChars: 2200,
    optimalChars: 80,
    mediaRatios: ["9:16"],
    videoMaxDurationSeconds: 90,
    hasSafeZones: true
  },
  instagram: {
    maxChars: 2200,
    optimalChars: 150,
    maxHashtags: 30,
    mediaRatios: ["1:1", "4:5", "16:9"],
    videoMaxDurationSeconds: 60, // reels up to 90s, feed 60s typical
  },
  instagram_story: {
    maxChars: 2200, // Not strict but typical
    mediaRatios: ["9:16"],
    videoMaxDurationSeconds: 60,
    hasSafeZones: true
  },
  linkedin: {
    maxChars: 3000,
    optimalChars: 150, // "See more" triggers around 140 chars
    maxHashtags: 5, // Recommended
    mediaRatios: ["1.91:1", "1:1", "4:5"],
    videoMaxDurationSeconds: 900, // 15 mins (typical max without premium)
  },
  x: {
    maxChars: 280, // Free tier
    optimalChars: 200,
    maxHashtags: 2, // Recommended
    mediaRatios: ["16:9", "1:1"],
    videoMaxDurationSeconds: 140, // 2m20s
  },
  tiktok: {
    maxChars: 4000, // Updated 2024
    optimalChars: 150,
    maxHashtags: 5,
    mediaRatios: ["9:16"],
    videoMaxDurationSeconds: 600, // 10 mins
    hasSafeZones: true
  },
  pinterest: {
    maxChars: 500,
    optimalChars: 100,
    maxHashtags: 20,
    mediaRatios: ["2:3"],
    videoMaxDurationSeconds: 900,
  },
  youtube: {
    maxChars: 5000, // Description
    optimalChars: 150, // visible before "show more"
    maxHashtags: 15,
    mediaRatios: ["16:9"], // Thumbnail/Video
    videoMaxDurationSeconds: 43200, // 12 hours
  },
  shorts: {
    maxChars: 5000,
    titleMaxChars: 100,
    optimalChars: 100,
    maxHashtags: 15,
    mediaRatios: ["9:16"],
    videoMaxDurationSeconds: 60,
    hasSafeZones: true
  },
  wordpress: {
    maxChars: 100000,
    optimalChars: 1500,
    maxHashtags: 10,
    mediaRatios: [],
    videoMaxDurationSeconds: null,
  },
  wordpress_ecommerce: {
    maxChars: 100000,
    optimalChars: 1000,
    maxHashtags: 10,
    mediaRatios: [],
    videoMaxDurationSeconds: null,
  }
};

export const validateContent = (platform, content, mediaType, mediaMeta) => {
  const limits = PLATFORM_LIMITS[platform];
  const results = {
    state: "SAFE", // SAFE, WARNING, BLOCKED
    messages: []
  };

  if (!limits) return results;

  const charCount = content ? content.length : 0;
  const hashtags = content ? (content.match(/#[\w]+/g) || []) : [];

  // 1. Character length
  if (charCount > limits.maxChars) {
    results.state = "BLOCKED";
    results.messages.push(`Exceeds maximum character limit (${charCount}/${limits.maxChars}).`);
  } else if (charCount > limits.optimalChars) {
    if (results.state === "SAFE") results.state = "WARNING";
    results.messages.push(`Content is long and may be truncated behind "See more".`);
  }

  // 2. Hashtags
  if (hashtags.length > limits.maxHashtags) {
    if (results.state === "SAFE") results.state = "WARNING";
    results.messages.push(`High hashtag count (${hashtags.length}). Recommended: max ${limits.maxHashtags}.`);
  }

  // 3. Media Requirement Check
  if ((platform === "instagram" || platform === "instagram_story" || platform === "facebook_story" || platform === "facebook_reel") && !mediaType) {
    results.state = "BLOCKED";
    const displayName = platform.startsWith("facebook") ? "Facebook" : "Instagram";
    const subFormat = platform.endsWith("story") ? "Story" : (platform.endsWith("reel") ? "Reel" : "Post");
    results.messages.push(`${displayName} ${subFormat} requires at least one image or video.`);
  }

  if (platform === "facebook_reel" && mediaType !== "video") {
    results.state = "BLOCKED";
    results.messages.push(`Facebook Reels require a video.`);
  }

  if (platform === "shorts" && mediaType !== "video") {
    results.state = "BLOCKED";
    results.messages.push(`YouTube Shorts requires a video.`);
  }

  if (platform === "pinterest" && !mediaType) {
    results.state = "BLOCKED";
    results.messages.push(`Pinterest Pins require an image or video.`);
  }

  if (platform === "facebook" && mediaType === "video") {
    results.state = "BLOCKED";
    results.messages.push("Videos are not supported on standard Facebook posts. Please use Facebook Reels or Facebook Stories to publish videos.");
  }

  if (platform === "pinterest" && mediaType === "video") {
    results.state = "BLOCKED";
    results.messages.push("Videos are not supported on Pinterest Pins. Please use images instead.");
  }


  // 4. Media Metadata check (Aspect ratio, Duration, Size)
  if (mediaType && mediaMeta) {
    // Video duration checks
    if (mediaType === "video" && mediaMeta.duration && limits.videoMaxDurationSeconds) {
      if (mediaMeta.duration > limits.videoMaxDurationSeconds) {
        results.state = "BLOCKED";
        results.messages.push(`Video exceeds duration limit (${Math.round(mediaMeta.duration)}s / ${limits.videoMaxDurationSeconds}s).`);
      }
    }

    // Aspect ratio validations
    if (mediaMeta.ratio) {
      let ratioVal = null;
      if (typeof mediaMeta.ratio === "number") {
        ratioVal = mediaMeta.ratio;
      } else if (typeof mediaMeta.ratio === "string" && mediaMeta.ratio.includes(":")) {
        const [w, h] = mediaMeta.ratio.split(":").map(Number);
        if (w && h) ratioVal = w / h;
      }

      if (ratioVal) {
        if (platform === "instagram") {
          // Instagram feed supports 1.91:1 (1.91) down to 4:5 (0.8). Outside this is invalid/blocked.
          if (ratioVal < 0.79 || ratioVal > 1.92) {
            results.state = "BLOCKED";
            results.messages.push(`Instagram aspect ratio is invalid (${mediaMeta.ratio}). Supported: 4:5 to 1.91:1.`);
          }
        } else if (platform === "instagram_story" || platform === "facebook_story" || platform === "facebook_reel" || platform === "shorts" || platform === "tiktok") {
          // Requires 9:16 vertical (0.56)
          if (ratioVal > 0.65) {
            if (results.state === "SAFE") results.state = "WARNING";
            results.messages.push(`Landscape or square media will crop or scale on vertical platforms.`);
          }
        }
      }
    }
  }

  // 5. Safe Zones
  if (limits.hasSafeZones) {
    results.messages.push(`Preview safe zones active. Ensure text is not obscured by platform UI overlays.`);
  }

  return results;
};
