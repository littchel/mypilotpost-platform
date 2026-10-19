import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { getCertifiedTemplate, listCertifiedTemplates, requireCertifiedTemplate } from "./registry.js";
import { fitText } from "./fit.js";
import { scoreMediaDesign } from "./mediaMatch.js";
import { resolveFontUse } from "./fonts.js";
import { renderTemplateFlat, resolveTemplateFonts } from "./renderer.js";
import { generateFinalAsset } from "./assetGenerator.js";
import { computePreviewR2Key, renderPreviewBuffer } from "./templateRoutes.js";
import sharp from "sharp";
import { coverExtractRect } from "./mediaCrop.js";
import {
  inspectTemplatePackage,
  inspectTemplateArchive,
  registerInspectedPackage,
  exportRegistryTemplateToPackage,
  assertSafeZipEntries,
} from "./packageIntake.js";

const COPY = {
  headline: "A clear offer",
  body: "One sentence that fits the slot.",
  cta: "Book a call",
};

function brandEnv(brand) {
  return {
    DB: {
      prepare: (sql) => ({
        bind: () => ({
          first: async () => {
            if (String(sql).includes("FROM brands")) return { name: brand.name };
            return {
              primary_color_hex: brand.primary,
              secondary_color_hex: brand.secondary,
              accent_color: brand.accent,
              font_pairing_headline: "Inter",
              font_pairing_body: "Inter",
              logo_asset_url: brand.logo || null,
              background_preference: "light",
            };
          },
        }),
      }),
    },
    MEDIA_BUCKET: brand.bucket || null,
    BASE_URL: "http://test.local",
  };
}

function pngSize(buf) {
  const b = Buffer.from(buf);
  assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function solidPng(width, height, r, g, b) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4);
    data.copy(out, 8);
    const crc = crc32(out.subarray(4, 8 + data.length));
    out.writeUInt32BE(crc >>> 0, 8 + data.length);
    return out;
  };
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

