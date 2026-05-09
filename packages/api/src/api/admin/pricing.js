// packages/api/src/api/admin/pricing.js
/**
 * Admin Pricing Management API
 * AUTHORITATIVE • PRODUCTION-READY
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { getRegion } from "../../lib/geo.js";

/**
 * GET /api/admin/pricing
 */
export async function handleAdminPricing(env) {
  const db = getDB(env);
  const { results } = await db.prepare("SELECT * FROM plans ORDER BY COALESCE(price_monthly, price_cents, 0) ASC").all();
  return json({ plans: results || [] });
}

/**
 * POST /api/admin/pricing
 */
export async function createAdminPricing(request, env) {
  const db = getDB(env);
  const body = await request.json();
  const { id, name, price_monthly, currency, social_accounts_limit, posts_per_month_limit, ai_generations_limit, trial_days, is_active } = body;

  const planId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  if (social_accounts_limit <= 0 || posts_per_month_limit <= 0 || ai_generations_limit <= 0) {
    return error("Limits must be greater than 0", "BAD_REQUEST", null, 400);
  }

  const existing = await db.prepare("SELECT id FROM plans WHERE id = ?").bind(planId).first();
  if (existing) {
    return error("Plan ID already exists", "CONFLICT", null, 409);
  }

  await db.prepare(`
    INSERT INTO plans (id, name, price_monthly, price_cents, price_yearly, billing_interval, currency, limits, social_accounts_limit, posts_per_month_limit, ai_generations_limit, trial_days, is_active, brand_limit, features_json)
    VALUES (?, ?, ?, ?, ?, 'monthly', ?, '{}', ?, ?, ?, ?, ?, 1, '[]')
  `).bind(
    planId, name, price_monthly, price_monthly * 100, price_monthly * 10, currency || 'ZAR', 
    social_accounts_limit, posts_per_month_limit, ai_generations_limit, trial_days || 14, is_active ? 1 : 0
  ).run();

  return json({ success: true, id: planId });
}

/**
 * POST /api/admin/pricing
 */
export async function handleAdminPricingById(request, env) {
  const db = getDB(env);
  const method = request.method;
  const id = request.url.split("/").pop();

  if (method === "GET") {
    const plan = await db.prepare("SELECT * FROM plans WHERE id = ?").bind(id).first();
    if (!plan) return error("Plan not found", 404);
    return json(plan);
  }

  if (method === "PUT") {
    const body = await request.json();
    const { name, price_monthly, social_accounts_limit, posts_per_month_limit, ai_generations_limit, is_active } = body;

    // Safety Validation
    if (social_accounts_limit <= 0 || posts_per_month_limit <= 0 || ai_generations_limit <= 0) {
      return error("Limits must be greater than 0", "BAD_REQUEST", null, 400);
    }

    await db.prepare(`
      UPDATE plans 
      SET name = ?, price_monthly = ?, social_accounts_limit = ?, posts_per_month_limit = ?, ai_generations_limit = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, price_monthly, social_accounts_limit, posts_per_month_limit, ai_generations_limit, is_active, id).run();

    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

/**
 * PATCH /api/admin/pricing/:id/toggle
 */
export async function togglePlanStatus(request, env) {
  const db = getDB(env);
  const id = request.url.split("/").slice(-2)[0];

  const plan = await db.prepare("SELECT is_active FROM plans WHERE id = ?").bind(id).first();
  if (!plan) return error("Plan not found", 404);

  const newStatus = plan.is_active ? 0 : 1;

  // Safety: Ensure at least one active plan remains
  if (newStatus === 0) {
    const activeCount = await db.prepare("SELECT COUNT(*) as count FROM plans WHERE is_active = 1").first();
    if (activeCount.count <= 1) {
      return error("Cannot deactivate the last active plan", "SAFETY_VIOLATION", null, 400);
    }
  }

  await db.prepare("UPDATE plans SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(newStatus, id).run();
  return json({ success: true, is_active: !!newStatus });
}

/**
 * GET /api/v1/pricing (Public)
 */
export async function getPublicPricing(request, env) {
  const db = getDB(env);
  const country = request.cf?.country || "unknown";
  const region = getRegion(country);

  const { results: plans } = await db.prepare("SELECT * FROM plans WHERE is_active = 1 ORDER BY COALESCE(price_monthly, price_cents, 0) ASC").all();
  const { results: regional } = await db.prepare("SELECT * FROM regional_plans WHERE region = ?").bind(region).all();

  const localizedPlans = plans.map(p => {
    const regionalMatch = regional.find(r => r.plan_id === p.id);
    if (regionalMatch) {
      return {
        ...p,
        price_monthly: regionalMatch.price_monthly,
        price_yearly: regionalMatch.price_yearly,
        currency: regionalMatch.currency,
        is_regional: true
      };
    }
    return { ...p, is_regional: false };
  });

  return json({ 
    region,
    country,
    plans: localizedPlans 
  });
}
