/**
 * Deterministic text fit using advance widths from the bundled Inter files.
 * Never truncates with an ellipsis. If the slot cannot hold the text at
 * the minimum readable size, the combination is rejected.
 */
import { measureTextWidth } from "./metrics.js";

export function wrapLineCount(text, fontSize, slotWidth, weight) {
  const raw = String(text || "");
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: 0, missing: [] };
  const space = measureTextWidth(" ", fontSize, weight).width;
  const missing = [];
  let lines = 1;
  let col = 0;
  for (const word of words) {
    const measured = measureTextWidth(word, fontSize, weight);
    missing.push(...measured.missing);
    if (measured.width > slotWidth) return { lines: Number.POSITIVE_INFINITY, missing };
    if (col === 0) {
      col = measured.width;
      continue;
    }
    if (col + space + measured.width <= slotWidth) col += space + measured.width;
    else {
      lines += 1;
      col = measured.width;
    }
  }
  return { lines, missing };
}

export function fitText(text, slot) {
  const value = String(text || "");
  if (!value.trim()) {
    return { action: "render", fontSize: slot.maxFontSize, lines: 0, text: "" };
  }
  if (slot.maxCharacters && value.length > slot.maxCharacters) {
    return {
      action: "reject",
      code: "CONTENT_EXCEEDS_CAPACITY",
      reason: "character_capacity",
      slotId: slot.id,
    };
  }
  let size = slot.maxFontSize;
  while (size >= slot.minFontSize) {
    const wrapped = wrapLineCount(value, size, slot.width, slot.fontWeight || 400);
    if (wrapped.missing.length) {
      return {
        action: "reject",
        code: "CONTENT_EXCEEDS_CAPACITY",
        reason: "glyph_missing",
        slotId: slot.id,
        missing: [...new Set(wrapped.missing)],
      };
    }
    const height = wrapped.lines * size * (slot.lineHeight || 1.2);
    if (wrapped.lines <= slot.maxLines && height <= slot.height) {
      return { action: "render", fontSize: size, lines: wrapped.lines, text: value };
    }
    size -= 1;
  }
  return {
    action: "reject",
    code: "CONTENT_EXCEEDS_CAPACITY",
    reason: "slot_geometry",
    slotId: slot.id,
  };
}

export function fitSlideContent(slide, content) {
  const fitted = {};
  const rejected = [];
  for (const slot of slide.slots || []) {
    if (slot.type !== "text" && slot.type !== "cta") continue;
    const raw = content?.[slot.contentKey] ?? content?.[slot.role] ?? "";
    const result = fitText(raw, slot);
    if (result.action === "reject") rejected.push(result);
    else fitted[slot.id] = result;
  }
  return { fitted, rejected };
}
