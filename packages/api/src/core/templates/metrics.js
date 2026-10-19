import { inflateSync } from "node:zlib";
import { FONT_BYTES } from "./fontBytes.js";
import { FONT_REGISTRY } from "./fonts.js";

const faces = new Map();

function readTable(buf, name) {
  const u8 = Buffer.from(buf);
  if (u8.subarray(0, 4).toString() !== "wOFF") {
    throw new Error("FONT_NOT_REGISTERED: expected woff");
  }
  const count = u8.readUInt16BE(12);
  let off = 44;
  for (let i = 0; i < count; i++) {
    const tag = u8.toString("latin1", off, off + 4);
    const start = u8.readUInt32BE(off + 4);
    const comp = u8.readUInt32BE(off + 8);
    const orig = u8.readUInt32BE(off + 12);
    if (tag === name) {
      const slice = u8.subarray(start, start + comp);
      return orig === comp ? slice : inflateSync(slice);
    }
    off += 20;
  }
  throw new Error(`FONT_NOT_REGISTERED: missing ${name}`);
}

function cmapGlyph(cmap) {
  const tables = cmap.readUInt16BE(2);
  let chosen = null;
  let cursor = 4;
  for (let i = 0; i < tables; i++) {
    const platform = cmap.readUInt16BE(cursor);
    const encoding = cmap.readUInt16BE(cursor + 2);
    const sub = cmap.readUInt32BE(cursor + 4);
    cursor += 8;
    if (platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) chosen = sub;
  }
  if (chosen == null) throw new Error("FONT_NOT_REGISTERED: cmap");
  const format = cmap.readUInt16BE(chosen);
  if (format !== 4) throw new Error(`FONT_NOT_REGISTERED: cmap format ${format}`);
  const segCount = cmap.readUInt16BE(chosen + 6) / 2;
  let p = chosen + 14;
  const end = [];
  const start = [];
  const delta = [];
  const rangeOff = [];
  for (let i = 0; i < segCount; i++) end.push(cmap.readUInt16BE(p + i * 2));
  p += segCount * 2 + 2;
  for (let i = 0; i < segCount; i++) start.push(cmap.readUInt16BE(p + i * 2));
  p += segCount * 2;
  for (let i = 0; i < segCount; i++) delta.push(cmap.readInt16BE(p + i * 2));
  p += segCount * 2;
  const rangeBase = p;
  for (let i = 0; i < segCount; i++) rangeOff.push(cmap.readUInt16BE(p + i * 2));
  return (code) => {
    if (code > 0xffff) return 0;
    for (let i = 0; i < segCount; i++) {
      if (code > end[i] || code < start[i]) continue;
      if (rangeOff[i] === 0) return (code + delta[i]) & 0xffff;
      const glyphPos = rangeBase + i * 2 + rangeOff[i] + (code - start[i]) * 2;
      if (glyphPos + 1 >= cmap.length) return 0;
      const glyph = cmap.readUInt16BE(glyphPos);
      if (!glyph) return 0;
      return (glyph + delta[i]) & 0xffff;
    }
    return 0;
  };
}

function faceFor(weight) {
  const key = Number(weight);
  if (faces.has(key)) return faces.get(key);
  const file = FONT_REGISTRY.Inter?.weights?.[key];
  const bytes = file && FONT_BYTES[file];
  if (!bytes) {
    const err = new Error(`TEMPLATE_FONT_UNAVAILABLE: Inter ${key}`);
    err.code = "TEMPLATE_FONT_UNAVAILABLE";
    err.details = { requestedFamily: "Inter", requestedWeight: key, reason: "weight_not_bundled" };
    throw err;
  }
  const head = readTable(bytes, "head");
  const hhea = readTable(bytes, "hhea");
  const hmtx = readTable(bytes, "hmtx");
  const units = head.readUInt16BE(18);
  const nMetrics = hhea.readUInt16BE(34);
  const advances = [];
  for (let i = 0; i < nMetrics; i++) advances.push(hmtx.readUInt16BE(i * 4));
  const face = { units, advances, glyph: cmapGlyph(readTable(bytes, "cmap")) };
  faces.set(key, face);
  return face;
}

/** Width in pixels from the bundled font's hmtx advances. Missing glyphs are listed. */
export function measureTextWidth(text, fontSize, weight) {
  const face = faceFor(weight);
  let width = 0;
  const missing = [];
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const glyph = face.glyph(code);
    if (!glyph) missing.push(ch);
    const advance = face.advances[glyph] ?? face.advances[0] ?? 0;
    width += (advance * fontSize) / face.units;
  }
  return { width, missing };
}
