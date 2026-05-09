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
    SELECT ma.id, ma.preview_url, ma.provider, ma.mime_type, l.position, l.role
    FROM content_media_links l
    JOIN media_assets ma ON ma.id = l.media_id
    WHERE l.content_id = ? AND l.brand_id = ?
    ORDER BY l.position ASC
  `).bind(job.content_id, job.brand_id).all();

  // 3. Resolve Connection (Standard table: connected_accounts)
  const connection = await db.prepare(`
    SELECT 
      id, 
      provider, 
      provider_account_id, 
      provider_account_name,
      access_token_encrypted, 
      refresh_token_encrypted,
      metadata
    FROM connected_accounts
    WHERE brand_id = ? AND provider = ? AND status = 'active'
    LIMIT 1
  `).bind(job.brand_id, job.platform).first();

  if (!connection) throw new Error(`CONNECTION_NOT_FOUND: ${job.platform}`);

  // 4. Decrypt Token
  let access_token = null;
  try {
    access_token = await decrypt(connection.access_token_encrypted, secret);
  } catch (err) {
    throw new Error(`TOKEN_DECRYPTION_FAILED: ${err.message}`);
  }

  // 5. Parse Metadata
  let metadata = {};
  if (connection.metadata) {
    try {
      metadata = JSON.parse(connection.metadata);
    } catch (e) {
      metadata = {};
    }
  }

  return {
    content: {
      id: asset.id,
      text: asset.caption || asset.text, // Platform variant takes priority
      title: asset.title,
      hashtags: asset.hashtags,
      media: media || [],
      type: job.content_type
    },
    connection: {
      id: connection.id,
      platform: connection.provider,
      account_id: connection.provider_account_id,
      account_name: connection.provider_account_name,
      access_token: access_token,
      metadata: metadata
    }
  };
}
