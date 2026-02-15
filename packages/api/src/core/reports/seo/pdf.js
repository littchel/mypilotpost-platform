  /**
 * myPilotPost — SEO Audit PDF Generator
 * Cloudflare Workers SAFE
 *
 * Strategy:
 * - Accept rendered HTML string
 * - Extract meaningful text blocks
 * - Render using PDFKit (no browser, no DOM)
 */

import PDFDocument from "pdfkit";

/**
 * Convert SEO Audit HTML → PDF Buffer
 *
 * @param {string} html
 * @returns {Uint8Array}
 */
export async function generateSeoAuditPDF(html) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  const chunks = [];
  doc.on("data", chunk => chunks.push(chunk));
  doc.on("end", () => {});

  /* ======================================================
     BASIC STYLES
  ====================================================== */
  doc.font("Helvetica");
  doc.fontSize(12);
  doc.fillColor("#111827");

  /* ======================================================
     VERY IMPORTANT:
     Cloudflare Workers CANNOT render HTML.
     We extract readable content safely.
  ====================================================== */
  const text = extractTextFromHTML(html);

  /* ======================================================
     PAGINATED TEXT RENDER
  ====================================================== */
  text.forEach(block => {
    if (block.type === "h1") {
      doc.addPage();
      doc.fontSize(26).text(block.content, { align: "center" });
      doc.moveDown(2);
    }

    if (block.type === "h2") {
      doc.moveDown(1.5);
      doc.fontSize(18).text(block.content);
      doc.moveDown(0.5);
    }

    if (block.type === "h3") {
      doc.moveDown(1);
      doc.fontSize(14).text(block.content);
      doc.moveDown(0.25);
    }

    if (block.type === "p") {
      doc.fontSize(11).text(block.content, {
        lineGap: 4
      });
      doc.moveDown(0.5);
    }

    if (block.type === "li") {
      doc.fontSize(11).text(`• ${block.content}`, {
        indent: 12
      });
    }
  });

  doc.end();

  return new Uint8Array(Buffer.concat(chunks));
}

/* ======================================================
   VERY SAFE HTML TEXT EXTRACTION
   (NO REGEX HTML PARSER ANTI-PATTERN)
====================================================== */

function extractTextFromHTML(html) {
  const blocks = [];

  const lines = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .split(/\n/);

  for (const line of lines) {
    const clean = line
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) continue;

    if (line.includes("<h1")) {
      blocks.push({ type: "h1", content: clean });
    } else if (line.includes("<h2")) {
      blocks.push({ type: "h2", content: clean });
    } else if (line.includes("<h3")) {
      blocks.push({ type: "h3", content: clean });
    } else if (line.includes("<li")) {
      blocks.push({ type: "li", content: clean });
    } else {
      blocks.push({ type: "p", content: clean });
    }
  }

  return blocks;
}
