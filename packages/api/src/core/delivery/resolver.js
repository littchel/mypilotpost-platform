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

async function validateAndLogMedia(db, brand_id, mediaItems) {
  if (!mediaItems || mediaItems.length === 0) return mediaItems;

  return Promise.all(mediaItems.map(async (item) => {
    if (!item.preview_url) return item;
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
  const asset = await db.prepare(`
    SELECT sa.*, sv.caption, sv.hashtags
    FROM ${contentTable} sa
    LEFT JOIN social_variants sv ON sv.social_asset_id = sa.id AND sv.platform = ?
    WHERE sa.id = ? AND sa.brand_id = ?
  `).bind(job.platform, job.content_id, job.brand_id).first();

  if (!asset) throw new Error(`CONTENT_NOT_FOUND: ${job.content_id}`);

  // 2. Resolve Media
  const { results: media } = await db.prepare(`
    SELECT ma.id, ma.preview_url, ma.provider, ma.mime_type, ma.external_id, l.position, l.role
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
      meta
    FROM social_connections
    WHERE brand_id = ? AND platform = ? AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(job.brand_id, job.platform).first();

  if (!connection) throw new Error(`CONNECTION_NOT_FOUND: ${job.platform}`);

  // 4. Decrypt Token
  let access_token = null;
  try {
    access_token = await decrypt(connection.access_token, secret);
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
  const validatedMedia = await validateAndLogMedia(db, job.brand_id, resolvedMedia);

  return {
    content: {
      id: asset.id,
      text: asset.caption || asset.text, // Platform variant takes priority
      title: asset.title,
      hashtags: asset.hashtags,
      media: validatedMedia,
      type: job.content_type
    },
    connection: {
      id: connection.id,
      platform: connection.platform,
      account_id: connection.account_id,
      account_name: connection.platform_username,
      access_token: access_token,
      metadata: metadata
    }
  };
}
