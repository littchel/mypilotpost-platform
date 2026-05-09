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

  // 3. Media Validation (Mocked)
  if (mediaType && mediaMeta) {
    if (mediaMeta.ratio && !limits.mediaRatios.includes(mediaMeta.ratio)) {
      if (results.state === "SAFE") results.state = "WARNING";
      results.messages.push(`Aspect ratio ${mediaMeta.ratio} is not ideal. Best: ${limits.mediaRatios.join(', ')}.`);
    }
  }

  // 4. Safe Zones
  if (limits.hasSafeZones) {
    results.messages.push(`Safe zone overlaps are active. Ensure critical UI doesn't obscure text.`);
  }

  return results;
};
