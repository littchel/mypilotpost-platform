/**
 * myPilotPost — Content & Connection Resolver
 * File: packages/api/src/core/delivery/resolver.js
 * 
 * RESPONSIBILITIES:
 * - Hydrate full content object (text, media, metadata)
 * - Fetch and decrypt platform connection tokens
 * - Enforce Brand isolation
 */

import { getDB } from "../../lib/db.js";
import { decrypt } from "../../lib/crypto.js";
import { ensureValidConnection } from "../../integrations/refresh_manager.js";
import { getTemplate } from "../templates/templateStore.js";
import { renderTemplateFlat, renderTemplateSlides } from "../templates/flattenRenderer.js";
import { resolveBrandBindings } from "../branding/resolveBrandBindings.js";

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

async function validateAndLogMedia(db, brand_id, mediaItems, env) {
  if (!mediaItems || mediaItems.length === 0) return mediaItems;

  return Promise.all(mediaItems.map(async (item) => {
    if (!item.preview_url) return item;

    // Direct R2 bucket bypass validation to avoid Cloudflare HTTP loopback 522 timeouts
    if (item.provider === 'direct' && env?.MEDIA_BUCKET) {
      const r2Key = item.r2_key || item.external_id;
      try {
        const obj = await env.MEDIA_BUCKET.head(r2Key);
        if (obj) {
          const contentType = obj.httpMetadata?.contentType || 'image/jpeg';
          const contentLength = obj.size || 0;
          db.prepare(`
            INSERT INTO media_validations (media_id, brand_id, url, status_code, content_type, content_length, is_public, validated_at)
            VALUES (?, ?, ?, 200, ?, ?, 1, CURRENT_TIMESTAMP)
          `).bind(item.id || null, brand_id, item.preview_url, contentType, contentLength).run().catch(() => {});
          return { ...item, validation_status: 'valid' };
        } else {
          db.prepare(`
            INSERT INTO media_validations (media_id, brand_id, url, status_code, content_type, content_length, is_public, validated_at, error)
            VALUES (?, ?, ?, 404, null, null, 0, CURRENT_TIMESTAMP, 'R2_OBJECT_NOT_FOUND')
          `).bind(item.id || null, brand_id, item.preview_url).run().catch(() => {});
          throw new Error(`MEDIA_URL_INACCESSIBLE: ${item.preview_url} (R2 key not found)`);
        }
      } catch (err) {
        if (err.message.startsWith('MEDIA_URL_INACCESSIBLE')) throw err;
        db.prepare(`
          INSERT INTO media_validations (media_id, brand_id, url, status_code, content_type, content_length, is_public, validated_at, error)
          VALUES (?, ?, ?, 500, null, null, 0, CURRENT_TIMESTAMP, ?)
        `).bind(item.id || null, brand_id, item.preview_url, err.message).run().catch(() => {});
        return { ...item, validation_status: 'validation_failed' };
      }
    }

    try {
      const res = await fetch(item.preview_url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'facebookexternalhit/1.1' },
        signal: AbortSignal.timeout(8000),
      });
      const validation_status = res.ok ? 'valid' : `http_${res.status}`;
      // Log to media_validations table (fire-and-forget)
      db.prepare(`
        INSERT INTO media_validations (media_id, brand_id, url, status_code, content_type, content_length, is_public, validated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        item.id || null, brand_id, item.preview_url, res.status,
        res.headers.get('content-type') || null,
        parseInt(res.headers.get('content-length') || '0') || null,
        res.ok ? 1 : 0,
      ).run().catch(() => {});

      if (res.status >= 400 && res.status < 500) {
        console.warn(`RESOLVER: Media URL returned ${res.status} — ${item.preview_url}`);
        throw new Error(`MEDIA_URL_INACCESSIBLE: ${item.preview_url} returned HTTP ${res.status}`);
      }
      return { ...item, validation_status };
    } catch (err) {
      if (err.message.startsWith('MEDIA_URL_INACCESSIBLE')) throw err;
      // Network errors are transient — log and continue
      console.warn(`RESOLVER: Media validation failed (transient) — ${err.message}`);
      return { ...item, validation_status: 'validation_failed' };
    }
  }));
}

/**
 * Resolves all data needed for an adapter to publish.
 * Returns: { content, connection }
 */
export async function resolveDeliveryData(env, job) {
  const db = getDB(env);
  const secret = env.ENCRYPTION_SECRET;
  
  if (!secret) throw new Error("ENCRYPTION_SECRET_MISSING");

  // 1. Resolve Content (Social or Blog)
  const contentTable = job.content_type === 'blog' ? 'blog_posts' : 'social_assets';
  const queryPlatform = job.platform.startsWith("instagram") ? "instagram" : (job.platform.startsWith("facebook") ? "facebook" : job.platform);
  const asset = await db.prepare(`
    SELECT sa.*, sv.caption, sv.hashtags
    FROM ${contentTable} sa
    LEFT JOIN social_variants sv ON sv.social_asset_id = sa.id AND (sv.platform = ? OR sv.platform = ?)
    WHERE sa.id = ? AND sa.brand_id = ?
    ORDER BY CASE WHEN sv.platform = ? THEN 0 ELSE 1 END ASC
    LIMIT 1
  `).bind(job.platform, queryPlatform, job.content_id, job.brand_id, job.platform).first();

  if (!asset) throw new Error(`CONTENT_NOT_FOUND: ${job.content_id}`);

  // 2. Resolve Media
  const { results: media } = await db.prepare(`
    SELECT ma.id, ma.preview_url, ma.provider, ma.mime_type, ma.external_id, ma.width, ma.height, ma.duration_seconds, l.position, l.role
    FROM content_media_links l
    JOIN media_assets ma ON ma.id = l.media_id
    WHERE l.content_id = ? AND l.brand_id = ?
    ORDER BY l.position ASC
  `).bind(job.content_id, job.brand_id).all();

  // 3. Resolve Connection (canonical table: social_connections)
  const connection = await db.prepare(`
    SELECT
      id,
      platform,
      account_id,
      platform_username,
      access_token,
      refresh_token,
      expires_at,
      status,
      meta,
      selected_resource_id,
      selected_resource_name,
      resource_type
    FROM social_connections
    WHERE brand_id = ? AND platform = ? AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(job.brand_id, queryPlatform).first();

  if (!connection) throw new Error(`CONNECTION_NOT_FOUND: ${job.platform}`);

  // Preemptively refresh connection if it's expiring soon
  const validConnection = await ensureValidConnection(db, connection, env);
  if (validConnection.status !== 'active') {
    throw new Error(`CONNECTION_REFRESH_FAILED: Connection status is '${validConnection.status}'`);
  }

  // 4. Decrypt Token
  let access_token = null;
  try {
    access_token = await decrypt(validConnection.access_token, secret);
  } catch (err) {
    throw new Error(`TOKEN_DECRYPTION_FAILED: ${err.message}`);
  }

  // 5. Parse Metadata
  let metadata = {};
  if (connection.meta) {
    try {
      metadata = JSON.parse(connection.meta);
    } catch (e) {
      metadata = {};
    }
  }

  // Mark first item as primary so adapters can find it regardless of role/position values
  // Expose r2_key for direct assets so adapters can read from R2 without HTTP loopback
  const resolvedMedia = (media || []).map((m, i) => ({
    ...m,
    r2_key: m.provider === 'direct' ? m.external_id : null,
    role: m.role || (i === 0 ? 'primary' : 'secondary'),
  }));

  // Validate media URLs are publicly accessible before handing to adapters
  const validatedMedia = await validateAndLogMedia(db, job.brand_id, resolvedMedia, env);

  // Retrieve post metadata, layout_manifest, and template_id from content_vault
  const vaultItem = await db.prepare(
    `SELECT layout_manifest, template_id, metadata, title FROM content_vault WHERE id = ? AND brand_id = ?`
  ).bind(job.content_id, job.brand_id).first();

  let metadataObj = {};
  if (vaultItem?.metadata) {
    try {
      metadataObj = JSON.parse(vaultItem.metadata);
    } catch (e) {
      metadataObj = {};
    }
  }

  let manifest = null;
  if (vaultItem?.layout_manifest) {
    try {
      manifest = typeof vaultItem.layout_manifest === 'string'
        ? JSON.parse(vaultItem.layout_manifest)
        : vaultItem.layout_manifest;
    } catch (e) {
      console.warn("[RESOLVER] Failed to parse layout_manifest:", e);
    }
  }

  // Intercept and flatten visual template if layout_manifest is present
  if (manifest && manifest.template_id) {
    try {
      const template = getTemplate(manifest.template_id, manifest.template_variant || 'A');
      if (template) {
        const bindings = await resolveBrandBindings(job.brand_id, env);

        // Ensure manifest has at least one slide populated
        const inputSlides = (manifest.slides && manifest.slides.length > 0)
          ? manifest.slides
          : [{}];

        // Retrieve template slides list
        const templateSlidesList = template.slots && !template.slides
          ? []
          : (template.slides || template.stories || template.static_slides || template.carousel_slides || []);

        const renderCount = templateSlidesList.length > 0
          ? Math.min(inputSlides.length, templateSlidesList.length)
          : 1;

        // Render all slides
        const pngBuffers = await renderTemplateSlides(template, inputSlides, job.brand_id, env);
        
        const replacementMediaList = [];

        for (let idx = 0; idx < renderCount; idx++) {
          const pngBuffer = pngBuffers[idx];
          if (!pngBuffer) continue;

          const slide = inputSlides[idx] || {};
          const fallbackImg = resolvedMedia?.[idx]?.preview_url || resolvedMedia?.[0]?.preview_url || '';

          const flatContent = {
            headline: slide.headline || slide.text || (idx === 0 ? (vaultItem.title || asset.title) : '') || '',
            pre_headline: slide.pre_headline || '',
            body: slide.body || (idx === 0 ? (asset.caption || asset.text) : '') || '',
            cta: slide.cta || 'Learn More',
            handle: slide.handle || '@mypilotpost',
            image_url: slide.image_url || slide.media_url || fallbackImg
          };

          // Deterministic FNV-1a hash of the inputs
          const hashInput = JSON.stringify({
            template_id: manifest.template_id,
            variant: manifest.template_variant || 'A',
            slideIndex: idx,
            bindings,
            flatContent
          });
          const hash = fnv1a(hashInput);
          const r2Key = `renders/${job.content_id}-slide-${idx}-${hash}.png`;
          
          const publicBaseUrl = env.BASE_URL || 'https://api.mypilotpost.com';
          const expectedUrl = `${publicBaseUrl}/api/media/file/${r2Key}`;

          if (env.MEDIA_BUCKET) {
            // Check cache
            const existing = await env.MEDIA_BUCKET.head(r2Key).catch(() => null);
            if (existing) {
              console.log(`[RESOLVER] Reused existing flattened slide render: ${r2Key}`);
            } else {
              await env.MEDIA_BUCKET.put(r2Key, pngBuffer, {
                httpMetadata: { contentType: 'image/png' }
              });
              console.log(`[RESOLVER] Stored new flattened slide render in R2: ${r2Key}`);
            }
          }

          replacementMediaList.push({
            id: crypto.randomUUID(),
            preview_url: expectedUrl,
            mime_type: 'image/png',
            provider: 'direct',
            external_id: `${job.content_id}-slide-${idx}-${hash}.png`,
            r2_key: r2Key,
            role: idx === 0 ? 'primary' : 'secondary',
            validation_status: 'valid'
          });
        }

        if (replacementMediaList.length > 0) {
          // Replace validatedMedia completely with the flattened sequence of slides
          validatedMedia.length = 0;
          validatedMedia.push(...replacementMediaList);
        }
      }
    } catch (err) {
      console.error("[RESOLVER] Visual flattening pipeline encountered an error:", err);
    }
  }

  return {
    content: {
      id: asset.id,
      job_id: job.id,
      text: asset.caption || asset.text || asset.body, // Platform variant or body fallback
      title: asset.title,
      hashtags: asset.hashtags,
      media: validatedMedia,
      type: job.content_type,
      link: asset.link || asset.url || asset.destination_url || null,
      platform: job.platform,
      metadata: metadataObj
    },
    connection: {
      id: connection.id,
      platform: connection.platform,
      account_id: connection.account_id,
      account_name: connection.platform_username,
      access_token: access_token,
      metadata: metadata,
      selected_resource_id: connection.selected_resource_id,
      selected_resource_name: connection.selected_resource_name,
      resource_type: connection.resource_type
    }
  };
}
