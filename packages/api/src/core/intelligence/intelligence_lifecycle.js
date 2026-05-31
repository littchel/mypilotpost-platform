/**
 * Intelligence Lifecycle System
 *
 * Each intelligence item has a lifecycle:
 *   new → unread → acknowledged | resolved | expired → archived
 *
 * Dashboard impression schedule (all offsets from first_shown_at):
 *   Impression 1 — immediately (login / session start)
 *   Impression 2 — +20 minutes
 *   Impression 3 — +50 minutes
 *   Impression 4 — +3 hours (final reminder)
 *
 * After max_dashboard_impressions reached: lifecycle_status = 'expired'
 * Dashboard visibility ends. Item remains in Brand Intelligence history.
 */

const MAX_IMPRESSIONS = 4;

// Minutes from first_shown_at when the Nth impression becomes eligible
// Index N means "after impression N has been recorded, show again at +M minutes"
const NEXT_SHOW_MINUTES = [
  20,  // after impression 1 → show at +20 min
  50,  // after impression 2 → show at +50 min
  180, // after impression 3 → show at +3 hours
];

function addMinutes(isoStr, mins) {
  return new Date(new Date(isoStr).getTime() + mins * 60 * 1000).toISOString();
}

function safeJSON(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

function hydrateItem(row) {
  return { ...row, evidence: safeJSON(row.evidence_json), is_notification: row.is_notification === 1 };
}

/* ── Dashboard eligibility query ─────────────────────────────────────────── */

const ELIGIBLE_WHERE = `
  brand_id = ?
  AND is_notification = 0
  AND dismissed_at IS NULL
  AND lifecycle_status NOT IN ('acknowledged', 'resolved', 'expired', 'archived')
  AND dashboard_impression_count < ?
  AND (next_dashboard_show_at IS NULL OR next_dashboard_show_at <= ?)
`;

/**
 * Returns the single highest-priority item eligible for the dashboard sidebar,
 * plus the total count of eligible items in the queue.
 *
 * Runs auto-resolve and expiry checks as side effects.
 */
export async function getDashboardItem(db, brandId) {
  const now = new Date().toISOString();

  // Side effects — run fire-and-forget style (errors are non-fatal)
  try { await expireMaxImpressionItems(db, brandId, now); } catch {}
  try { await runAutoResolve(db, brandId, now); } catch {}

  const item = await db.prepare(`
    SELECT * FROM brand_intelligence_queue
    WHERE ${ELIGIBLE_WHERE}
    ORDER BY priority_rank ASC, generated_at DESC
    LIMIT 1
  `).bind(brandId, MAX_IMPRESSIONS, now).first();

  const countRow = await db.prepare(`
    SELECT COUNT(*) as total FROM brand_intelligence_queue
    WHERE ${ELIGIBLE_WHERE}
  `).bind(brandId, MAX_IMPRESSIONS, now).first();

  return {
    item:           item ? hydrateItem(item) : null,
    eligible_count: countRow?.total || 0,
  };
}

/**
 * Record that an item was displayed on the dashboard sidebar.
 * Increments impression_count and calculates next_dashboard_show_at.
 * After MAX_IMPRESSIONS, item is expired from dashboard.
 */
export async function recordImpression(db, brandId, itemId) {
  const now = new Date().toISOString();

  const row = await db.prepare(`
    SELECT id, dashboard_impression_count, first_shown_at, lifecycle_status
    FROM brand_intelligence_queue
    WHERE id = ? AND brand_id = ? AND dismissed_at IS NULL
  `).bind(itemId, brandId).first();

  if (!row) return false;

  // Already in a terminal state — do not re-record
  if (['acknowledged', 'resolved', 'expired', 'archived'].includes(row.lifecycle_status)) return false;

  const prevCount    = row.dashboard_impression_count || 0;
  const newCount     = prevCount + 1;
  const firstShownAt = row.first_shown_at || now;

  let nextShowAt  = null;
  let newStatus   = 'unread';
  let expiresAt   = null;

  if (newCount < MAX_IMPRESSIONS) {
    // Schedule next impression from first_shown_at
    nextShowAt = addMinutes(firstShownAt, NEXT_SHOW_MINUTES[prevCount]);
  } else {
    // Hit the limit — expire from dashboard
    newStatus = 'expired';
    expiresAt = now;
  }

  await db.prepare(`
    UPDATE brand_intelligence_queue
    SET dashboard_impression_count = ?,
        first_shown_at             = COALESCE(first_shown_at, ?),
        last_shown_at              = ?,
        next_dashboard_show_at     = ?,
        lifecycle_status           = ?,
        dashboard_expires_at       = COALESCE(dashboard_expires_at, ?)
    WHERE id = ? AND brand_id = ?
  `).bind(newCount, firstShownAt, now, nextShowAt, newStatus, expiresAt, itemId, brandId).run();

  console.log(`[LIFECYCLE] impression #${newCount} brand=${brandId} item=${itemId} next=${nextShowAt || 'expired'}`);
  return true;
}

/**
 * Mark an item as acknowledged.
 * Called on any user interaction: CTA click, save, dismiss, plan, details open.
 * Immediately removes from dashboard reminder queue.
 */
export async function acknowledgeItem(db, brandId, itemId) {
  const now = new Date().toISOString();
  const { success } = await db.prepare(`
    UPDATE brand_intelligence_queue
    SET lifecycle_status       = 'acknowledged',
        acknowledged_at        = ?,
        next_dashboard_show_at = NULL
    WHERE id = ? AND brand_id = ?
      AND lifecycle_status NOT IN ('resolved', 'expired', 'archived')
  `).bind(now, itemId, brandId).run();
  console.log(`[LIFECYCLE] acknowledged brand=${brandId} item=${itemId}`);
  return !!success;
}

/* ── Internal helpers ────────────────────────────────────────────────────── */

async function expireMaxImpressionItems(db, brandId, now) {
  await db.prepare(`
    UPDATE brand_intelligence_queue
    SET lifecycle_status   = 'expired',
        dashboard_expires_at = ?
    WHERE brand_id = ?
      AND dashboard_impression_count >= ?
      AND lifecycle_status NOT IN ('acknowledged', 'resolved', 'expired', 'archived')
  `).bind(now, brandId, MAX_IMPRESSIONS).run();
}

/**
 * Detect when underlying issues are fixed and auto-resolve matching items.
 *
 * Supported patterns:
 *   - Platform connections (< 2 active) → now has >= 2 active connections
 *   - No publishing activity            → brand now has recent published content
 *   - No campaigns                      → brand now has at least 1 campaign
 */
async function runAutoResolve(db, brandId, now) {
  // ── 1. Platform connections ──────────────────────────────────────────────
  const platformRow = await db.prepare(`
    SELECT COUNT(DISTINCT platform) as total
    FROM social_connections
    WHERE brand_id = ? AND status = 'active'
  `).bind(brandId).first();

  if ((platformRow?.total || 0) >= 2) {
    await db.prepare(`
      UPDATE brand_intelligence_queue
      SET lifecycle_status = 'resolved', resolved_at = ?
      WHERE brand_id = ?
        AND module_id = 'platform_health'
        AND (title LIKE '%No Platform%'
             OR title LIKE '%not connected%'
             OR title LIKE '%no connection%'
             OR title LIKE '%Connect%Platform%')
        AND lifecycle_status NOT IN ('acknowledged', 'resolved', 'archived', 'expired')
    `).bind(now, brandId).run();
  }

  // ── 2. No publishing activity ────────────────────────────────────────────
  const publishRow = await db.prepare(`
    SELECT COUNT(*) as total FROM delivery_jobs
    WHERE brand_id = ? AND status = 'delivered'
      AND created_at >= datetime('now', '-30 days')
  `).bind(brandId).first();

  if ((publishRow?.total || 0) > 0) {
    await db.prepare(`
      UPDATE brand_intelligence_queue
      SET lifecycle_status = 'resolved', resolved_at = ?
      WHERE brand_id = ?
        AND (title LIKE '%No Publishing%'
             OR title LIKE '%Publishing Pipeline Is Empty%'
             OR title LIKE '%no publishing activity%'
             OR title LIKE '%no content published%')
        AND lifecycle_status NOT IN ('acknowledged', 'resolved', 'archived', 'expired')
    `).bind(now, brandId).run();
  }

  // ── 3. No campaigns ──────────────────────────────────────────────────────
  try {
    const campaignRow = await db.prepare(`
      SELECT COUNT(*) as total FROM campaigns WHERE brand_id = ?
    `).bind(brandId).first();

    if ((campaignRow?.total || 0) > 0) {
      await db.prepare(`
        UPDATE brand_intelligence_queue
        SET lifecycle_status = 'resolved', resolved_at = ?
        WHERE brand_id = ?
          AND module_id = 'campaign_intelligence'
          AND (title LIKE '%No Campaign%'
               OR title LIKE '%No Active Campaign%'
               OR title LIKE '%no campaigns%')
          AND lifecycle_status NOT IN ('acknowledged', 'resolved', 'archived', 'expired')
      `).bind(now, brandId).run();
    }
  } catch {
    // campaigns table may not exist in all environments — skip silently
  }
}
