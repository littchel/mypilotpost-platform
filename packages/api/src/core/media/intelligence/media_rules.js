export const PLATFORM_MEDIA_RULES = {
  Instagram: {
    allowed: ["image", "video"],
    orientation: ["square", "portrait"],
    max_items: 10
  },
  LinkedIn: {
    allowed: ["image", "video", "document"],
    orientation: ["landscape", "square"],
    max_items: 5
  },
  "X (Twitter)": {
    allowed: ["image", "video"],
    orientation: ["landscape"],
    max_items: 4
  }
};
