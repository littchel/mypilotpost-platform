/** 8px spacing grid. Templates must use these tokens for margins and gaps. */
export const SPACE = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  margin: 64,
  storyTop: 200,
  storyBottom: 240,
};

export const CANVASES = {
  square: { width: 1080, height: 1080, aspectRatio: "1:1", orientation: "square" },
  portrait: { width: 1080, height: 1350, aspectRatio: "4:5", orientation: "portrait" },
  story: { width: 1080, height: 1920, aspectRatio: "9:16", orientation: "portrait" },
  link: { width: 1200, height: 628, aspectRatio: "1200:628", orientation: "landscape" },
};

export function safeAreaFor(canvasKey) {
  if (canvasKey === "story") {
    return { top: SPACE.storyTop, right: SPACE.margin, bottom: SPACE.storyBottom, left: SPACE.margin };
  }
  if (canvasKey === "link") {
    return { top: 40, right: 40, bottom: 40, left: 40 };
  }
  return { top: SPACE.margin, right: SPACE.margin, bottom: SPACE.margin, left: SPACE.margin };
}
