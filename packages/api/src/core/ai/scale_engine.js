/**
 * myPilotPost — SCALE ENGINE
 * Outcome-Driven Achievements & Strategic Identity Logic
 */

import { writeBrandMemoryEvent } from "./ai_intelligence.js";

/**
 * checkAndUnlockAchievements(db, brandId, env)
 * Scans for VIRAL_HIT, GROWTH_25, and CONSISTENCY_KING milestones.
 */
export async function checkAndUnlockAchievements(db, brandId, env) {
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(brandId).first();
  if (!brand) return;

  const achievements = [];

  // 1. Viral Hit Analysis (Value-Driven)
  const stats = await db.prepare(`
    SELECT AVG(impressions) as avg_reach 
    FROM content_analytics 
    WHERE brand_id = ?
  `).bind(brandId).first();

  const viralPosts = await db.prepare(`
    SELECT id, platform, impressions 
    FROM content_analytics 
    WHERE brand_id = ? AND impressions > ? * 2 AND impressions > 10
  `).bind(brandId, stats?.avg_reach || 0).all();

  if (viralPosts.results?.length > 0) {
    achievements.push({ key: 'VIRAL_HIT', val: viralPosts.results.length });
  }

  // 2. Consistency Master (7-day streak)
  if (brand.streak_count >= 7) {
    achievements.push({ key: 'CONSISTENCY_KING', val: brand.streak_count });
  }

  // 3. Growth Milestone (+25% vs last month)
  if (brand.total_engagement_gain >= 25) {
    achievements.push({ key: 'GROWTH_25', val: brand.total_engagement_gain });
  }

  // Persist Achievement if new
  const stmt = db.prepare(`
    INSERT INTO brand_achievements (id, brand_id, achievement_key, value_snapshot)
    SELECT ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM brand_achievements WHERE brand_id = ? AND achievement_key = ?)
  `);

  for (const ach of achievements) {
    await stmt.bind(
      crypto.randomUUID(), brandId, ach.key, JSON.stringify(ach),
      brandId, ach.key
    ).run();
  }

  // Dynamic Archetype Assignment & Leveling
  await updateBrandArchetype(db, brandId, brand);
  await grantExp(db, brandId, 50); // Achievement XP
}

/**
 * grantExp(db, brandId, amount)
 */
export async function grantExp(db, brandId, amount) {
  const brand = await db.prepare("SELECT archetype_level, archetype_exp FROM brands WHERE id = ?").bind(brandId).first();
  if (!brand) return;

  let newExp = (brand.archetype_exp || 0) + amount;
  let newLevel = brand.archetype_level || 1;

  // Level up logic (Simple 100xp per level)
  const expNeeded = newLevel * 100;
  let leveledUp = false;

  if (newExp >= expNeeded) {
    newExp -= expNeeded;
    newLevel += 1;
    leveledUp = true;
  }

  await db.prepare("UPDATE brands SET archetype_exp = ?, archetype_level = ? WHERE id = ?").bind(newExp, newLevel, brandId).run();

  if (leveledUp) {
     await writeBrandMemoryEvent(db, brandId, 'level_up', { level: newLevel });
  }

  return { leveledUp, newLevel, newExp };
}

/**
 * updateBrandArchetype
 */
async function updateBrandArchetype(db, brandId, brand) {
  let archetype = 'creator'; // Default
  
  const campaignCount = await db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE brand_id = ?").bind(brandId).first();
  
  if (campaignCount?.count >= 3) {
    archetype = 'strategist';
  } else if (brand.total_engagement_gain > 20) {
    archetype = 'builder';
  } else if (brand.streak_count > 5) {
    archetype = 'creator';
  }

  await db.prepare("UPDATE brands SET archetype = ? WHERE id = ?").bind(archetype, brandId).run();
}

/**
 * getPressureAlerts(db, brandId)
 * Returns prioritized alerts: STREAK_RISK > ENGAGEMENT_DROP > OPPORTUNITY
 */
export async function getPressureAlerts(db, brandId) {
  const brand = await db.prepare("SELECT last_posted_at, streak_count, archetype_level FROM brands WHERE id = ?").bind(brandId).first();
  const alerts = [];

  if (brand?.last_posted_at) {
    const last = new Date(brand.last_posted_at).getTime();
    const diffHours = (Date.now() - last) / (3600 * 1000);

    // 1. STREAK_RISK (Priority 1)
    if (diffHours > 20 && diffHours < 24) {
      alerts.push({
        priority: 1,
        type: 'danger',
        key: 'STREAK_RISK',
        message: `Your ${brand.streak_count}-day streak is at risk! Post within 4 hours to keep the momentum.`
      });
    }

    // 2. ENGAGEMENT_DROP (Priority 2)
    // Simulated drop check
    if (diffHours > 48) {
       alerts.push({
          priority: 2,
          type: 'warning',
          key: 'ENGAGEMENT_DROP',
          message: "Reach is beginning to slide. Post media-weighted content now to recover."
       });
    }

    // 3. OPPORTUNITY (Priority 3)
    if (brand.archetype_level < 3) {
       alerts.push({
          priority: 3,
          type: 'info',
          key: 'LEVEL_UP_OPPORTUNITY',
          message: "You're close to Level 2! Post today to unlock new strategic insights."
       });
    }
  }

  // Sort by priority (rank ASC)
  return alerts.sort((a, b) => a.priority - b.priority);
}
