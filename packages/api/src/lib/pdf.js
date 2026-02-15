import { renderTemplate } from "./template.js";

/**
 * Cloudflare-safe PDF rendering
 * (HTML → PDF via external renderer or future Queue)
 */
export async function renderPDF({ template, data, env }) {
  const html = await renderTemplate(template, data, env);

  /**
   * PHASE 2:
   * Return HTML as PDF-compatible payload
   * (Later: queue → headless renderer)
   */

  return new TextEncoder().encode(html);
}
