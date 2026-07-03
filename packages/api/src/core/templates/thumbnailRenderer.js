// Headless Thumbnail Renderer with dynamic runtime loading & Cloudflare compatibility
let sharp = null;
try {
  // Use variable to mask static bundling analyzers (e.g. esbuild/wrangler)
  const libName = "sharp";
  sharp = (await import(libName)).default;
} catch (e) {
  // sharp native library is not available in this environment (e.g. Cloudflare Workers V8 isolate)
}

/**
 * Headless Thumbnail Renderer for AI Content Studio opportunities and templates.
 * 
 * @param {Object} templateSchema The layout template schema definition.
 * @param {Object} slotData Content values, e.g. { headline, body, image_url }.
 * @param {Object} brandVariables Visual DNA rules, e.g. { primary_color, logo_url }.
 * @returns {Promise<Buffer>} Returns a PNG/SVG image buffer.
 */
export async function generateOpportunityThumbnail(templateSchema, slotData, brandVariables) {
  const format = templateSchema?.format || 'feed_post';
  const isFeed = format === 'feed_post' || format === 'single_image' || !format.includes('carousel');
  const width = isFeed ? 400 : 300;
  const height = 400;

  const primaryColor = brandVariables?.primary_color || '#1A73E8';
  const logoUrl = brandVariables?.logo_url || null;
  const imageUrl = slotData?.image_url || null;
  const headline = slotData?.headline || slotData?.text || '';

  const maxLineLen = isFeed ? 22 : 16;
  const wrappedLines = wrapText(headline, maxLineLen);
  const textH = wrappedLines.length * 30;
  const startY = Math.max(40, (height - textH) / 2 + 10);

  const tspanLines = wrappedLines.map((line, idx) => {
    return `<tspan x="${width / 2}" dy="${idx === 0 ? 0 : '1.2em'}">${escapeXml(line)}</tspan>`;
  }).join('');

  // 1. Fallback to pure SVG buffer if sharp is not available (Cloudflare Workers)
  if (!sharp) {
    const pureSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${primaryColor}" />
        <style>
          .headline {
            fill: #FFFFFF;
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 22px;
            font-weight: 800;
            text-anchor: middle;
          }
        </style>
        <text y="${startY}" class="headline">
          ${tspanLines}
        </text>
      </svg>
    `;
    return Buffer.from(pureSvg);
  }

  // 2. Perform native sharp compositing if available
  let baseImage = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: primaryColor
    }
  });

  const composites = [];

  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const resizedImg = await sharp(imgBuffer)
          .resize(width, height, { fit: 'cover' })
          .toBuffer();
        
        composites.push({
          input: resizedImg,
          top: 0,
          left: 0
        });

        const overlay = Buffer.from(`
          <svg width="${width}" height="${height}">
            <rect x="0" y="0" width="${width}" height="${height}" fill="#000000" opacity="0.4" />
          </svg>
        `);
        composites.push({
          input: overlay,
          top: 0,
          left: 0
        });
      }
    } catch (err) {
      console.warn('[THUMBNAIL_RENDERER] Failed to fetch image_url, falling back to solid background:', err.message);
    }
  }

  if (logoUrl) {
    try {
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
        const logoResized = await sharp(logoBuffer)
          .resize({ width: 80, height: 40, fit: 'inside' })
          .toBuffer();

        const metadata = await sharp(logoResized).metadata();
        const logoW = metadata.width || 80;
        const logoH = metadata.height || 40;

        composites.push({
          input: logoResized,
          top: height - logoH - 15,
          left: width - logoW - 15
        });
      }
    } catch (err) {
      console.warn('[THUMBNAIL_RENDERER] Failed to fetch brand logo:', err.message);
    }
  }

  const textOverlaySvg = `
    <svg width="${width}" height="${height}">
      <style>
        .headline {
          fill: #FFFFFF;
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 22px;
          font-weight: 800;
          text-anchor: middle;
        }
      </style>
      <text y="${startY}" class="headline">
        ${tspanLines}
      </text>
    </svg>
  `;

  composites.push({
    input: Buffer.from(textOverlaySvg),
    top: 0,
    left: 0
  });

  const finalBuffer = await baseImage
    .composite(composites)
    .png()
    .toBuffer();

  return finalBuffer;
}

function escapeXml(unsafe) {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function wrapText(text, maxCharsPerLine) {
  const words = (text || '').split(/\s+/);
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if (!word) continue;
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines.slice(0, 6);
}
