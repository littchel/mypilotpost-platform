import { CANDIDATE_TEMPLATES } from "./catalogue.js";
import { certifyTemplate, LEGACY_TEMPLATE_IDS } from "./certify.js";
import { templateError, TEMPLATE_NOT_CERTIFIED } from "./errors.js";

const certified = new Map();
const seen = new Set();

for (const candidate of CANDIDATE_TEMPLATES) {
  if (seen.has(candidate.id)) {
    throw new Error(`Duplicate template id: ${candidate.id}`);
  }
  seen.add(candidate.id);
  const result = certifyTemplate(candidate);
  if (!result.ok) {
    throw new Error(`Template ${candidate.id} failed certification: ${result.errors.join("; ")}`);
  }
  certified.set(candidate.id, Object.freeze(result.template));
}

export function listCertifiedTemplates() {
  return [...certified.values()];
}

export function getCertifiedTemplate(id) {
  if (!id || LEGACY_TEMPLATE_IDS.has(id)) return null;
  return certified.get(id) || null;
}

export function requireCertifiedTemplate(id) {
  const template = getCertifiedTemplate(id);
  if (!template) {
    throw templateError(TEMPLATE_NOT_CERTIFIED, `TEMPLATE_NOT_CERTIFIED: ${id || "missing"}`);
  }
  return template;
}

export function isCertifiedTemplateId(id) {
  return certified.has(id);
}
