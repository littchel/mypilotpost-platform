import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { resolveFontUse } from "./fonts.js";
import { getCertifiedTemplate, listCertifiedTemplates } from "./registry.js";
import { templateError, TEMPLATE_NOT_CERTIFIED, TEMPLATE_INVALID_SPECIFICATION } from "./errors.js";

const execFileAsync = promisify(execFile);

const REQUIRED = [
  "template.json",
  "reference/master-reference.png",
  "content/text-schema.json",
  "content/example-content.json",
  "media/media-schema.json",
  "media/example-media.json",
  "typography/typography.json",
  "layout/grid.json",
  "layout/spacing.json",
  "certification/certification.json",
];

async function readJson(root, rel, blockers) {
  try {
    const raw = await readFile(new URL(rel, root));
    return JSON.parse(raw.toString());
  } catch (err) {
    blockers.push({
      code: "TEMPLATE_INVALID_SPECIFICATION",
      file: rel,
      reason: err instanceof SyntaxError ? "json_parse_failed" : "unreadable_file",
      detail: err.message,
    });
    return null;
  }
}

function imageInfo(buf) {
  if (buf.length >= 24 && buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 8 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { format: "jpeg", width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
    return { format: "jpeg", width: null, height: null };
  }
  return { format: "unknown", width: null, height: null };
}

export function assertSafeZipEntries(names) {
  const unsafe = [];
  for (const name of names) {
    const parts = String(name).split(/[/\\]/);
    if (name.startsWith("/") || parts.includes("..") || parts.some((p) => p.includes("\0"))) {
      unsafe.push(name);
    }
  }
  if (unsafe.length) {
    throw templateError(TEMPLATE_INVALID_SPECIFICATION, "TEMPLATE_INVALID_SPECIFICATION: unsafe archive path", {
      reason: "path_traversal",
      files: unsafe,
      retryable: false,
      action: "Reject the archive. Do not extract it.",
    });
  }
}

function fontBlocker(role, family, weight, status) {
  let resolved = null;
  try {
    resolved = resolveFontUse({ family, weight, purpose: role, allowSubstitute: false });
  } catch (err) {
    return {
      code: "TEMPLATE_FONT_UNAVAILABLE",
      file: "typography/typography.json",
      reason: status === "registry_required" ? "required_font_not_in_registry" : (err.details?.reason || "weight_or_family_not_bundled"),
      role,
      requestedFamily: family,
      requestedWeight: weight,
      usedFamily: null,
      usedWeight: null,
      substituted: false,
    };
  }
  return {
    ok: true,
    role,
    requestedFamily: resolved.requestedFamily,
    requestedWeight: resolved.requestedWeight,
    usedFamily: resolved.usedFamily,
    usedWeight: resolved.usedWeight,
    substituted: resolved.substituted,
  };
}

/**
 * Inspect a template package directory. Does not register or activate anything.
 * certification.json status is recorded and never treated as proof of certification.
 */
export async function inspectTemplatePackage(dir) {
  const base = dir.endsWith("/") ? dir : `${dir}/`;
  const root = new URL(base.startsWith("file:") ? base : `file://${base}`);
  const blockers = [];
  const fontResolution = [];
  const filesRead = [];

  for (const rel of REQUIRED) {
    try {
      await stat(new URL(rel, root));
      filesRead.push(rel);
    } catch {
      blockers.push({ code: "TEMPLATE_INVALID_SPECIFICATION", file: rel, reason: `missing_file:${rel}` });
    }
  }

  const template = filesRead.includes("template.json") ? await readJson(root, "template.json", blockers) : null;
  const text = filesRead.includes("content/text-schema.json") ? await readJson(root, "content/text-schema.json", blockers) : null;
  const exampleContent = filesRead.includes("content/example-content.json") ? await readJson(root, "content/example-content.json", blockers) : null;
  const typography = filesRead.includes("typography/typography.json") ? await readJson(root, "typography/typography.json", blockers) : null;
  const grid = filesRead.includes("layout/grid.json") ? await readJson(root, "layout/grid.json", blockers) : null;
  const spacing = filesRead.includes("layout/spacing.json") ? await readJson(root, "layout/spacing.json", blockers) : null;
  const media = filesRead.includes("media/media-schema.json") ? await readJson(root, "media/media-schema.json", blockers) : null;
  const exampleMedia = filesRead.includes("media/example-media.json") ? await readJson(root, "media/example-media.json", blockers) : null;
  const certification = filesRead.includes("certification/certification.json") ? await readJson(root, "certification/certification.json", blockers) : null;

  let refInfo = null;
  if (filesRead.includes("reference/master-reference.png")) {
    const ref = await readFile(new URL("reference/master-reference.png", root));
    refInfo = imageInfo(ref);
    if (refInfo.format !== "png") {
      blockers.push({
        code: "TEMPLATE_INVALID_SPECIFICATION",
        file: "reference/master-reference.png",
        reason: "master_reference_is_not_a_png",
        bytes: ref.length,
        detected: ref.subarray(0, 3).toString("hex"),
        width: refInfo.width,
        height: refInfo.height,
      });
    }
  }

  const id = template?.id || null;
  const version = template?.version || null;
  const outputType = template?.output_type || template?.media_type || template?.type || null;
  const canvas = grid?.canvas || template?.canvas || {};

  if (certification && certification.status !== "certified") {
    blockers.push({
      code: "TEMPLATE_NOT_CERTIFIED",
      file: "certification/certification.json",
      reason: "package_certification_status_is_not_certified",
      templateId: id,
      version,
      claimedStatus: certification.status || null,
    });
  }
  if (certification?.status === "certified") {
    blockers.push({
      code: "TEMPLATE_NOT_CERTIFIED",
      file: "certification/certification.json",
      reason: "client_certification_claim_rejected",
      templateId: id,
      version,
      detail: "A status field inside the package is not certification.",
    });
  }

  if (outputType === "video" || template?.type === "reel" || template?.media_type === "video") {
    blockers.push({
      code: "TEMPLATE_INVALID_SPECIFICATION",
      file: "template.json",
      reason: "output_type_video_or_reel_not_supported_by_png_renderer",
      templateId: id,
      detail: "A static PNG preview would not certify animation, audio, duration, or a complete reel.",
    });
  } else if (template && outputType !== "static_image" && outputType !== "image" && !(template.renderer?.outputs || []).includes("png")) {
    blockers.push({
      code: "TEMPLATE_INVALID_SPECIFICATION",
      file: "template.json",
      reason: "output_type_not_static_image",
      outputType,
    });
  }

  if (refInfo?.format === "png") {
    if (refInfo.width !== canvas.width || refInfo.height !== canvas.height) {
      blockers.push({
        code: "TEMPLATE_INVALID_SPECIFICATION",
        file: "reference/master-reference.png",
        reason: "master_reference_dimensions_do_not_match_canvas",
        width: refInfo.width,
        height: refInfo.height,
        canvas,
      });
    }
  }

  const byFontId = {};
  for (const entry of Object.values(typography?.font_registry || {})) {
    if (entry?.font_id) byFontId[entry.font_id] = entry;
  }
  for (const [role, spec] of Object.entries(typography?.roles || {})) {
    const declared = byFontId[spec.font_family] || { family: spec.font_family, status: spec.status };
    const result = fontBlocker(role, declared.family, spec.weight, declared.status);
    if (result.ok) fontResolution.push(result);
    else blockers.push({ ...result, templateId: id });
  }

  const mediaSlots = media?.slots || [];
  for (const slot of mediaSlots) {
    if (slot.type === "image_or_video" || slot.type === "video" || media?.media_type === "video") {
      blockers.push({
        code: "TEMPLATE_MEDIA_UNAVAILABLE",
        file: "media/media-schema.json",
        reason: "slot_requires_video_and_no_video_pipeline_exists",
        slotId: slot.id,
        templateId: id,
      });
    }
    if (slot.required && !exampleMedia?.[slot.id]?.asset && !exampleMedia?.[slot.id]?.path) {
      blockers.push({
        code: "TEMPLATE_MEDIA_UNAVAILABLE",
        file: "media/example-media.json",
        reason: "required_example_media_missing",
        slotId: slot.id,
        templateId: id,
      });
    }
  }
  if (exampleMedia?.founder_media?.reference_media_must_not_publish || exampleMedia?.hero?.must_not_use_master_reference) {
    // recorded below as an inference only when an asset is actually absent
  }
  if (exampleMedia && Object.values(exampleMedia).some((m) => m && m.asset == null && m.path == null)) {
    blockers.push({
      code: "TEMPLATE_MEDIA_UNAVAILABLE",
      file: "media/example-media.json",
      reason: "example_media_file_not_in_package",
      templateId: id,
    });
  }

  const textSlots = text?.slots || [];
  const positioned = grid?.slots || [];
  for (const slot of textSlots) {
    const box = positioned.find((s) => s.id === slot.id);
    if (!box || [box.x, box.y, box.width, box.height].some((n) => typeof n !== "number")) {
      blockers.push({
        code: "TEMPLATE_INVALID_SPECIFICATION",
        file: "layout/grid.json",
        reason: "slot_geometry_not_explicit",
        slotId: slot.id,
      });
    }
    const sample = exampleContent?.[slot.id];
    if (slot.required && (sample == null || sample === "")) {
      blockers.push({
        code: "TEMPLATE_INVALID_SPECIFICATION",
        file: "content/example-content.json",
        reason: "required_example_content_missing",
        slotId: slot.id,
      });
    }
    if (typeof sample === "string" && slot.max_characters && sample.length > slot.max_characters) {
      blockers.push({
        code: "TEMPLATE_CONTENT_OVERFLOW",
        file: "content/example-content.json",
        reason: "example_exceeds_max_characters",
        slotId: slot.id,
      });
    }
  }
  if (textSlots.length === 0 && template && !template.slides) {
    blockers.push({
      code: "TEMPLATE_INVALID_SPECIFICATION",
      file: "content/text-schema.json",
      reason: "text_slots_missing",
    });
  }
  if (!spacing?.spacing) {
    blockers.push({
      code: "TEMPLATE_INVALID_SPECIFICATION",
      file: "layout/spacing.json",
      reason: "spacing_tokens_missing",
    });
  }
  if (grid?.zones && !grid?.slots) {
    blockers.push({
      code: "TEMPLATE_INVALID_SPECIFICATION",
      file: "layout/grid.json",
      reason: "zones_are_not_slot_geometry",
    });
  }

  const already = id ? listCertifiedTemplates().some((t) => t.id === id) : false;
  return {
    templateId: id,
    version,
    name: template?.name || null,
    outputType,
    platforms: (template?.formats || []).map((f) => f.platform).filter(Boolean),
    canvas: { width: canvas.width || null, height: canvas.height || null },
    masterReference: "reference/master-reference.png",
    masterReferenceInfo: refInfo,
    textSlots: textSlots.map((s) => s.id),
    fontResolution,
    filesRead,
    claimedCertificationStatus: certification?.status || null,
    status: "not_certified",
    registered: already,
    selectable: false,
    visualAcceptance: "not_performed",
    blockers,
    inferences: [
      ...(exampleMedia?.founder_media?.reference_media_must_not_publish
        ? ["example media declares the reference must not be used as production media, and the package contains no separate production media file"]
        : []),
    ],
  };
}

/**
 * Explicit registration hook. Inspection never calls this.
 * A package cannot enter the production registry from this path: the registry
 * is the certified catalogue loaded at startup, and this function refuses
 * every upload until a separate reviewed registration exists.
 */
export function registerInspectedPackage(report) {
  if (!report || report.status !== "certified" || report.visualAcceptance !== "accepted" || report.blockers?.length) {
    throw templateError(TEMPLATE_NOT_CERTIFIED, "TEMPLATE_NOT_CERTIFIED: package is not certified", {
      templateId: report?.templateId || null,
      version: report?.version || null,
      reason: "registration_requires_completed_certification",
      retryable: false,
      action: "Fix the blockers and complete visual acceptance before registration.",
    });
  }
  throw templateError(TEMPLATE_NOT_CERTIFIED, "TEMPLATE_NOT_CERTIFIED: runtime registration is not enabled", {
    templateId: report.templateId,
    reason: "explicit_registry_insertion_not_available",
    retryable: false,
  });
}

export async function inspectTemplateArchive(zipPath) {
  const listing = await execFileAsync("unzip", ["-Z1", zipPath]);
  const names = listing.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  assertSafeZipEntries(names);
  const dir = await mkdtemp(`${tmpdir()}/mpp-package-`);
  await execFileAsync("unzip", ["-q", zipPath, "-d", dir]);
  const rootName = names[0]?.split("/")[0];
  const hasRoot = rootName && names.every((n) => n === rootName || n.startsWith(`${rootName}/`));
  const packageDir = hasRoot ? `${dir}/${rootName}` : dir;
  const report = await inspectTemplatePackage(packageDir);
  report.archive = zipPath;
  report.extractedTo = dir;
  return report;
}

function slotBox(slot) {
  return { id: slot.id, x: slot.x, y: slot.y, width: slot.width, height: slot.height, type: slot.type };
}

/**
 * Transcribe an already-registered catalogue template into package files.
 * Does not create a master reference and does not change certification.
 */
export async function exportRegistryTemplateToPackage(templateId, dir) {
  const template = getCertifiedTemplate(templateId);
  if (!template) {
    throw templateError(TEMPLATE_NOT_CERTIFIED, `TEMPLATE_NOT_CERTIFIED: ${templateId}`);
  }
  const slide = template.slides[0];
  const textSlots = slide.slots.filter((s) => s.type === "text" || s.type === "cta");
  const mediaSlots = slide.slots.filter((s) => s.type === "media");
  const roles = {};
  for (const slot of textSlots) {
    roles[slot.id] = {
      font_family: "inter",
      weight: slot.fontWeight,
      size: slot.maxFontSize,
      line_height: slot.lineHeight,
      letter_spacing: 0,
      alignment: slot.align,
    };
  }
  const example = {};
  for (const slot of textSlots) {
    example[slot.id] = slot.role === "headline" ? "A clear offer" : slot.role === "cta" ? "Book a call" : "One sentence that fits the slot.";
  }
  const files = {
    "template.json": {
      ...template,
      status: "candidate",
      version: template.version || null,
      output_type: "static_image",
      purpose: template.description,
      package_note: "Transcribed from the in-code certified catalogue. No approved master PNG exists in the repository. This file is not a certification.",
    },
    "content/text-schema.json": {
      template_id: template.id,
      slots: textSlots.map((s) => ({
        id: s.id,
        type: "text",
        role: s.role,
        required: true,
        max_characters: s.maxCharacters,
        max_lines: s.maxLines,
        min_font_size: s.minFontSize,
        max_font_size: s.maxFontSize,
        line_height: s.lineHeight,
        alignment: s.align,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        overflow_behavior: "reject",
      })),
    },
    "content/example-content.json": example,
    "media/media-schema.json": {
      template_id: template.id,
      media_type: "image",
      slots: mediaSlots.map((s) => ({
        id: s.id,
        type: "image",
        required: false,
        aspect_ratio: s.aspectRatio,
        fit: s.fit,
        focal_point: s.focalPoint,
        negative_space: s.negativeSpace,
        subject: s.subject,
        minimum_width: s.width,
        minimum_height: s.height,
        text_safe_zones: s.textSafeZones,
      })),
    },
    "media/example-media.json": {
      hero: {
        asset: null,
        path: null,
        must_not_use_master_reference: true,
        reason: "No approved test image is stored for this template.",
      },
    },
    "typography/typography.json": {
      font_registry: {
        primary: { font_id: "inter", family: "Inter", weights: [400, 600, 700], status: "approved" },
      },
      roles,
    },
    "layout/grid.json": {
      canvas: { width: template.canvas.width, height: template.canvas.height, aspect_ratio: template.canvas.aspectRatio },
      grid: template.grid,
      safe_area: template.canvas.safeArea,
      slots: slide.slots.map(slotBox),
    },
    "layout/spacing.json": { spacing: { xs: 8, sm: 16, md: 24, lg: 32, xl: 48, xxl: 64 } },
    "certification/certification.json": {
      template_id: template.id,
      version: template.version || null,
      status: "not_certified",
      reason: "missing_approved_master_reference",
      certified_at: null,
    },
  };
  for (const [rel, value] of Object.entries(files)) {
    const url = new URL(rel, dir.endsWith("/") ? `file://${dir}` : `file://${dir}/`);
    await mkdir(new URL(".", url), { recursive: true });
    await writeFile(url, JSON.stringify(value, null, 2));
  }
  return { templateId, dir, masterReferenceWritten: false };
}
