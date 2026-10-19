import { CANVASES, safeAreaFor, SPACE } from "./tokens.js";

function canvas(key) {
  return { ...CANVASES[key], safeArea: safeAreaFor(key) };
}

function base(id, name, description, contentType, format, canvasKey, slides) {
  const c = canvas(canvasKey);
  return {
    id,
    name,
    description,
    contentType,
    format,
    supportedFormats: [format],
    status: "candidate",
    canvas: c,
    grid: { margin: c.safeArea.left, gutter: SPACE.md, columns: 12 },
    slides,
    renderer: { id: "canonical-satori", version: 1, outputs: ["png"] },
    referenceImage: null,
  };
}

function text(slot) {
  return {
    type: "text",
    align: "left",
    fontRole: "body",
    fontWeight: 400,
    lineHeight: 1.25,
    zIndex: 4,
    ...slot,
  };
}

function media(slot) {
  return {
    type: "media",
    role: "hero",
    contentKey: "image",
    fit: "cover",
    focalPoint: { x: 0.5, y: 0.4 },
    textSafeZones: [],
    subject: "real subject from the brand industry",
    negativeSpace: "none",
    collide: true,
    zIndex: 1,
    ...slot,
  };
}

function shape(slot) {
  return { type: "shape", collide: false, radius: 0, zIndex: 0, token: "surface", ...slot };
}

function logo(x, y) {
  return { id: "logo", type: "logo", token: "logo", x, y, width: 160, height: 48, zIndex: 5, collide: true, radius: 0 };
}

const W = 952;

