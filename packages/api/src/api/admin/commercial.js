/**
 * Admin Commercial Control System
 * Plans · Features · Entitlements · Metrics
 * No redeployment required for pricing, limits, or feature changes.
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { getEntitlements } from "../../lib/entitlements.js";
import { logAdminAction } from "../../lib/admin_logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function snapshotPlan(db, planId, adminId, note) {
  const plan = await db.prepare("SELECT * FROM plans WHERE id = ?").bind(planId).first();
  if (!plan) return;
  const entitlements = await getEntitlements(db, planId);
  await db.prepare(`
    INSERT INTO plan_versions (id, plan_id, snapshot_json, changed_by, note)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), planId,
    JSON.stringify({ plan, entitlements }),
    adminId || null, note || null
  ).run();
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────────────────────────────────────

export async function listPlans(env) {
  const db = getDB(env);
  const { results: plans } = await db
    .prepare("SELECT * FROM plans ORDER BY COALESCE(sort_order, 99), COALESCE(price_monthly, price_cents, 0)")
    .all();

  const enriched = await Promise.all((plans || []).map(async p => {
    const entitlements = await getEntitlements(db, p.id);
    return { ...p, entitlements };
  }));
  return json({ plans: enriched });
}

export async function createPlan(request, env, auth) {
  const db = getDB(env);
  const body = await request.json().catch(() => ({}));
  const {
    name, description, price_monthly, price_yearly, currency,
    trial_days, badge, visible, sort_order, billing_interval,
  } = body;

  if (!name?.trim()) throw error("name required", "BAD_REQUEST", null, 400);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw error("name produces empty slug", "BAD_REQUEST", null, 400);

  const existing = await db.prepare("SELECT id FROM plans WHERE id = ?").bind(slug).first();
  if (existing) throw error(`Plan ID '${slug}' already exists`, "CONFLICT", null, 409);

  const priceCents = Math.round((price_monthly || 0) * 100);
  // billing_interval and limits are NOT NULL with no DB default — always provide them
  const interval = billing_interval || 'monthly';

  await db.prepare(`
    INSERT INTO plans (
      id, slug, name, description,
      price_monthly, price_cents, price_yearly,
      billing_interval, limits,
      currency, trial_days, is_active, status, visible, sort_order, badge,
      brand_limit, user_limit, features_json,
      social_accounts_limit, posts_per_month_limit, ai_generations_limit,
      created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,'{}',?,?,1,'active',?,?,?,3,5,'[]',5,60,200,datetime('now'),datetime('now'))
  `).bind(
    slug, slug, name.trim(), description || null,
    price_monthly || 0, priceCents, price_yearly || Math.round(priceCents * 10),
    interval,
    currency || 'ZAR', trial_days ?? 14,
    visible ?? 1, sort_order || null, badge || null
  ).run();

  await snapshotPlan(db, slug, auth.user_id, "created");
  return json({ success: true, id: slug });
}

export async function updatePlan(request, env, auth, planId) {
  const db = getDB(env);
  const plan = await db.prepare("SELECT * FROM plans WHERE id = ?").bind(planId).first();
  if (!plan) throw error("Plan not found", "NOT_FOUND", null, 404);
  if (plan.status === 'archived') throw error("Cannot edit archived plan", "FORBIDDEN", null, 403);

  await snapshotPlan(db, planId, auth.user_id, "pre-edit");

  const body = await request.json().catch(() => ({}));
  const fields = [];
  const binds = [];

  if (body.name !== undefined)          { fields.push("name = ?");          binds.push(body.name.trim()); }
  if (body.description !== undefined)   { fields.push("description = ?");   binds.push(body.description); }
  if (body.price_monthly !== undefined) {
    const cents = Math.round(body.price_monthly * 100);
    fields.push("price_monthly = ?", "price_cents = ?");
    binds.push(body.price_monthly, cents);
  }
  if (body.price_yearly !== undefined)  { fields.push("price_yearly = ?");  binds.push(body.price_yearly); }
  if (body.currency !== undefined)      { fields.push("currency = ?");      binds.push(body.currency); }
  if (body.trial_days !== undefined)    { fields.push("trial_days = ?");    binds.push(body.trial_days); }
  if (body.badge !== undefined)         { fields.push("badge = ?");         binds.push(body.badge); }
  if (body.visible !== undefined)       { fields.push("visible = ?");       binds.push(body.visible ? 1 : 0); }
  if (body.sort_order !== undefined)    { fields.push("sort_order = ?");    binds.push(body.sort_order); }
  if (body.social_accounts_limit !== undefined) { fields.push("social_accounts_limit = ?"); binds.push(body.social_accounts_limit); }
  if (body.posts_per_month_limit !== undefined)  { fields.push("posts_per_month_limit = ?");  binds.push(body.posts_per_month_limit); }
  if (body.ai_generations_limit !== undefined)   { fields.push("ai_generations_limit = ?");   binds.push(body.ai_generations_limit); }
  if (body.brand_limit !== undefined)         { fields.push("brand_limit = ?");         binds.push(body.brand_limit); }
  if (body.billing_interval !== undefined)    { fields.push("billing_interval = ?");    binds.push(body.billing_interval || 'monthly'); }
  if (body.user_limit !== undefined)          { fields.push("user_limit = ?");          binds.push(body.user_limit); }

  if (!fields.length) throw error("No fields to update", "BAD_REQUEST", null, 400);

  fields.push("updated_at = datetime('now')");
  binds.push(planId);

  await db.prepare(`UPDATE plans SET ${fields.join(", ")} WHERE id = ?`).bind(...binds).run();

  // Keep plan_entitlements in sync with plan metadata limits
  const entSync = [
    { key: "brands", value: body.brand_limit, type: "count" },
    { key: "users", value: body.user_limit, type: "count" },
    { key: "social_posts", value: body.posts_per_month_limit, type: "monthly" }
  ];
  for (const sync of entSync) {
    if (sync.value !== undefined) {
      await db.prepare(`
        INSERT INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(plan_id, feature_key) DO UPDATE SET limit_value = EXCLUDED.limit_value
      `).bind(planId, sync.key, sync.value, sync.type).run();
    }
  }

  // PART 1 — price-change behavior. Default 'new': existing subscribers are
  // grandfathered (their locked_price is untouched). 'migrate': re-snapshot the
  // active subscribers on this plan to the new price.
  const apply_to = body.apply_to === "migrate" ? "migrate" : "new";
  let migrated = 0;

  // Impact count = active subscriptions currently on this plan
  const impact = await db.prepare(
    "SELECT COUNT(*) AS n FROM subscriptions WHERE plan_id = ? AND status = 'active'"
  ).bind(planId).first().catch(() => ({ n: 0 }));

  if (apply_to === "migrate" && body.price_monthly !== undefined) {
    const newCents = Math.round(body.price_monthly * 100);
    const res = await db.prepare(`
      UPDATE subscriptions
      SET locked_price_cents = ?, locked_currency = COALESCE(?, locked_currency),
          grandfathered = 0, effective_from = datetime('now'), updated_at = datetime('now')
      WHERE plan_id = ? AND status = 'active'
    `).bind(newCents, body.currency || null, planId).run();
    migrated = res?.meta?.changes ?? 0;
  }

  await logAdminAction(env, auth, "update_plan", "plan", planId, {
    fields: Object.keys(body).filter(k => k !== "apply_to"),
    apply_to, impact_count: impact?.n || 0, migrated,
  });

  return json({ success: true, apply_to, impact_count: impact?.n || 0, migrated });
}

export async function archivePlan(request, env, auth, planId) {
  const db = getDB(env);
  const plan = await db.prepare("SELECT id, status FROM plans WHERE id = ?").bind(planId).first();
  if (!plan) throw error("Plan not found", "NOT_FOUND", null, 404);

  const { results: activeUsers } = await db
    .prepare("SELECT COUNT(*) as c FROM users WHERE plan_id = ? AND subscription_status IN ('active','trial')")
    .bind(planId)
    .all();
  if (activeUsers?.[0]?.c > 0) {
    throw error(`Cannot archive plan with ${activeUsers[0].c} active subscribers. Migrate them first.`, "CONFLICT", null, 409);
  }

  await snapshotPlan(db, planId, auth.user_id, "archived");
  await db.prepare("UPDATE plans SET status = 'archived', is_active = 0, visible = 0, updated_at = datetime('now') WHERE id = ?").bind(planId).run();
  return json({ success: true });
}

export async function clonePlan(request, env, auth, planId) {
  const db = getDB(env);
  const source = await db.prepare("SELECT * FROM plans WHERE id = ?").bind(planId).first();
  if (!source) throw error("Source plan not found", "NOT_FOUND", null, 404);

  const body = await request.json().catch(() => ({}));
  const newName = body.name || `${source.name} (Copy)`;
  const newSlug = (body.id || newName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const existing = await db.prepare("SELECT id FROM plans WHERE id = ?").bind(newSlug).first();
  if (existing) throw error(`Plan ID '${newSlug}' already exists`, "CONFLICT", null, 409);

  // billing_interval and limits are NOT NULL with no DB default — always provide a value
  const cloneInterval = source.billing_interval || 'monthly';
  const cloneLimits   = source.limits || '{}';

  await db.prepare(`
    INSERT INTO plans (
      id, slug, name, description, price_monthly, price_cents, price_yearly,
      billing_interval, limits,
      currency, trial_days, is_active, status, visible, sort_order, badge,
      brand_limit, user_limit, features_json,
      social_accounts_limit, posts_per_month_limit, ai_generations_limit,
      created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,'active',1,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
  `).bind(
    newSlug, newSlug, newName, source.description,
    source.price_monthly, source.price_cents, source.price_yearly,
    cloneInterval, cloneLimits,
    source.currency, source.trial_days, source.sort_order || null, source.badge || null,
    source.brand_limit || 3, source.user_limit || 5, source.features_json || '[]',
    source.social_accounts_limit || 5, source.posts_per_month_limit || 60, source.ai_generations_limit || 200
  ).run();

  // Copy entitlements
  const { results: ents } = await db
    .prepare("SELECT feature_key, enabled, limit_value, limit_type FROM plan_entitlements WHERE plan_id = ?")
    .bind(planId).all();
  for (const e of ents || []) {
    await db.prepare(`
      INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type)
      VALUES (?,?,?,?,?)
    `).bind(newSlug, e.feature_key, e.enabled, e.limit_value, e.limit_type).run();
  }

  await snapshotPlan(db, newSlug, auth.user_id, `cloned from ${planId}`);
  return json({ success: true, id: newSlug });
}

export async function getPlanVersions(env, planId) {
  const db = getDB(env);
  const { results } = await db
    .prepare("SELECT id, plan_id, changed_by, note, created_at FROM plan_versions WHERE plan_id = ? ORDER BY created_at DESC LIMIT 20")
    .bind(planId).all();
  return json({ versions: results || [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export async function listFeatures(env) {
  const db = getDB(env);
  const { results } = await db
    .prepare("SELECT * FROM plan_features ORDER BY category, name")
    .all();
  return json({ features: results || [] });
}

export async function createFeature(request, env) {
  const db = getDB(env);
  const body = await request.json().catch(() => ({}));
  const { key, name, description, category } = body;

  if (!key?.trim() || !name?.trim()) throw error("key and name required", "BAD_REQUEST", null, 400);
  const normKey = key.toLowerCase().replace(/[^a-z0-9_]+/g, '_');

  const existing = await db.prepare("SELECT key FROM plan_features WHERE key = ?").bind(normKey).first();
  if (existing) throw error(`Feature key '${normKey}' already exists`, "CONFLICT", null, 409);

  await db.prepare(`
    INSERT INTO plan_features (key, name, description, category, visible)
    VALUES (?, ?, ?, ?, 1)
  `).bind(normKey, name.trim(), description || null, category || 'core').run();

  return json({ success: true, key: normKey });
}

export async function updateFeature(request, env, featureKey) {
  const db = getDB(env);
  const existing = await db.prepare("SELECT key FROM plan_features WHERE key = ?").bind(featureKey).first();
  if (!existing) throw error("Feature not found", "NOT_FOUND", null, 404);

  const body = await request.json().catch(() => ({}));
  const fields = [];
  const binds = [];

  if (body.name !== undefined)        { fields.push("name = ?");        binds.push(body.name.trim()); }
  if (body.description !== undefined) { fields.push("description = ?"); binds.push(body.description); }
  if (body.category !== undefined)    { fields.push("category = ?");    binds.push(body.category); }
  if (body.visible !== undefined)     { fields.push("visible = ?");     binds.push(body.visible ? 1 : 0); }

  if (!fields.length) throw error("No fields to update", "BAD_REQUEST", null, 400);
  fields.push("updated_at = datetime('now')");
  binds.push(featureKey);

  await db.prepare(`UPDATE plan_features SET ${fields.join(", ")} WHERE key = ?`).bind(...binds).run();
  return json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITLEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function listPlanEntitlements(env, planId) {
  const db = getDB(env);
  const plan = await db.prepare("SELECT id, name FROM plans WHERE id = ?").bind(planId).first();
  if (!plan) throw error("Plan not found", "NOT_FOUND", null, 404);

  const { results: features } = await db.prepare("SELECT * FROM plan_features ORDER BY category, name").all();
  const entMap = await getEntitlements(db, planId);

  const merged = (features || []).map(f => ({
    ...f,
    ...(entMap[f.key] || { enabled: 0, limit_value: null, limit_type: 'boolean' }),
  }));
  return json({ plan_id: planId, plan_name: plan.name, entitlements: merged });
}

export async function updateEntitlement(request, env, auth, planId, featureKey) {
  const db = getDB(env);
  const plan = await db.prepare("SELECT id, status FROM plans WHERE id = ?").bind(planId).first();
  if (!plan) throw error("Plan not found", "NOT_FOUND", null, 404);
  if (plan.status === 'archived') throw error("Cannot edit archived plan entitlements", "FORBIDDEN", null, 403);

  const feature = await db.prepare("SELECT key FROM plan_features WHERE key = ?").bind(featureKey).first();
  if (!feature) throw error("Feature not found", "NOT_FOUND", null, 404);

  await snapshotPlan(db, planId, auth.user_id, `entitlement update: ${featureKey}`);

  const body = await request.json().catch(() => ({}));
  const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : undefined;
  const limitValue = body.limit_value !== undefined ? (body.limit_value === null || body.limit_value === '' ? null : parseInt(body.limit_value)) : undefined;
  const limitType = body.limit_type || undefined;

  // Upsert
  const existing = await db.prepare("SELECT plan_id FROM plan_entitlements WHERE plan_id = ? AND feature_key = ?").bind(planId, featureKey).first();
  if (existing) {
    const fields = [];
    const binds = [];
    if (enabled !== undefined)     { fields.push("enabled = ?");     binds.push(enabled); }
    if (limitValue !== undefined)  { fields.push("limit_value = ?"); binds.push(limitValue); }
    if (limitType !== undefined)   { fields.push("limit_type = ?");  binds.push(limitType); }
    if (fields.length) {
      binds.push(planId, featureKey);
      await db.prepare(`UPDATE plan_entitlements SET ${fields.join(", ")} WHERE plan_id = ? AND feature_key = ?`).bind(...binds).run();
    }
  } else {
    await db.prepare(`
      INSERT INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(planId, featureKey, enabled ?? 1, limitValue ?? null, limitType || 'boolean').run();
  }

  // Keep legacy limit columns in sync for enforcement.js backward compat
  const syncMap = {
    social_posts: "posts_per_month_limit",
    ai_content:   "ai_generations_limit",
    brands:       "brand_limit",
    users:        "user_limit",
  };
  if (syncMap[featureKey] && limitValue !== undefined) {
    await db.prepare(`UPDATE plans SET ${syncMap[featureKey]} = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(limitValue, planId).run();
  }

  // Sync features_json for checkFeatureAccess backward compat
  if (enabled !== undefined) {
    const { results: allEnts } = await db
      .prepare("SELECT feature_key FROM plan_entitlements WHERE plan_id = ? AND enabled = 1")
      .bind(planId).all();
    const featArray = (allEnts || []).map(e => e.feature_key);
    await db.prepare("UPDATE plans SET features_json = ? WHERE id = ?")
      .bind(JSON.stringify(featArray), planId).run();
  }

  return json({ success: true, plan_id: planId, feature_key: featureKey });
}

// ─────────────────────────────────────────────────────────────────────────────
// SAAS METRICS
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommercialMetrics(env) {
  const db = getDB(env);

  const [
    mrrRow, statusBreakdown, trialRow,
    newThisMonth, churnedThisMonth, conversionRow, usageRow
  ] = await Promise.all([
    // MRR: active subscribers × plan price
    db.prepare(`
      SELECT SUM(COALESCE(p.price_cents, p.price_monthly * 100, 0)) AS mrr_cents
      FROM users u JOIN plans p ON u.plan_id = p.id
      WHERE u.subscription_status = 'active'
    `).first().catch(() => ({})),

    // Status breakdown
    db.prepare(`
      SELECT subscription_status, COUNT(*) AS count
      FROM users WHERE role = 'user'
      GROUP BY subscription_status
    `).all().catch(() => ({ results: [] })),

    // Trial details
    db.prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN trial_ends_at < datetime('now') THEN 1 ELSE 0 END) AS expired,
             SUM(CASE WHEN trial_ends_at >= datetime('now') THEN 1 ELSE 0 END) AS active
      FROM users WHERE subscription_status = 'trial' AND role = 'user'
    `).first().catch(() => ({})),

    // New users this calendar month
    db.prepare(`
      SELECT COUNT(*) AS count FROM users
      WHERE role = 'user' AND created_at >= date('now', 'start of month')
    `).first().catch(() => ({})),

    // Cancelled/expired this month
    db.prepare(`
      SELECT COUNT(*) AS count FROM users
      WHERE role = 'user'
        AND subscription_status IN ('cancelled','expired','refunded')
        AND updated_at >= date('now', 'start of month')
    `).first().catch(() => ({})),

    // Conversion: trial → active (all time)
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='user' AND subscription_status='active') AS converted,
        (SELECT COUNT(*) FROM users WHERE role='user') AS total
    `).first().catch(() => ({})),

    // Usage this period
    db.prepare(`
      SELECT
        SUM(posts_used) AS posts_used,
        SUM(ai_generations_used) AS ai_used,
        SUM(social_accounts_used) AS accounts_used
      FROM usage_tracking
    `).first().catch(() => ({})),
  ]);

  const mrrCents = mrrRow?.mrr_cents || 0;
  const arrCents = mrrCents * 12;
  const statusMap = {};
  for (const s of (statusBreakdown?.results || [])) statusMap[s.subscription_status] = s.count;
  const activeCount = statusMap['active'] || 0;
  const totalUsers = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const convRate = conversionRow?.total > 0
    ? +(conversionRow.converted / conversionRow.total * 100).toFixed(1) : 0;
  const arpu = activeCount > 0 ? Math.round(mrrCents / activeCount / 100) : 0;
  const ltv = arpu > 0 ? arpu * 12 : 0; // simplified 12-month LTV

  // Per-plan breakdown
  const { results: planBreakdown } = await db.prepare(`
    SELECT p.name, p.id,
           COUNT(u.id) AS users,
           SUM(COALESCE(p.price_cents, p.price_monthly*100, 0)) AS plan_mrr
    FROM users u JOIN plans p ON u.plan_id = p.id
    WHERE u.role = 'user' AND u.subscription_status = 'active'
    GROUP BY p.id
  `).all().catch(() => ({ results: [] }));

  return json({
    revenue: {
      mrr_cents: mrrCents,
      mrr: Math.round(mrrCents / 100),
      arr: Math.round(arrCents / 100),
      arpu,
      ltv,
      currency: 'ZAR',
    },
    subscribers: {
      active:   activeCount,
      trial:    trialRow?.active || 0,
      trial_expired: trialRow?.expired || 0,
      past_due: statusMap['past_due'] || 0,
      cancelled: statusMap['cancelled'] || 0,
      total:    totalUsers,
    },
    growth: {
      new_this_month:     newThisMonth?.count  || 0,
      churned_this_month: churnedThisMonth?.count || 0,
      conversion_rate:    convRate,
    },
    usage: {
      posts_used:    usageRow?.posts_used    || 0,
      ai_used:       usageRow?.ai_used       || 0,
      accounts_used: usageRow?.accounts_used || 0,
    },
    plans: planBreakdown || [],
    generated_at: new Date().toISOString(),
  });
}
