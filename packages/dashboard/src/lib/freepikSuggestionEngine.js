/**
 * Freepik Suggestion Engine
 * Strategic visual intelligence adapter that converts post context into Freepik search queries,
 * styles, and orientation constraints.
 */

// Simulating an AI translation layer that would normally happen backend-side.
export const generateVisualIntelligence = (context) => {
  const { caption, goal, tone, platforms, topic } = context;

  const intelligence = {
    searchQueries: [],
    recommendedOrientation: "landscape",
    suggestedStyles: [],
    platformSafeAssets: true,
    strategicAdvice: ""
  };

  // 1. Determine orientation based on primary platform
  if (platforms.some(p => ['tiktok', 'shorts', 'instagram_story'].includes(p))) {
    intelligence.recommendedOrientation = "portrait";
  } else if (platforms.includes('instagram')) {
    intelligence.recommendedOrientation = "square"; // 1:1 or 4:5
  }

  // 2. Generate search queries based on topic/tone
  const baseTopic = topic || "business";
  if (baseTopic.toLowerCase().includes("ai") || baseTopic.toLowerCase().includes("automation")) {
    intelligence.searchQueries = [
      "futuristic dashboard",
      "abstract AI technology",
      "clean automation interface",
      "executive tech office"
    ];
    intelligence.suggestedStyles = ["3d illustration", "minimalist photo", "data visualization"];
  } else if (goal === "authority") {
    intelligence.searchQueries = [
      "professional boardroom",
      "executive strategy",
      "clean minimal workspace"
    ];
    intelligence.suggestedStyles = ["premium photography", "monochrome", "corporate minimal"];
  } else {
    intelligence.searchQueries = [
      `${baseTopic} strategy`,
      `${baseTopic} concept`,
      `modern ${baseTopic}`
    ];
    intelligence.suggestedStyles = ["high contrast photography", "flat vector illustration"];
  }

  // 3. Strategic Media Recommendations
  if (goal === "authority" && platforms.includes("linkedin")) {
    intelligence.strategicAdvice = "This topic performs better as a carousel or document on LinkedIn. Consider infographic-style assets.";
  } else if (intelligence.recommendedOrientation === "portrait") {
    intelligence.strategicAdvice = "Vertical visuals are recommended for TikTok and Shorts. Ensure the center is clear for text overlays.";
  } else {
    intelligence.strategicAdvice = "High-contrast visuals stop the scroll best for engagement goals.";
  }

  return intelligence;
};

/**
 * Adapter function to fetch mock Freepik results based on generated intelligence.
 * In the future, this calls the actual Freepik API with the generated searchQueries and filters.
 */
export const fetchFreepikSuggestions = async (intelligence) => {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800));

  const ratioMapping = {
    portrait: "900/1600",
    square: "800/800",
    landscape: "1200/630"
  };
  const sizeStr = ratioMapping[intelligence.recommendedOrientation] || "800/600";

  // Mock results that represent the strategic queries
  const mockResults = intelligence.searchQueries.slice(0, 4).map((query, index) => {
    // We use a deterministic seed so it looks consistent
    const seed = query.replace(/\s+/g, '') + index;
    return {
      id: `freepik_mock_${index}`,
      url: `https://picsum.photos/seed/${seed}/${sizeStr}`,
      thumbnail: `https://picsum.photos/seed/${seed}/200/200`,
      styleTag: intelligence.suggestedStyles[index % intelligence.suggestedStyles.length],
      queryMatch: query,
      orientation: intelligence.recommendedOrientation
    };
  });

  return mockResults;
};