export const CANDIDATE_TEMPLATES = [
  base("mpp.feed.editorial", "Editorial", "Portrait feed with a large photograph and a short editorial column.", "feed", "feed_post", "portrait", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1350, token: "surface" }),
      media({ id: "hero", x: 64, y: 64, width: W, height: 620, aspectRatio: "4:3", negativeSpace: "bottom", required: true }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 712, width: W, height: 150, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 56, maxLines: 3, preferredLines: 2, maxCharacters: 72, lineHeight: 1.1, colorToken: "onSurface" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 878, width: W, height: 200, minFontSize: 22, maxFontSize: 28, maxLines: 4, preferredLines: 3, maxCharacters: 220, colorToken: "onSurface" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 1104, width: 420, height: 56, fontRole: "body", fontWeight: 600, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 28, colorToken: "onAccent" }),
      logo(64, 1188),
    ],
  }]),

  base("mpp.feed.bold", "Bold Statement", "Square statement post. Headline sits on the open side of the photograph.", "feed", "feed_post", "square", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1080, token: "primary" }),
      media({ id: "hero", x: 480, y: 64, width: 536, height: 952, aspectRatio: "9:16", focalPoint: { x: 0.62, y: 0.4 }, negativeSpace: "left", subject: "subject kept to the right" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 160, width: 380, height: 420, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 64, maxLines: 6, preferredLines: 4, maxCharacters: 80, lineHeight: 1.05, colorToken: "onPrimary" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 860, width: 360, height: 56, fontWeight: 600, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 24, colorToken: "onAccent" }),
      logo(64, 940),
    ],
  }]),

  base("mpp.feed.educational", "Educational", "Portrait lesson card with a label, headline, and short explanation.", "feed", "feed_post", "portrait", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1350, token: "surface" }),
      text({ id: "label", role: "label", contentKey: "label", x: 64, y: 80, width: 400, height: 40, fontWeight: 600, minFontSize: 18, maxFontSize: 20, maxLines: 1, preferredLines: 1, maxCharacters: 24, colorToken: "accent" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 140, width: W, height: 180, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 52, maxLines: 3, preferredLines: 2, maxCharacters: 80, lineHeight: 1.1, colorToken: "onSurface" }),
      media({ id: "hero", x: 64, y: 352, width: W, height: 520, aspectRatio: "16:9", negativeSpace: "none" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 900, width: W, height: 220, minFontSize: 22, maxFontSize: 28, maxLines: 5, preferredLines: 3, maxCharacters: 240, colorToken: "onSurface" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 1152, width: 400, height: 56, fontWeight: 600, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 28, colorToken: "onAccent" }),
    ],
  }]),

  base("mpp.feed.product", "Product / Service", "Square product frame with the offer beside a clean image.", "feed", "feed_post", "square", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1080, token: "surface" }),
      media({ id: "hero", x: 64, y: 64, width: 560, height: 952, aspectRatio: "3:4", subject: "product or service in use", negativeSpace: "right" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 656, y: 160, width: 360, height: 280, fontRole: "heading", fontWeight: 700, minFontSize: 32, maxFontSize: 48, maxLines: 5, preferredLines: 3, maxCharacters: 60, lineHeight: 1.1, colorToken: "onSurface" }),
      text({ id: "body", role: "body", contentKey: "body", x: 656, y: 460, width: 360, height: 240, minFontSize: 20, maxFontSize: 24, maxLines: 6, preferredLines: 4, maxCharacters: 160, colorToken: "onSurface" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 656, y: 860, width: 340, height: 56, fontWeight: 600, minFontSize: 18, maxFontSize: 20, maxLines: 1, preferredLines: 1, maxCharacters: 22, colorToken: "onAccent" }),
    ],
  }]),

  base("mpp.feed.testimonial", "Testimonial", "Square quote with attribution and a supporting portrait.", "feed", "feed_post", "square", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1080, token: "secondary" }),
      media({ id: "hero", x: 64, y: 64, width: 280, height: 280, aspectRatio: "1:1", subject: "person", focalPoint: { x: 0.5, y: 0.35 }, negativeSpace: "none" }),
      text({ id: "quote", role: "quote", contentKey: "headline", x: 376, y: 80, width: 640, height: 360, fontRole: "heading", fontWeight: 600, minFontSize: 28, maxFontSize: 40, maxLines: 6, preferredLines: 4, maxCharacters: 140, lineHeight: 1.2, colorToken: "onSecondary" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 480, width: W, height: 280, minFontSize: 22, maxFontSize: 28, maxLines: 5, preferredLines: 3, maxCharacters: 200, colorToken: "onSecondary" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 900, width: 420, height: 56, fontWeight: 600, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 28, colorToken: "onAccent" }),
    ],
  }]),

  base("mpp.carousel.editorial", "Editorial Story", "Three-slide portrait story: open, explain, close.", "carousel", "carousel", "portrait", ["Open", "Explain", "Close"].map((name, i) => ({
    id: `slide_${i + 1}`,
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1350, token: "surface" }),
      text({ id: "meta", role: "meta", contentKey: "label", x: 64, y: 72, width: 400, height: 36, fontWeight: 600, minFontSize: 18, maxFontSize: 18, maxLines: 1, preferredLines: 1, maxCharacters: 16, colorToken: "accent" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 128, width: W, height: 160, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 52, maxLines: 3, preferredLines: 2, maxCharacters: 70, lineHeight: 1.1, colorToken: "onSurface" }),
      media({ id: "hero", x: 64, y: 320, width: W, height: 560, aspectRatio: "5:3" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 912, width: W, height: 200, minFontSize: 22, maxFontSize: 28, maxLines: 4, preferredLines: 3, maxCharacters: 200, colorToken: "onSurface" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 1140, width: 360, height: 52, fontWeight: 600, minFontSize: 18, maxFontSize: 20, maxLines: 1, preferredLines: 1, maxCharacters: 24, colorToken: "onAccent" }),
    ],
  }))),

  base("mpp.carousel.steps", "Educational Steps", "Four square steps with a number label and one idea per slide.", "carousel", "carousel", "square", [1, 2, 3, 4].map((n) => ({
    id: `step_${n}`,
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1080, token: "surface" }),
      text({ id: "label", role: "label", contentKey: "label", x: 64, y: 80, width: 200, height: 48, fontWeight: 700, minFontSize: 20, maxFontSize: 28, maxLines: 1, preferredLines: 1, maxCharacters: 8, colorToken: "accent" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 180, width: W, height: 200, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 56, maxLines: 3, preferredLines: 2, maxCharacters: 64, lineHeight: 1.1, colorToken: "onSurface" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 420, width: W, height: 360, minFontSize: 24, maxFontSize: 32, maxLines: 6, preferredLines: 4, maxCharacters: 220, colorToken: "onSurface" }),
      logo(64, 900),
    ],
  }))),

  base("mpp.carousel.list", "List / Mistakes", "Five square list slides, one point each.", "carousel", "carousel", "square", [1, 2, 3, 4, 5].map((n) => ({
    id: `item_${n}`,
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1080, token: "primary" }),
      text({ id: "label", role: "label", contentKey: "label", x: 64, y: 120, width: 240, height: 48, fontWeight: 700, minFontSize: 22, maxFontSize: 28, maxLines: 1, preferredLines: 1, maxCharacters: 8, colorToken: "onAccent" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 240, width: W, height: 280, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 60, maxLines: 4, preferredLines: 2, maxCharacters: 72, lineHeight: 1.05, colorToken: "onPrimary" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 560, width: W, height: 240, minFontSize: 22, maxFontSize: 30, maxLines: 4, preferredLines: 3, maxCharacters: 160, colorToken: "onPrimary" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 860, width: 420, height: 56, fontWeight: 700, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 24, colorToken: "onAccent" }),
    ],
  }))),

  base("mpp.carousel.before_after", "Before & After", "Two portrait slides contrasting the old state and the new state.", "carousel", "carousel", "portrait", ["Before", "After"].map((name, i) => ({
    id: name.toLowerCase(),
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1350, token: i === 0 ? "secondary" : "surface" }),
      text({ id: "label", role: "label", contentKey: "label", x: 64, y: 72, width: 300, height: 40, fontWeight: 700, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 12, colorToken: "accent" }),
      media({ id: "hero", x: 64, y: 140, width: W, height: 640, aspectRatio: "3:2" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 812, width: W, height: 140, fontRole: "heading", fontWeight: 700, minFontSize: 32, maxFontSize: 48, maxLines: 2, preferredLines: 1, maxCharacters: 48, lineHeight: 1.1, colorToken: i === 0 ? "onSecondary" : "onSurface" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 972, width: W, height: 200, minFontSize: 22, maxFontSize: 28, maxLines: 4, preferredLines: 3, maxCharacters: 180, colorToken: i === 0 ? "onSecondary" : "onSurface" }),
    ],
  }))),

  base("mpp.story.cta", "Story CTA", "Story with a clear action inside the safe area.", "story", "story", "story", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1920, token: "primary" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 520, width: 952, height: 320, fontRole: "heading", fontWeight: 700, minFontSize: 40, maxFontSize: 64, maxLines: 4, preferredLines: 3, maxCharacters: 70, lineHeight: 1.05, colorToken: "onPrimary" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 880, width: 952, height: 200, minFontSize: 24, maxFontSize: 32, maxLines: 4, preferredLines: 2, maxCharacters: 140, colorToken: "onPrimary" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 1140, width: 480, height: 72, fontWeight: 700, minFontSize: 22, maxFontSize: 28, maxLines: 1, preferredLines: 1, maxCharacters: 24, colorToken: "onAccent" }),
      logo(64, 1500),
    ],
  }]),

  base("mpp.story.educational", "Story Educational", "Story lesson with one idea and a supporting line.", "story", "story", "story", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1920, token: "surface" }),
      text({ id: "label", role: "label", contentKey: "label", x: 64, y: 280, width: 400, height: 40, fontWeight: 700, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 18, colorToken: "accent" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 360, width: 952, height: 280, fontRole: "heading", fontWeight: 700, minFontSize: 40, maxFontSize: 60, maxLines: 4, preferredLines: 2, maxCharacters: 72, lineHeight: 1.05, colorToken: "onSurface" }),
      media({ id: "hero", x: 64, y: 680, width: 952, height: 640, aspectRatio: "3:2" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 1360, width: 952, height: 180, minFontSize: 22, maxFontSize: 28, maxLines: 3, preferredLines: 2, maxCharacters: 140, colorToken: "onSurface" }),
    ],
  }]),

  base("mpp.story.announcement", "Story Announcement", "Story announcement with a short supporting sentence.", "story", "story", "story", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1920, token: "secondary" }),
      text({ id: "label", role: "label", contentKey: "label", x: 64, y: 420, width: 500, height: 40, fontWeight: 700, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 20, colorToken: "accent" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 500, width: 952, height: 360, fontRole: "heading", fontWeight: 700, minFontSize: 42, maxFontSize: 68, maxLines: 4, preferredLines: 2, maxCharacters: 64, lineHeight: 1.02, colorToken: "onSecondary" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 900, width: 952, height: 200, minFontSize: 24, maxFontSize: 32, maxLines: 4, preferredLines: 2, maxCharacters: 160, colorToken: "onSecondary" }),
      logo(64, 1500),
    ],
  }]),

  base("mpp.promo.product", "Product / Service Promotion", "Portrait promotion with offer, proof, and action.", "promotional", "promotional", "portrait", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1080, height: 1350, token: "surface" }),
      media({ id: "hero", x: 64, y: 64, width: W, height: 560, aspectRatio: "16:9", subject: "offer or product" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 64, y: 656, width: W, height: 160, fontRole: "heading", fontWeight: 700, minFontSize: 36, maxFontSize: 52, maxLines: 3, preferredLines: 2, maxCharacters: 64, lineHeight: 1.1, colorToken: "onSurface" }),
      text({ id: "body", role: "body", contentKey: "body", x: 64, y: 836, width: W, height: 180, minFontSize: 22, maxFontSize: 28, maxLines: 4, preferredLines: 2, maxCharacters: 180, colorToken: "onSurface" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 64, y: 1056, width: 440, height: 64, fontWeight: 700, minFontSize: 20, maxFontSize: 24, maxLines: 1, preferredLines: 1, maxCharacters: 24, colorToken: "onAccent" }),
      logo(64, 1160),
    ],
  }]),

  base("mpp.promo.lead", "Lead Generation", "Landscape lead card for link placements.", "promotional", "promotional", "link", [{
    id: "slide",
    slots: [
      shape({ id: "ground", x: 0, y: 0, width: 1200, height: 628, token: "primary" }),
      text({ id: "headline", type: "text", role: "headline", contentKey: "headline", x: 48, y: 80, width: 640, height: 220, fontRole: "heading", fontWeight: 700, minFontSize: 32, maxFontSize: 48, maxLines: 3, preferredLines: 2, maxCharacters: 64, lineHeight: 1.05, colorToken: "onPrimary" }),
      text({ id: "body", role: "body", contentKey: "body", x: 48, y: 320, width: 640, height: 120, minFontSize: 20, maxFontSize: 24, maxLines: 3, preferredLines: 2, maxCharacters: 120, colorToken: "onPrimary" }),
      text({ id: "cta", type: "cta", role: "cta", contentKey: "cta", x: 48, y: 470, width: 320, height: 56, fontWeight: 700, minFontSize: 18, maxFontSize: 22, maxLines: 1, preferredLines: 1, maxCharacters: 22, colorToken: "onAccent" }),
      media({ id: "hero", x: 740, y: 48, width: 412, height: 532, aspectRatio: "3:4", negativeSpace: "left" }),
    ],
  }]),
];
