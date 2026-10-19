let sharpInstance = null;
let sharpChecked = false;

async function getSharp() {
  if (sharpChecked) return sharpInstance;
  sharpChecked = true;
  try {
    const lib = "sharp";
    const mod = await import(lib);
    sharpInstance = mod.default || mod;
  } catch {
    sharpInstance = null;
  }
  return sharpInstance;
}

import { templateError, TEMPLATE_MEDIA_UNAVAILABLE } from "./errors.js";

export function coverExtractRect(imageW, imageH, slotW, slotH, focal = { x: 0.5, y: 0.5 }) {
  const target = slotW / slotH;
  const actual = imageW / imageH;
  let cropW;
  let cropH;
  if (actual > target) {
    cropH = imageH;
    cropW = Math.max(1, Math.round(imageH * target));
  } else {
    cropW = imageW;
    cropH = Math.max(1, Math.round(imageW / target));
  }
  cropW = Math.min(cropW, imageW);
  cropH = Math.min(cropH, imageH);
  const fx = focal?.x ?? 0.5;
  const fy = focal?.y ?? 0.5;
  let left = Math.round(fx * imageW - cropW / 2);
  let top = Math.round(fy * imageH - cropH / 2);
  left = Math.max(0, Math.min(left, imageW - cropW));
  top = Math.max(0, Math.min(top, imageH - cropH));
  return { left, top, width: cropW, height: cropH };
}

function mediaError(slot, reason, extra = {}) {
  return templateError(TEMPLATE_MEDIA_UNAVAILABLE, `TEMPLATE_MEDIA_UNAVAILABLE: ${slot?.id || "media"}`, {
    slotId: slot?.id || null,
    reason,
    retryable: true,
    action: "Replace the image with one that meets the slot size and crop.",
    ...extra,
  });
}

export function decodeImageSource(src) {
  if (Buffer.isBuffer(src)) return src;
  const value = String(src || "");
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

export async function prepareSlotImage(src, slot) {
  const bytes = decodeImageSource(src);
  if (!bytes) {
    return { src, cropped: false, reason: "remote_url_not_measured" };
  }
  const sharp = await getSharp();
  if (!sharp) {
    return { src, cropped: false, reason: "sharp_unavailable_in_runtime" };
  }
  let meta;
  try {
    meta = await sharp(bytes).metadata();
  } catch (err) {
    throw mediaError(slot, "invalid_image", { detail: err.message });
  }
  if (!meta.width || !meta.height) throw mediaError(slot, "invalid_image");
  if (meta.width < slot.width || meta.height < slot.height) {
    throw mediaError(slot, "below_slot_resolution", {
      image: { width: meta.width, height: meta.height },
      slot: { width: slot.width, height: slot.height },
    });
  }
  const rect = coverExtractRect(meta.width, meta.height, slot.width, slot.height, slot.focalPoint);
  const png = await sharp(bytes)
    .extract(rect)
    .resize(slot.width, slot.height, { fit: "fill" })
    .png()
    .toBuffer();
  return {
    src: `data:image/png;base64,${png.toString("base64")}`,
    cropped: true,
    rect,
    image: { width: meta.width, height: meta.height },
  };
}
