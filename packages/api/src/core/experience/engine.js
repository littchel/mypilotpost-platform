// packages/api/src/core/experience/engine.js

import { getDB } from "../../lib/db.js";
import { insertExperienceNotification } from "../notifications/utils.js";

/**
 * GET /api/customer/experience
 * Main entry point for the product experience layer
 */
export async function getExperienceSummary(request, env, auth) {
  const db = getDB(env);
  const brandId = auth.brand_id;
  const userId = auth.user_id;

  try {
    // 1. Intelligence Throttled Checks
    await runIntelligenceChecks(db, brandId);

    // 2. Aggregate Stats
    const stats = await getStats(db, brandId);

    // 3. Determine Dashboard State (Strict Priority)
    const dashboard_state = determineDashboardState(stats);

    // 4. Derive Badges (Dynamic)
    const badges = await deriveBadges(db, brandId, stats);

    // 5. Fetch Recent Notifications (Limit 20)
    const notifications = await fetchExperienceNotifications(db, brandId, userId);

    // 6. Unread Count
    const unread_count = await getUnreadCount(db, brandId, userId);

    return {
      notifications,
      unread_count,
      badges,
      dashboard_state,
      stats
    };
  } catch (err) {
    console.error("EXPERIENCE_ENGINE_ERROR:", err);
    // Safe defaults
    return {
      notifications: [],
      unread_count: 0,
      badges: [],
      dashboard_state: "empty",
      stats: { drafts: 0, scheduled: 0, published: 0, failed: 0 }
    };
  }
}

async function getStats(db, brandId) {
  const drafts = await db.prepare(`
    SELECT COUNT(*) as total FROM content_vault WHERE brand_id = ? AND lifecycle_status = 'draft'
  `).bind(brandId).first();

  const jobs = await db.prepare(`
    SELECT 
      COUNT(CASE WHEN status IN ('scheduled', 'pending', 'processing') THEN 1 END) as scheduled,
      COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
    FROM delivery_jobs
    WHERE brand_id = ?
  `).bind(brandId).first();

  return {
    drafts: drafts?.total || 0,
    scheduled: jobs?.scheduled || 0,
    published: jobs?.published || 0,
    failed: jobs?.failed || 0
  };
}

function determineDashboardState(stats) {
  if (stats.drafts === 0) return "empty";
  if (stats.scheduled === 0 && stats.published === 0) return "close";
  return "active";
}

async function deriveBadges(db, brandId, stats) {
  const allBadges = [];

  // First Actions
  allBadges.push({
    id: "first_draft",
    title: "Draft Pioneer",
    achieved: stats.drafts > 0,
    progress: Math.min(stats.drafts, 1),
    target: 1,
    description: "Created your first content draft"
  });

  allBadges.push({
    id: "first_schedule",
    title: "Future Focused",
    achieved: (stats.scheduled + stats.published + stats.failed) > 0,
    progress: Math.min((stats.scheduled + stats.published + stats.failed), 1),
    target: 1,
    description: "Scheduled your first piece of content"
  });

  allBadges.push({
    id: "first_publish",
    title: "World Ready 🚀",
    achieved: stats.published > 0,
    progress: Math.min(stats.published, 1),
    target: 1,
    description: "Published your first post live"
  });

  // Milestones
  allBadges.push({
    id: "milestone_10",
    title: "Content Creator",
    achieved: stats.published >= 10,
    progress: Math.min(stats.published, 10),
    target: 10,
    description: "Successfully published 10 posts"
  });

  allBadges.push({
    id: "milestone_25",
    title: "Growth Powerhouse",
    achieved: stats.published >= 25,
    progress: Math.min(stats.published, 25),
    target: 25,
    description: "Successfully published 25 posts"
  });

  // Consistency checks
  const recentTwoDays = await db.prepare(`
    SELECT COUNT(DISTINCT date(published_at)) as count 
    FROM delivery_jobs 
    WHERE brand_id = ? AND status = 'published' AND published_at >= datetime('now', '-2 days')
  `).bind(brandId).first();

  allBadges.push({
    id: "consistency_streak",
    title: "Double Down 🔥",
    achieved: (recentTwoDays?.count || 0) >= 2,
    progress: Math.min((recentTwoDays?.count || 0), 2),
    target: 2,
    description: "Published content on 2 consecutive days"
  });

  // Soft Limit: Return all achieved + next 3 upcoming
  const achieved = allBadges.filter(b => b.achieved);
  const upcoming = allBadges.filter(b => !b.achieved).slice(0, 3);
  
  return [...achieved, ...upcoming];
}

async function fetchExperienceNotifications(db, brandId, userId) {
  const { results } = await db.prepare(`
    SELECT n.id, n.type, n.title, n.message, n.created_at,
           CASE WHEN nr.notification_id IS NULL THEN 0 ELSE 1 END as is_read,
           CASE WHEN date(n.created_at) = date('now') THEN 1 ELSE 0 END as is_today
    FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
    WHERE n.brand_id = ?
    ORDER BY n.created_at DESC
    LIMIT 20
  `).bind(userId, brandId).all();

  return (results || []).map(row => ({
    id: row.id,
    type: row.type,
    message: row.message,
    created_at: row.created_at,
    created_today: Boolean(row.is_today),
    read: Boolean(row.is_read)
  }));
}

async function getUnreadCount(db, brandId, userId) {
  const row = await db.prepare(`
    SELECT COUNT(*) as count
    FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
    WHERE n.brand_id = ? AND nr.notification_id IS NULL
  `).bind(userId, brandId).first();
  return row?.count || 0;
}

async function runIntelligenceChecks(db, brandId) {
  // 1. Quiet Period check (No posts in 3 days)
  const lastPost = await db.prepare(`
    SELECT MAX(published_at) as last_time FROM delivery_jobs 
    WHERE brand_id = ? AND status = 'published'
  `).bind(brandId).first();

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  if (!lastPost?.last_time || new Date(lastPost.last_time) < threeDaysAgo) {
    await insertExperienceNotification(
      db, 
      brandId, 
      "intelligence_quiet", 
      "Quiet Period", 
      "It’s been quiet… let’s post something 👀"
    );
  }

  // 2. High Activity check (Multiple posts today)
  const todayCount = await db.prepare(`
    SELECT COUNT(*) as count FROM delivery_jobs 
    WHERE brand_id = ? AND status = 'published' AND published_at >= date('now')
  `).bind(brandId).first();

  if (todayCount?.count >= 3) {
    await insertExperienceNotification(
      db, 
      brandId, 
      "intelligence_streak", 
      "On Fire!", 
      "You’re on a roll today 🔥"
    );
  }
}
