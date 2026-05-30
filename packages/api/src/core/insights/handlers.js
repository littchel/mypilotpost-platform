/**
 * GET /api/customer/insights/feed
 * Operational event feed — what happened, not what it means.
 * Sources: brand_memory_events, content_delivery_failures, campaigns,
 *          social_connections, growth_activity, seo_rank_history.
 * Zero overlap with /api/customer/intelligence/feed (Brand Intelligence).
 */

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function getInsightsFeed(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const [
    memoryEvents,
    deliveryFailures,
    campaignRows,
    platformRows,
    growthRows,
    seoRows,
    connectedCount,
    brandDnaRow,
    contentCount,
  ] = await Promise.all([
    db.prepare(`
      SELECT id, event_type, entity_type, entity_id, snapshot, created_at
      FROM brand_memory_events
      WHERE brand_id = ?
        AND event_type IN ('content_published','delivery_failed','content_performed','seo_rank_changed','campaign_completed')
      ORDER BY created_at DESC LIMIT 20
    `).bind(brand_id).all(),

    db.prepare(`
      SELECT f.id, f.platform, f.failure_type, f.failure_reason, f.failed_at
      FROM content_delivery_failures f
      INNER JOIN content_delivery_jobs j ON j.id = f.job_id
      WHERE j.brand_id = ?
      ORDER BY f.failed_at DESC LIMIT 8
    `).bind(brand_id).all(),

    db.prepare(`
      SELECT id, name, status, objective_type, updated_at
      FROM campaigns
      WHERE brand_id = ? AND status IN ('active','completed','paused')
      ORDER BY updated_at DESC LIMIT 8
    `).bind(brand_id).all(),

    db.prepare(`
      SELECT id, platform, status, expires_at, updated_at
      FROM social_connections
      WHERE brand_id = ?
      ORDER BY updated_at DESC LIMIT 12
    `).bind(brand_id).all(),

    db.prepare(`
      SELECT id, action_type, points_awarded, metadata, created_at
      FROM growth_activity
      WHERE brand_id = ?
      ORDER BY created_at DESC LIMIT 12
    `).bind(brand_id).all(),

    db.prepare(`
      SELECT id, keyword, rank, observed_at
      FROM seo_rank_history
      WHERE brand_id = ?
      ORDER BY observed_at DESC LIMIT 10
    `).bind(brand_id).all(),

    db.prepare(`
      SELECT COUNT(*) as total FROM social_connections
      WHERE brand_id = ? AND status = 'active'
    `).bind(brand_id).first(),

    db.prepare(`
      SELECT mission FROM brand_dna_profiles WHERE brand_id = ?
    `).bind(brand_id).first(),

    db.prepare(`
      SELECT COUNT(*) as total FROM social_assets WHERE brand_id = ?
    `).bind(brand_id).first(),
  ]);

  const items = [];

  // ── Publishing & SEO events from brand_memory_events ──────────────────
  for (const ev of (memoryEvents.results || [])) {
    const snap = safeJson(ev.snapshot);
    if (ev.event_type === "content_published") {
      items.push({
        id: `mem_${ev.id}`,
        category: "publishing",
        type: "win",
        title: `${cap(ev.entity_type || "Post")} published successfully`,
        body: `Your ${ev.entity_type || "content"} was published.`,
        created_at: ev.created_at,
      });
    } else if (ev.event_type === "delivery_failed") {
      items.push({
        id: `mem_${ev.id}`,
        category: "publishing",
        type: "alert",
        title: "Post failed to publish",
        body: `A delivery attempt failed for your ${ev.entity_type || "content"}.`,
        created_at: ev.created_at,
      });
    } else if (ev.event_type === "content_performed") {
      items.push({
        id: `mem_${ev.id}`,
        category: "publishing",
        type: "win",
        title: "Content performance update",
        body: snap?.engagement_rate
          ? `Engagement rate: ${snap.engagement_rate}%`
          : "New performance data available.",
        created_at: ev.created_at,
      });
    } else if (ev.event_type === "seo_rank_changed") {
      items.push({
        id: `mem_${ev.id}`,
        category: "seo",
        type: "info",
        title: snap?.keyword ? `Keyword ranking changed: "${snap.keyword}"` : "SEO ranking updated",
        body: snap?.rank ? `Now at position ${snap.rank}.` : "A keyword position changed.",
        created_at: ev.created_at,
      });
    } else if (ev.event_type === "campaign_completed") {
      items.push({
        id: `mem_${ev.id}`,
        category: "campaigns",
        type: "win",
        title: "Campaign completed",
        body: "A campaign reached its end date.",
        created_at: ev.created_at,
      });
    }
  }

  // ── Delivery failures (granular platform-level failures) ───────────────
  for (const f of (deliveryFailures.results || [])) {
    items.push({
      id: `fail_${f.id}`,
      category: "publishing",
      type: "alert",
      title: `Publishing failed on ${cap(f.platform || "platform")}`,
      body: f.failure_reason || `Delivery to ${cap(f.platform || "platform")} failed.`,
      created_at: f.failed_at,
    });
  }

  // ── Campaign status ────────────────────────────────────────────────────
  for (const c of (campaignRows.results || [])) {
    if (c.status === "active") {
      items.push({ id: `camp_${c.id}`, category: "campaigns", type: "info",  title: `Campaign launched: ${c.name}`,   body: `Your ${c.objective_type || ""} campaign is running.`, created_at: c.updated_at });
    } else if (c.status === "completed") {
      items.push({ id: `camp_${c.id}`, category: "campaigns", type: "win",   title: `Campaign completed: ${c.name}`,  body: "Campaign reached its end date.",                      created_at: c.updated_at });
    } else if (c.status === "paused") {
      items.push({ id: `camp_${c.id}`, category: "campaigns", type: "alert", title: `Campaign paused: ${c.name}`,     body: "This campaign has been paused.",                      created_at: c.updated_at });
    }
  }

  // ── Platform connection events ─────────────────────────────────────────
  const now = Date.now();
  for (const conn of (platformRows.results || [])) {
    const expiresMs = conn.expires_at ? new Date(conn.expires_at).getTime() : null;
    const daysLeft  = expiresMs ? Math.floor((expiresMs - now) / 86_400_000) : null;

    if (conn.status === "expired" || conn.status === "error") {
      items.push({ id: `plat_${conn.id}`, category: "platforms", type: "alert",
        title: `${cap(conn.platform)} token expired`,
        body: `Reconnect ${cap(conn.platform)} to resume publishing.`,
        created_at: conn.updated_at });
    } else if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 7) {
      items.push({ id: `plat_exp_${conn.id}`, category: "platforms", type: "alert",
        title: `${cap(conn.platform)} token expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        body: `Reconnect ${cap(conn.platform)} before your token expires to avoid interruptions.`,
        created_at: conn.updated_at });
    } else if (conn.status === "disconnected") {
      items.push({ id: `plat_${conn.id}`, category: "platforms", type: "alert",
        title: `${cap(conn.platform)} disconnected`,
        body: `Reconnect ${cap(conn.platform)} to resume publishing.`,
        created_at: conn.updated_at });
    } else if (conn.status === "active") {
      items.push({ id: `plat_${conn.id}`, category: "platforms", type: "info",
        title: `${cap(conn.platform)} connected`,
        body: `${cap(conn.platform)} is active and ready.`,
        created_at: conn.updated_at });
    }
  }

  // ── Growth milestones ──────────────────────────────────────────────────
  const GROWTH_LABELS = {
    content_published:       ["Content published — points earned", true],
    reward_redemption:       ["Reward redeemed",                   true],
    approval_granted:        ["Content approved",                  true],
    content_shared_whatsapp: ["Content shared on WhatsApp",        true],
    content_shared_social:   ["Content shared on social",          true],
    report_shared_client:    ["Report shared with client",         true],
    referral_shared:         ["Referral link shared",              false],
  };
  for (const g of (growthRows.results || [])) {
    const [label, isWin] = GROWTH_LABELS[g.action_type] || [g.action_type, false];
    items.push({
      id: `growth_${g.id}`,
      category: "growth",
      type: isWin ? "win" : "info",
      title: label,
      body: g.points_awarded > 0 ? `+${g.points_awarded} points earned.` : "",
      created_at: g.created_at,
    });
  }

  // ── SEO rank history ───────────────────────────────────────────────────
  const seen = {};
  for (const kw of (seoRows.results || [])) {
    const prev = seen[kw.keyword];
    let type = "info", body;
    if (prev !== undefined) {
      if (kw.rank < prev)      { type = "win";   body = `Moved up from #${prev} to #${kw.rank}.`; }
      else if (kw.rank > prev) { type = "alert"; body = `Dropped from #${prev} to #${kw.rank}.`;  }
      else                     {                  body = `Holding at position #${kw.rank}.`;       }
    } else {
      body = `Tracking at position #${kw.rank}.`;
    }
    seen[kw.keyword] = kw.rank;
    items.push({
      id: `seo_${kw.id}`,
      category: "seo",
      type,
      title: `Keyword: "${kw.keyword}"`,
      body,
      created_at: kw.observed_at,
    });
  }

  // ── Tasks — computed from system state ─────────────────────────────────
  const tasks = [];
  const connected = connectedCount?.total ?? 0;

  if (connected === 0) {
    tasks.push({ id: "task_platform",  category: "tasks", type: "task", title: "Connect a social platform",    body: "Connect at least one platform to start publishing.",                    priority: "high",   created_at: new Date().toISOString() });
  } else if (connected < 2) {
    tasks.push({ id: "task_platform2", category: "tasks", type: "task", title: "Connect a second platform",   body: "Connect another platform to unlock Brand Intelligence.",                 priority: "medium", created_at: new Date().toISOString() });
  }
  if (!brandDnaRow?.mission) {
    tasks.push({ id: "task_dna",       category: "tasks", type: "task", title: "Complete Brand DNA",           body: "Add your mission, vision, and brand voice to personalise AI content.", priority: "high",   created_at: new Date().toISOString() });
  }
  if ((contentCount?.total ?? 0) === 0) {
    tasks.push({ id: "task_content",   category: "tasks", type: "task", title: "Create your first post",       body: "Draft and publish your first piece of content.",                        priority: "medium", created_at: new Date().toISOString() });
  }

  items.push(...tasks);

  // Sort newest first, keeping tasks at top
  items.sort((a, b) => {
    if (a.type === "task" && b.type !== "task") return -1;
    if (b.type === "task" && a.type !== "task") return  1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Deduplicate by id (delivery failures can overlap with memory events)
  const seen_ids = new Set();
  const unique = items.filter(i => {
    if (seen_ids.has(i.id)) return false;
    seen_ids.add(i.id);
    return true;
  });

  return json({ items: unique, task_count: tasks.length });
}

function cap(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return {}; }
}