test("editorial package transcription stays uncertified without a master png", async () => {
  const dir = await mkdtemp(`${tmpdir()}/mpp-editorial-`);
  try {
    await exportRegistryTemplateToPackage("mpp.feed.editorial", dir);
    const report = await inspectTemplatePackage(dir);
    assert.equal(report.templateId, "mpp.feed.editorial");
    assert.equal(report.outputType, "static_image");
    assert.equal(report.canvas.width, 1080);
    assert.equal(report.canvas.height, 1350);
    assert.equal(report.status, "not_certified");
    assert.equal(report.selectable, false);
    assert.equal(report.visualAcceptance, "not_performed");
    assert.equal(report.masterReferenceInfo, null);
    assert.ok(report.blockers.some((b) => b.reason === "missing_file:reference/master-reference.png"));
    assert.ok(report.blockers.some((b) => b.reason === "package_certification_status_is_not_certified"));
    assert.ok(report.blockers.some((b) => b.reason === "example_media_file_not_in_package"));
    assert.equal(report.fontResolution.length, 3);
    assert.ok(report.fontResolution.every((f) => f.substituted === false && f.usedFamily === "Inter"));
    assert.throws(() => registerInspectedPackage(report), (err) => err.code === "TEMPLATE_NOT_CERTIFIED");
    assert.equal(listCertifiedTemplates().filter((t) => t.id === "mpp.feed.editorial").length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a client certified flag and a jpeg master cannot register", async () => {
  const dir = await mkdtemp(`${tmpdir()}/mpp-bad-master-`);
  try {
    await exportRegistryTemplateToPackage("mpp.feed.editorial", dir);
    await mkdir(`${dir}/reference`);
    await writeFile(`${dir}/reference/master-reference.png`, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const claim = JSON.parse(await readFile(`${dir}/certification/certification.json`, "utf8"));
    claim.status = "certified";
    await writeFile(`${dir}/certification/certification.json`, JSON.stringify(claim));
    const report = await inspectTemplatePackage(dir);
    assert.equal(report.masterReferenceInfo.format, "jpeg");
    assert.ok(report.blockers.some((b) => b.reason === "master_reference_is_not_a_png"));
    assert.ok(report.blockers.some((b) => b.reason === "client_certification_claim_rejected"));
    assert.equal(report.status, "not_certified");
    assert.throws(() => registerInspectedPackage(report));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("archive inspection rejects traversal and leaves the founder reel unregistered", async () => {
  assert.throws(
    () => assertSafeZipEntries(["ok/template.json", "../secrets.env"]),
    (err) => err.code === "TEMPLATE_INVALID_SPECIFICATION" && err.details.reason === "path_traversal",
  );
  const zip = "/Users/littchel/Documents/Platforms/MyPilotPost/AI Studio Templates/test/myPilotPost_tpl_reel_meet_founder_v1.zip";
  const report = await inspectTemplateArchive(zip);
  assert.equal(report.templateId, "tpl_reel_meet_founder_01");
  assert.equal(report.status, "not_certified");
  assert.equal(listCertifiedTemplates().some((t) => t.id === "tpl_reel_meet_founder_01"), false);
  await rm(report.extractedTo, { recursive: true, force: true });
});

test("editorial text fit, fonts, and media scores use the registered specification", () => {
  const template = getCertifiedTemplate("mpp.feed.editorial");
  const slots = Object.fromEntries(template.slides[0].slots.map((s) => [s.id, s]));
  const fill = (slot, word) => {
    let text = "";
    while ((`${text} ${word}`).trim().length <= slot.maxCharacters) text = (`${text} ${word}`).trim();
    return text;
  };
  assert.equal(fitText("Hi", slots.headline).action, "render");
  assert.equal(fitText("A clear offer for this week", slots.headline).action, "render");
  const headlineBoundary = fill(slots.headline, "North");
  assert.equal(fitText(headlineBoundary, slots.headline).action, "render");
  assert.equal(fitText(`${headlineBoundary} x`, slots.headline).action, "reject");
  assert.equal(fitText("Supercalifragilisticexpialidocious", slots.body).action, "render");
  assert.equal(fitText("X".repeat(200), slots.body).action, "reject");
  const boundary = fill(slots.body, "north");
  assert.equal(fitText(boundary, slots.body).text, boundary);
  assert.equal(fitText("Save 20% today.", slots.cta).action, "render");
  assert.equal(fitText("Book a complimentary strategy call", slots.cta).action, "reject");
  const fonts = resolveTemplateFonts(template);
  assert.deepEqual(fonts.map((f) => [f.purpose, f.usedWeight, f.substituted]), [
    ["mpp.feed.editorial:headline", 700, false],
    ["mpp.feed.editorial:body", 400, false],
    ["mpp.feed.editorial:cta", 600, false],
  ]);
  assert.throws(() => resolveFontUse({ family: "Inter", weight: 800, purpose: "headline" }), (err) => err.code === "TEMPLATE_FONT_UNAVAILABLE");

  const hero = slots.hero;
  const suitable = scoreMediaDesign({ width: 1600, height: 1200, focalPoint: { x: 0.5, y: 0.4 }, subjectSide: "top" }, hero);
  const unsuitable = scoreMediaDesign({ width: 800, height: 1600, focalPoint: { x: 0.5, y: 0.4 } }, hero);
  const lowRes = scoreMediaDesign({ width: 200, height: 150, focalPoint: { x: 0.5, y: 0.4 } }, hero);
  const edge = scoreMediaDesign({ width: 1600, height: 1200, focalPoint: { x: 0.02, y: 0.02 } }, hero);
  const subjectInText = scoreMediaDesign({ width: 1600, height: 1200, focalPoint: { x: 0.5, y: 0.4 }, subjectSide: "bottom" }, hero);
  assert.ok(suitable.score > unsuitable.score);
  assert.ok(suitable.reasons.includes("aspect_match"));
  assert.ok(unsuitable.reasons.includes("aspect_mismatch"));
  assert.ok(lowRes.score <= suitable.score);
  assert.ok(edge.reasons.includes("focal_conflict"));
  assert.ok(subjectInText.reasons.includes("subject_in_text_zone"));
  assert.equal(hero.required, true);
  assert.ok(lowRes.reasons.includes("below_slot_resolution"));
  assert.equal(fitText("こんにちは", slots.body).reason, "glyph_missing");
});

test("canonical editorial renders stay brand-isolated and publishing uses that png", async () => {
  const photo = solidPng(1200, 900, 20, 120, 80);
  const logoA = `data:image/png;base64,${solidPng(160, 48, 10, 10, 200).toString("base64")}`;
  const logoB = `data:image/png;base64,${solidPng(80, 80, 200, 20, 20).toString("base64")}`;
  const image = `data:image/png;base64,${photo.toString("base64")}`;
  const puts = [];
  const envA = brandEnv({
    name: "Brand A", primary: "#112233", secondary: "#445566", accent: "#aa3377", logo: logoA,
    bucket: { put: async (key, body) => puts.push({ key, body }) },
  });
  const envB = brandEnv({ name: "Brand B", primary: "#ddeeff", secondary: "#101010", accent: "#33aa77", logo: logoB });
  const pngA = await renderTemplateFlat("mpp.feed.editorial", { ...COPY, image }, "brand-a", envA);
  const pngB = await renderTemplateFlat("mpp.feed.editorial", { ...COPY, image }, "brand-b", envB);
  assert.deepEqual(pngSize(pngA), { width: 1080, height: 1350 });
  assert.deepEqual(pngSize(pngB), { width: 1080, height: 1350 });
  assert.notEqual(Buffer.from(pngA).toString("base64"), Buffer.from(pngB).toString("base64"));
  assert.ok(pngA.fontResolution.every((f) => f.substituted === false));
  const preview = await renderPreviewBuffer({ brandId: "brand-a", templateId: "mpp.feed.editorial", ...COPY, imageUrl: image }, envA);
  assert.deepEqual(pngSize(preview), { width: 1080, height: 1350 });
  const key1 = computePreviewR2Key("brand-a", "mpp.feed.editorial", "A", COPY.headline, COPY.body, COPY.cta, image);
  const key2 = computePreviewR2Key("brand-a", "mpp.feed.editorial", "A", "Changed headline", COPY.body, COPY.cta, image);
  assert.notEqual(key1, key2);
  const delivered = await generateFinalAsset({
    template_id: "mpp.feed.editorial",
    slides: [{ ...COPY, image }],
  }, "brand-a", "instagram", "job-editorial", envA);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].key, "deliveries/job-editorial/0.png");
  assert.equal(Buffer.from(puts[0].body).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(delivered.asset_urls[0], "http://test.local/api/media/file/deliveries/job-editorial/0.png");
  assert.equal(delivered.template_id, "mpp.feed.editorial");
  await assert.rejects(
    () => generateFinalAsset({ template_id: "tpl_feed_generic_default", slides: [COPY] }, "brand-a", "instagram", "job-x", envA),
    (err) => err.code === "TEMPLATE_NOT_CERTIFIED",
  );
  await assert.rejects(
    () => renderPreviewBuffer({ brandId: "brand-a", templateId: "tpl_reel_meet_founder_01", ...COPY }, envA),
    (err) => err.code === "TEMPLATE_NOT_CERTIFIED",
  );
  assert.throws(
    () => requireCertifiedTemplate("not-a-template"),
    (err) => err.code === "TEMPLATE_NOT_CERTIFIED",
  );
  const outDir = new URL("./acceptance-output/", import.meta.url);
  await mkdir(outDir, { recursive: true });
  await writeFile(new URL("mpp.feed.editorial-brand-a.png", outDir), Buffer.from(pngA));
  await writeFile(new URL("mpp.feed.editorial-brand-b.png", outDir), Buffer.from(pngB));
  const again = await renderTemplateFlat("mpp.feed.editorial", { ...COPY, image }, "brand-a", envA);
  assert.equal(createHash("sha256").update(Buffer.from(pngA)).digest("hex"), createHash("sha256").update(Buffer.from(again)).digest("hex"));
});

test("meet-the-founder poster is not the editorial master", async () => {
  const source = "/Users/littchel/Documents/Platforms/MyPilotPost/AI Studio Templates/test/Untitled design (1).png";
  const bytes = await readFile(source);
  assert.equal(bytes.readUInt32BE(16), 1080);
  assert.equal(bytes.readUInt32BE(20), 1920);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "04a2fc2162726152bb7deca6155bd52bc9ff994765397d17d4a8c2b3200ad1bf");
  const dir = await mkdtemp(`${tmpdir()}/mpp-founder-poster-`);
  try {
    await exportRegistryTemplateToPackage("mpp.feed.editorial", dir);
    await mkdir(`${dir}/reference`);
    await writeFile(`${dir}/reference/master-reference.png`, bytes);
    const report = await inspectTemplatePackage(dir);
    assert.ok(report.blockers.some((b) => b.reason === "master_reference_dimensions_do_not_match_canvas"));
    assert.equal(report.status, "not_certified");
    assert.equal(listCertifiedTemplates().some((t) => t.id === "tpl_reel_meet_founder_01"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("proposed master is a 1080x1920 photograph and is not approved", async () => {
  const source = "/Users/littchel/Documents/Platforms/MyPilotPost/AI Studio Templates/test/Untitled design (2).png";
  const bytes = await readFile(source);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), 1080);
  assert.equal(bytes.readUInt32BE(20), 1920);
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash, "133ea8596ab88827249d6248900e1485cc9505c748ab4ebd48dcb34c5e6d4c36");
  const dir = await mkdtemp(`${tmpdir()}/mpp-proposed-master-`);
  try {
    await exportRegistryTemplateToPackage("mpp.feed.editorial", dir);
    await mkdir(`${dir}/reference`);
    await writeFile(`${dir}/reference/master-reference.png`, bytes);
    const claim = JSON.parse(await readFile(`${dir}/certification/certification.json`, "utf8"));
    claim.status = "certified";
    await writeFile(`${dir}/certification/certification.json`, JSON.stringify(claim));
    const report = await inspectTemplatePackage(dir);
    assert.equal(report.masterReferenceInfo.format, "png");
    assert.equal(report.masterReferenceInfo.width, 1080);
    assert.equal(report.masterReferenceInfo.height, 1920);
    assert.ok(report.blockers.some((b) => b.reason === "master_reference_dimensions_do_not_match_canvas"));
    assert.ok(report.blockers.some((b) => b.reason === "client_certification_claim_rejected"));
    assert.equal(report.status, "not_certified");
    assert.equal(report.selectable, false);
    assert.throws(() => registerInspectedPackage(report), (err) => err.code === "TEMPLATE_NOT_CERTIFIED");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cover crop follows the focal point and rejects a small image", async () => {
  const wide = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: { r: 220, g: 20, b: 20 } },
  }).png().toBuffer();
  const blue = await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: { r: 20, g: 40, b: 220 } },
  }).png().toBuffer();
  const split = await sharp(wide).composite([{ input: blue, left: 1000, top: 0 }]).png().toBuffer();
  const slot = { id: "hero", width: 952, height: 620, focalPoint: { x: 0.9, y: 0.4 } };
  const right = coverExtractRect(2000, 1000, slot.width, slot.height, slot.focalPoint);
  const left = coverExtractRect(2000, 1000, slot.width, slot.height, { x: 0, y: 0.4 });
  assert.equal(left.left, 0);
  assert.ok(right.left > left.left);
  assert.equal(right.left, 2000 - right.width);
  const env = brandEnv({ name: "Brand A", primary: "#112233", secondary: "#445566", accent: "#aa3377" });
  const image = `data:image/png;base64,${split.toString("base64")}`;
  const png = await renderTemplateFlat("mpp.feed.editorial", { ...COPY, image }, "brand-a", env);
  const sample = await sharp(Buffer.from(png)).extract({ left: 860, top: 300, width: 1, height: 1 }).raw().toBuffer();
  assert.ok(sample[2] > sample[0], `expected a blue crop, got ${[...sample]}`);
  const small = `data:image/png;base64,${solidPng(400, 300, 10, 10, 10).toString("base64")}`;
  await assert.rejects(
    () => renderTemplateFlat("mpp.feed.editorial", { ...COPY, image: small }, "brand-a", env),
    (err) => err.code === "TEMPLATE_MEDIA_UNAVAILABLE" && err.details.reason === "below_slot_resolution",
  );
});
