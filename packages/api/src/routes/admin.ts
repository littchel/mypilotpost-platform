import { Hono } from "hono";
import { verifyJWT } from "../auth/jwt.js";
import { hasPermission } from "../auth/permissions.js";

export const adminRoutes = new Hono();

adminRoutes.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing Bearer Token" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!["super_admin", "operations", "support", "admin"].includes(payload.role)) {
      return c.json({ error: "Access denied: unauthorized role" }, 403);
    }
    c.set("jwtPayload", payload);
    await next();
  } catch (err) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

// List users with plan info and brand count
adminRoutes.get("/customers", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT u.id, u.email, u.created_at, u.verified_at,
        COALESCE(u.subscription_status, 'trial') as subscription_status,
        COALESCE(u.plan_id, 'starter') as plan_id,
        COALESCE(p.name, 'Starter') as plan_name,
        COALESCE(p.price_monthly, 0) as price_monthly,
        COUNT(b.id) as brand_count
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      LEFT JOIN brands b ON b.owner_user_id = u.id
      WHERE u.role = 'user' OR u.role IS NULL
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `)
    .all();

  return c.json({ success: true, data: results, total: results.length });
});

// User detail with brands list
adminRoutes.get("/customers/:id", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { id } = c.req.param();
  const user = await c.env.mypilotpost
    .prepare(`
      SELECT u.id, u.email, u.created_at, u.verified_at, u.trial_ends_at,
        COALESCE(u.subscription_status, 'trial') as subscription_status,
        COALESCE(u.plan_id, 'starter') as plan_id,
        COALESCE(p.name, 'Starter') as plan_name,
        COALESCE(p.price_monthly, 0) as price_monthly
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.id = ?
    `)
    .bind(id)
    .first();

  if (!user) return c.json({ error: "User not found" }, 404);

  const { results: brands } = await c.env.mypilotpost
    .prepare(`SELECT id, name, industry FROM brands WHERE owner_user_id = ? ORDER BY created_at DESC`)
    .bind(id)
    .all();

  return c.json({ ...user, brands: brands || [] });
});

// Billing KPIs
adminRoutes.get("/billing/overview", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "billing:read") && !hasPermission(payload.role, "analytics:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const stats = await c.env.mypilotpost
    .prepare(`
      SELECT
        COUNT(u.id) as total_customers,
        SUM(CASE WHEN u.subscription_status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN u.subscription_status = 'trial' OR u.subscription_status IS NULL THEN 1 ELSE 0 END) as trial_subscriptions,
        COALESCE(SUM(CASE WHEN u.subscription_status = 'active' THEN COALESCE(p.price_monthly, 0) ELSE 0 END), 0) as mrr
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.role = 'user' OR u.role IS NULL
    `)
    .first();

  const total = stats?.total_customers || 0;
  const active = stats?.active_subscriptions || 0;
  const conversion_rate = total > 0 ? Math.round((active / total) * 100) + "%" : "0%";

  return c.json({ ...stats, conversion_rate });
});

// MRR history (returns recent monthly snapshots; empty if table missing)
adminRoutes.get("/billing/mrr-history", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "billing:read") && !hasPermission(payload.role, "analytics:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const { results } = await c.env.mypilotpost
      .prepare("SELECT date, mrr FROM mrr_history ORDER BY date ASC LIMIT 30")
      .all();
    return c.json({ success: true, history: results || [] });
  } catch {
    return c.json({ success: true, history: [] });
  }
});

// Delivery analytics
adminRoutes.get("/analytics/delivery", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "analytics:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const stats = await c.env.mypilotpost
    .prepare(`
      SELECT
        COUNT(*) as total_jobs,
        SUM(CASE WHEN state = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) as failed
      FROM content_delivery_jobs
    `)
    .first();

  const total = stats?.total_jobs || 0;
  const delivered = stats?.delivered || 0;
  const failed = stats?.failed || 0;
  const success_rate = total > 0 ? Math.round((delivered / total) * 100) : 100;
  const failure_rate = total > 0 ? Math.round((failed / total) * 100) : 0;

  return c.json({ total_jobs: total, delivered, failed, success_rate, failure_rate });
});

// Pricing plans
adminRoutes.get("/pricing", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "pricing:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT id, name, price_monthly, posts_per_month_limit,
        ai_generations_limit, social_accounts_limit, is_active
      FROM plans
      ORDER BY price_monthly ASC
    `)
    .all();

  return c.json({ plans: results || [] });
});

// Toggle plan active state
adminRoutes.patch("/pricing/:id/toggle", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "pricing:write")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { id } = c.req.param();
  await c.env.mypilotpost
    .prepare("UPDATE plans SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ success: true });
});
