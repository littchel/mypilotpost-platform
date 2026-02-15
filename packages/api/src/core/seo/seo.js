// packages/api/src/core/seo/seo.js
import { json } from "../../lib/json.js";

export async function analyzeKeywords() {
  return json({ keywords: [] });
}

export async function analyzeSEO() {
  return json({ score: 0 });
}

export async function brandSEOReport() {
  return json({ report: [] });
}
