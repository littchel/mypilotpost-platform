/**
 * myPilotPost — Feature Engine
 * Converts raw events into aggregated features.
 * No inference. Aggregation only.
 *
 * Feature schema: (brand_id, feature, window) → value (JSON)
 * Windows: all_time | 7d | 30d | 90d
 */

import { getDB } from '../../lib/db.js';

const WINDOWS = ['all_time', '7d', '30d', '90d'];

// Map event → list of features to increment
const EVENT_FEATURE_MAP = {
  content_created:    ['content_volume'],
  content_saved:      ['content_volume'],
  content_published:  ['publishing_frequency', 'content_volume'],
  content_scheduled:  ['schedule_usage'],
  content_shared:     ['content_volume'],
  content_approved:   ['approval_rate_approved'],
  approval_requested: ['approval_rate_submitted'],
  approval_completed: ['approval_rate_approved'],
  report_opened:      ['report_usage'],
  report_exported:    ['report_usage'],
  media_selected:     ['media_usage'],
  team_member_added:  ['team_growth'],
  client_added:       ['client_growth'],
  audit_generated:    ['audit_usage'],
  schedule_created:   ['schedule_usage'],
  schedule_published: ['publishing_frequency'],
  playbook_completed: ['playbook_usage'],
};

async function upsertFeature(db, brandId, feature, window, increment = 1) {
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO memory_features (id, brand_id, feature, value, window, computed_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(brand_id, feature, window) DO UPDATE SET
      value      = json(CAST(CAST(json_extract(value, '$') AS REAL) + ? AS TEXT)),
      computed_at = datetime('now')
  `).bind(id, brandId, feature, JSON.stringify(increment), window, increment).run();
}

export async function updateFeatures(env, { brandId, event, metadata }) {
  if (!brandId || !event) return;
  const featuresToUpdate = EVENT_FEATURE_MAP[event];
  if (!featuresToUpdate) return;

  const db = getDB(env);

  for (const feature of featuresToUpdate) {
    for (const win of WINDOWS) {
      await upsertFeature(db, brandId, feature, win).catch(() => {});
    }
  }

  // Platform-specific publishing frequency
  if (event === 'content_published' && metadata?.platform) {
    const platformFeature = `publishing_frequency_${metadata.platform}`;
    for (const win of WINDOWS) {
      await upsertFeature(db, brandId, platformFeature, win).catch(() => {});
    }
  }

  // Media provider preference
  if (event === 'media_selected' && metadata?.provider) {
    const providerFeature = `media_usage_${metadata.provider}`;
    for (const win of WINDOWS) {
      await upsertFeature(db, brandId, providerFeature, win).catch(() => {});
    }
  }
}

export async function getFeatureValues(db, brandId, window = 'all_time') {
  const { results } = await db.prepare(`
    SELECT feature, value FROM memory_features
    WHERE brand_id = ? AND window = ?
    ORDER BY feature ASC
  `).bind(brandId, window).all();

  return Object.fromEntries((results || []).map(r => {
    try { return [r.feature, JSON.parse(r.value)]; } catch { return [r.feature, r.value]; }
  }));
}

export async function computeApprovalRate(db, brandId) {
  const submitted = await db.prepare(`
    SELECT value FROM memory_features WHERE brand_id=? AND feature='approval_rate_submitted' AND window='all_time'
  `).bind(brandId).first();
  const approved = await db.prepare(`
    SELECT value FROM memory_features WHERE brand_id=? AND feature='approval_rate_approved' AND window='all_time'
  `).bind(brandId).first();

  const sub = parseFloat(submitted?.value || '0');
  const app = parseFloat(approved?.value || '0');
  return sub > 0 ? Math.round((app / sub) * 100) / 100 : null;
}
