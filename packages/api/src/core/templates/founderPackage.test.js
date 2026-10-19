import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { listCertifiedTemplates } from "./registry.js";
import { inspectTemplatePackage } from "./packageIntake.js";

const execFileAsync = promisify(execFile);
const ZIP = "/Users/littchel/Documents/Platforms/MyPilotPost/AI Studio Templates/test/myPilotPost_tpl_reel_meet_founder_v1.zip";

test("founder reel package is inspected and stays uncertified", async () => {
  const dir = await mkdtemp(`${tmpdir()}/mpp-founder-`);
  try {
    await execFileAsync("unzip", ["-q", ZIP, "-d", dir]);
    const report = await inspectTemplatePackage(`${dir}/mypilotpost_tpl_reel_meet_founder_v1`);
    assert.equal(report.templateId, "tpl_reel_meet_founder_01");
    assert.equal(report.version, "1.0.0");
    assert.equal(report.outputType, "video");
    assert.equal(report.status, "not_certified");
    assert.equal(report.registered, false);
    assert.equal(report.selectable, false);
    assert.equal(report.masterReferenceInfo.format, "jpeg");
    assert.equal(report.masterReferenceInfo.width, 864);
    assert.equal(report.masterReferenceInfo.height, 1536);
    const codes = report.blockers.map((b) => `${b.code}:${b.reason}`);
    assert.ok(codes.some((c) => c.includes("package_certification_status_is_not_certified")));
    assert.ok(codes.some((c) => c.includes("output_type_video_or_reel_not_supported")));
    assert.ok(codes.some((c) => c.includes("master_reference_is_not_a_png")));
    assert.ok(codes.some((c) => c.includes("required_font_not_in_registry")));
    assert.ok(report.blockers.some((b) => b.role === "headline_primary" && b.requestedWeight === 800));
    assert.ok(report.blockers.some((b) => b.role === "brand_name" && b.requestedWeight === 500));
    assert.ok(report.blockers.some((b) => b.slotId === "founder_media"));
    assert.equal(listCertifiedTemplates().some((t) => t.id === "tpl_reel_meet_founder_01"), false);
    assert.equal(listCertifiedTemplates().some((t) => t.id === "mpp.feed.editorial"), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
