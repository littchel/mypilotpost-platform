/**
 * myPilotPost — Brand Intelligence Store
 *
 * Manages the brand_intelligence_queue table:
 *   - Writes a full intelligence batch from a Groq response
 *   - Handles progressive delivery (reveals items across sessions)
 *   - Dismissal tracking
 *
 * DELIVERY POLICY:
 *   First call of session: deliver top 3 insights + 1 notification
 *   Subsequent calls:      deliver next 2 insights + 1 notification
 *   Already-delivered items are always returned for display.
 */

function safeJSON(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function priorityRank(p) {
  if (p === 'high' || p === 'critical') return 1;
  if (p === 'low') return 3;
  return 2;
}

const MODULE_ORDER = {
  platform_health:         0,
  growth_engine:           1,
  content_intelligence:    2,
  audience_intelligence:   3,
  competitive_moat:        4,
  seo_intelligence:        5,
  conversion_intelligence: 6,
  campaign_intelligence:   7,
};

/**
 * Persist a full Groq intelligence response to the queue.
 * Deletes all previous queue items for this brand first (daily replacement).
 */
export async function storeIntelligenceBatch(db, brandId, batchId, groqResult) {
  const generatedAt = new Date().toISOString();
  const modules = groqResult?.modules || {};
  const notifications = groqResult?.notifications || [];

  // Clear previous batch for this brand
  await db.prepare(`
    DELETE FROM brand_intelligence_queue WHERE brand_id = ?
  `).bind(brandId).run();

  const rows = [];

  // ── Insight rows ──────────────────────────────────────────────────────────
  for (const [moduleId, moduleData] of Object.entries(modules)) {
    const insights = moduleData?.insights || [];
    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];
      if (!insight?.title || !insight?.finding || !insight?.confidence || !insight?.recommended_action) {
        continue; // Skip incomplete items per spec
      }
      rows.push({
        id:                crypto.randomUUID(),
        brand_id:          brandId,
        batch_id:          batchId,
        module_id:         moduleId,
        category:          insight.category || moduleId,
        is_notification:   0,
        title:             insight.title,
        finding:           insight.finding,
        why_it_matters:    insight.why_it_matters || '',
        evidence_json:     JSON.stringify(insight.evidence || []),
        confidence:        insight.confidence,
        recommended_action: insight.recommended_action,
        expected_impact:   insight.expected_impact || '',
        priority:          insight.priority || 'medium',
        priority_rank:     priorityRank(insight.priority),
        notification_type: null,
        notification_body: null,
        notification_action: null,
        generated_at:      generatedAt,
      });
    }
  }

  // ── Notification rows ─────────────────────────────────────────────────────
  for (const notif of notifications) {
    if (!notif?.title || !notif?.body) continue;
    rows.push({
      id:                crypto.randomUUID(),
      brand_id:          brandId,
      batch_id:          batchId,
      module_id:         'notifications',
      category:          notif.type || 'opportunity',
      is_notification:   1,
      title:             notif.title,
      finding:           notif.body,
      why_it_matters:    '',
      evidence_json:     '[]',
      confidence:        'Observed + Inferred',
      recommended_action: notif.action || '',
      expected_impact:   '',
      priority:          notif.type === 'urgent' ? 'high' : notif.type === 'warning' ? 'medium' : 'low',
      priority_rank:     notif.type === 'urgent' ? 1 : notif.type === 'warning' ? 2 : 3,
      notification_type: notif.type,
      notification_body: notif.body,
      notification_action: notif.action,
      generated_at:      generatedAt,
    });
  }

  if (rows.length > 0) {
    const stmts = rows.map(row =>
      db.prepare(`
        INSERT INTO brand_intelligence_queue (
          id, brand_id, batch_id, module_id, category, is_notification,
          title, finding, why_it_matters, evidence_json, confidence,
          recommended_action, expected_impact, priority, priority_rank,
          notification_type, notification_body, notification_action, generated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        row.id, row.brand_id, row.batch_id, row.module_id, row.category, row.is_notification,
        row.title, row.finding, row.why_it_matters, row.evidence_json, row.confidence,
        row.recommended_action, row.expected_impact, row.priority, row.priority_rank,
        row.notification_type, row.notification_body, row.notification_action, row.generated_at
      )
    );
    await db.batch(stmts);
  }

  console.log(`[INTEL_STORE] Stored ${rows.length} items for brand=${brandId} batch=${batchId}`);
  return rows.length;
}

function hydrateItem(row) {
  return {
    ...row,
    evidence: safeJSON(row.evidence_json, []),
    is_notification: row.is_notification === 1,
  };
}

/**
 * Progressive delivery feed.
 * Returns already-delivered items + marks next batch as delivered.
 */
export async function getIntelligenceFeed(db, brandId) {
  // Find the current (most recent) batch
  const batchRow = await db.prepare(`
    SELECT batch_id, generated_at FROM brand_intelligence_queue
    WHERE brand_id = ? ORDER BY generated_at DESC LIMIT 1
  `).bind(brandId).first();

  if (!batchRow) {
    return { delivered: [], new_insights: [], pending_count: 0, notifications: [], batch_id: null, generated_at: null };
  }

  const { batch_id: batchId, generated_at } = batchRow;
  const now = new Date().toISOString();

  // ── Count already delivered insights ─────────────────────────────────────
  const countRow = await db.prepare(`
    SELECT COUNT(*) as total FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND delivered_at IS NOT NULL AND is_notification = 0
  `).bind(brandId, batchId).first();
  const alreadyDeliveredCount = countRow?.total || 0;

  // First visit gets 3 items, subsequent visits get 2
  const deliverCount = alreadyDeliveredCount === 0 ? 3 : 2;

  // ── Fetch already-delivered insights ──────────────────────────────────────
  const { results: delivered } = await db.prepare(`
    SELECT * FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND delivered_at IS NOT NULL AND dismissed_at IS NULL AND is_notification = 0
    ORDER BY priority_rank ASC, created_at ASC
  `).bind(brandId, batchId).all();

  // ── Fetch next undelivered insights ───────────────────────────────────────
  const { results: toDeliver } = await db.prepare(`
    SELECT * FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND delivered_at IS NULL AND dismissed_at IS NULL AND is_notification = 0
    ORDER BY priority_rank ASC, created_at ASC
    LIMIT ?
  `).bind(brandId, batchId, deliverCount).all();

  if (toDeliver.length > 0) {
    for (const item of toDeliver) {
      await db.prepare(`UPDATE brand_intelligence_queue SET delivered_at = ? WHERE id = ?`).bind(now, item.id).run();
    }
  }

  // ── Notifications: fetch delivered + deliver 1 new ────────────────────────
  const { results: newNotifs } = await db.prepare(`
    SELECT * FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND delivered_at IS NULL AND is_notification = 1
    ORDER BY priority_rank ASC LIMIT 1
  `).bind(brandId, batchId).all();

  if (newNotifs.length > 0) {
    await db.prepare(`UPDATE brand_intelligence_queue SET delivered_at = ? WHERE id = ?`).bind(now, newNotifs[0].id).run();
  }

  const { results: allNotifs } = await db.prepare(`
    SELECT * FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND delivered_at IS NOT NULL AND dismissed_at IS NULL AND is_notification = 1
    ORDER BY priority_rank ASC
  `).bind(brandId, batchId).all();

  // ── Pending count (after this delivery) ───────────────────────────────────
  const pendingRow = await db.prepare(`
    SELECT COUNT(*) as total FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND delivered_at IS NULL AND dismissed_at IS NULL AND is_notification = 0
  `).bind(brandId, batchId).first();
  const pendingCount = Math.max(0, (pendingRow?.total || 0));

  // ── Module summary (which modules have content) ────────────────────────────
  const { results: moduleSummary } = await db.prepare(`
    SELECT module_id,
           COUNT(*) as total,
           SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) as delivered_count
    FROM brand_intelligence_queue
    WHERE brand_id = ? AND batch_id = ? AND is_notification = 0
    GROUP BY module_id
  `).bind(brandId, batchId).all();

  return {
    delivered:        delivered.map(hydrateItem),
    new_insights:     toDeliver.map(hydrateItem),
    notifications:    allNotifs.map(hydrateItem),
    new_notifications: newNotifs.map(hydrateItem),
    pending_count:    pendingCount,
    batch_id:         batchId,
    generated_at,
    module_summary:   moduleSummary || [],
  };
}

/**
 * Dismiss a single intelligence item.
 */
export async function dismissIntelligenceItem(db, brandId, itemId) {
  const { success } = await db.prepare(`
    UPDATE brand_intelligence_queue
    SET dismissed_at = datetime('now')
    WHERE id = ? AND brand_id = ?
  `).bind(itemId, brandId).run();
  return !!success;
}

/**
 * Check if a brand is eligible for intelligence generation.
 * Returns true if last generation was > 23 hours ago (or never).
 */
export async function isEligibleForGeneration(db, brandId) {
  const row = await db.prepare(`
    SELECT last_intelligence_run_at FROM brands WHERE id = ?
  `).bind(brandId).first();

  if (!row?.last_intelligence_run_at) return true;

  const lastRun = new Date(row.last_intelligence_run_at).getTime();
  const hoursSince = (Date.now() - lastRun) / (1000 * 60 * 60);
  return hoursSince >= 23;
}

/**
 * Mark generation as complete for a brand.
 */
export async function markGenerationComplete(db, brandId) {
  await db.prepare(`
    UPDATE brands SET last_intelligence_run_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(brandId).run();
}
