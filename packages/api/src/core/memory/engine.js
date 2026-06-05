/**
 * myPilotPost — Memory Engine
 * Derives brand_memory entries from events.
 * Memory = reusable, high-level brand intelligence.
 * No inference. Only observation.
 *
 * Namespaces: brand | content | campaign | report | customer | scheduler | media
 */

import { getDB } from '../../lib/db.js';

async function upsertMemory(db, brandId, namespace, key, value, confidence, source) {
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO brand_memory (id, brand_id, namespace, key, value, confidence, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id, namespace, key) DO UPDATE SET
      value      = excluded.value,
      confidence = excluded.confidence,
      source     = excluded.source,
      updated_at = datetime('now')
  `).bind(id, brandId, namespace, key, JSON.stringify(value), confidence, source).run();
}

// Per-event memory derivations
const MEMORY_RULES = {

  content_published: async (db, { brandId, metadata }) => {
    if (metadata?.platform) {
      // Track preferred platform — increment platform count then resolve highest
      await incrementPlatformCount(db, brandId, metadata.platform);
    }
    if (metadata?.content_type) {
      await incrementContentTypeCount(db, brandId, metadata.content_type);
    }
  },

  content_approved: async (db, { brandId, metadata }) => {
    // Record that content was approved — confidence in style grows
    await upsertMemory(db, brandId, 'brand', 'has_approval_flow', true, 0.9, 'content_approved');
  },

  approval_requested: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'brand', 'uses_approval_workflow', true, 0.95, 'approval_requested');
  },

  report_opened: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'customer', 'report_engagement', 'active', 0.8, 'report_opened');
  },

  report_exported: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'customer', 'report_engagement', 'high', 0.9, 'report_exported');
  },

  media_selected: async (db, { brandId, metadata }) => {
    if (metadata?.provider) {
      await upsertMemory(db, brandId, 'media', 'preferred_provider', metadata.provider, 0.7, 'media_selected');
    }
    if (metadata?.orientation) {
      await upsertMemory(db, brandId, 'media', 'preferred_orientation', metadata.orientation, 0.7, 'media_selected');
    }
  },

  client_added: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'customer', 'has_clients', true, 1.0, 'client_added');
  },

  team_member_added: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'customer', 'is_team_account', true, 1.0, 'team_member_added');
  },

  audit_generated: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'brand', 'audit_generated', true, 1.0, 'audit_generated');
  },

  schedule_created: async (db, { brandId }) => {
    await upsertMemory(db, brandId, 'scheduler', 'uses_scheduler', true, 0.95, 'schedule_created');
  },

  playbook_completed: async (db, { brandId, metadata }) => {
    if (metadata?.playbook_id) {
      await upsertMemory(db, brandId, 'campaign', 'last_playbook', metadata.playbook_id, 0.8, 'playbook_completed');
    }
  },
};

async function incrementPlatformCount(db, brandId, platform) {
  // Store platform usage counts, then derive preferred_platform
  const key = `platform_count_${platform}`;
  const row = await db.prepare(`SELECT value FROM brand_memory WHERE brand_id=? AND namespace='brand' AND key=?`).bind(brandId, key).first().catch(() => null);
  const count = (parseFloat(row?.value || '0') || 0) + 1;
  await upsertMemory(db, brandId, 'brand', key, count, 1.0, 'content_published');

  // Derive preferred_platform from all platform counts
  const { results } = await db.prepare(`
    SELECT key, value FROM brand_memory WHERE brand_id=? AND namespace='brand' AND key LIKE 'platform_count_%'
  `).bind(brandId).all().catch(() => ({ results: [] }));

  if (results?.length) {
    const best = results.reduce((a, b) => {
      const va = parseFloat(JSON.parse(a.value) || 0);
      const vb = parseFloat(JSON.parse(b.value) || 0);
      return vb > va ? b : a;
    });
    const pf = best.key.replace('platform_count_', '');
    const total = results.reduce((s, r) => s + parseFloat(JSON.parse(r.value) || 0), 0);
    const conf  = total > 0 ? Math.min(0.95, 0.5 + (parseFloat(JSON.parse(best.value)) / total) * 0.5) : 0.5;
    await upsertMemory(db, brandId, 'brand', 'preferred_platform', pf, conf, 'content_published');
  }
}

async function incrementContentTypeCount(db, brandId, contentType) {
  const key = `content_type_count_${contentType}`;
  const row = await db.prepare(`SELECT value FROM brand_memory WHERE brand_id=? AND namespace='content' AND key=?`).bind(brandId, key).first().catch(() => null);
  const count = (parseFloat(row?.value || '0') || 0) + 1;
  await upsertMemory(db, brandId, 'content', key, count, 1.0, 'content_published');

  const { results } = await db.prepare(`
    SELECT key, value FROM brand_memory WHERE brand_id=? AND namespace='content' AND key LIKE 'content_type_count_%'
  `).bind(brandId).all().catch(() => ({ results: [] }));

  if (results?.length) {
    const best = results.reduce((a, b) => parseFloat(JSON.parse(b.value)) > parseFloat(JSON.parse(a.value)) ? b : a);
    const ct = best.key.replace('content_type_count_', '');
    await upsertMemory(db, brandId, 'content', 'top_content_type', ct, 0.8, 'content_published');
  }
}

export async function updateMemory(env, eventObj) {
  const { brandId, event } = eventObj;
  if (!brandId || !event) return;

  const rule = MEMORY_RULES[event];
  if (!rule) return;

  const db = getDB(env);
  await rule(db, eventObj).catch(e => console.error('[MEMORY ENGINE]', e.message));
}
