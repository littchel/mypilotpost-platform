import { Hono } from "hono";
import { verifyJWT } from "../auth/jwt.js";
import { hasPermission } from "../auth/permissions.js";

export const adminRoutes = new Hono();

const ADMIN_ROLES = ["super_admin", "operations", "support", "admin"];

adminRoutes.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing Bearer Token" }, 401);
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!ADMIN_ROLES.includes(payload.role)) {
      return c.json({ error: "Access denied: unauthorized role" }, 403);
    }
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

adminRoutes.get("/customers", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) return c.json({ error: "Access denied" }, 403);

  const search = c.req.query("search") || "";
  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT u.id, u.email, u.created_at, u.verified_at, u.is_active,
        COALESCE(u.subscription_status, 'trial') as subscription_status,
        COALESCE(u.plan_id, 'starter') as plan_id,
        COALESCE(p.name, 'Starter') as plan_name,
        COALESCE(p.price_monthly, 0) as price_monthly,
        COUNT(b.id) as brand_count
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      LEFT JOIN brands b ON b.owner_user_id = u.id
      WHERE (u.role = 'user' OR u.role IS NULL)
        AND (? = '' OR u.email LIKE ('%' || ? || '%'))
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 200
    `)
    .bind(search, search)
    .all();

  return c.json({ success: true, data: results, total: results.length });
});

adminRoutes.get("/customers/:id", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) return c.json({ error: "Access denied" }, 403);

  const { id } = c.req.param();
  const user = await c.env.mypilotpost
    .prepare(`
      SELECT u.id, u.email, u.created_at, u.verified_at, u.trial_ends_at, u.is_active,
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
    .prepare("SELECT id, name, industry FROM brands WHERE owner_user_id = ? ORDER BY created_at DESC")
    .bind(id)
    .all();

  return c.json({ ...user, brands: brands || [] });
});

adminRoutes.post("/customers/:id/toggle", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:write")) return c.json({ error: "Access denied" }, 403);

  const { id } = c.req.param();
  await c.env.mypilotpost
    .prepare("UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ success: true });
});

// ─── BILLING ─────────────────────────────────────────────────────────────────

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

  const { results: distribution } = await c.env.mypilotpost
    .prepare(`
      SELECT COALESCE(p.name, 'Starter') as name, COUNT(u.id) as count
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.subscription_status = 'active' AND (u.role = 'user' OR u.role IS NULL)
      GROUP BY u.plan_id
      ORDER BY count DESC
    `)
    .all();

  const total = stats?.total_customers || 0;
  const active = stats?.active_subscriptions || 0;
  const conversion_rate = total > 0 ? Math.round((active / total) * 100) + "%" : "0%";

  return c.json({ ...stats, conversion_rate, distribution: distribution || [] });
});

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

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

adminRoutes.get("/analytics/delivery", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "analytics:read")) return c.json({ error: "Access denied" }, 403);

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

  const { results: platforms } = await c.env.mypilotpost
    .prepare(`
      SELECT platform,
        COUNT(*) as total,
        SUM(CASE WHEN state = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) as failed
      FROM content_delivery_jobs
      GROUP BY platform
      ORDER BY total DESC
    `)
    .all();

  return c.json({ total_jobs: total, delivered, failed, success_rate, failure_rate, platforms: platforms || [] });
});

// ─── PRICING ─────────────────────────────────────────────────────────────────

adminRoutes.get("/pricing", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "pricing:read")) return c.json({ error: "Access denied" }, 403);

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT id, name, price_monthly, posts_per_month_limit,
        ai_generations_limit, social_accounts_limit, trial_days, is_active
      FROM plans ORDER BY price_monthly ASC
    `)
    .all();
  return c.json({ plans: results || [] });
});

adminRoutes.post("/pricing", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "pricing:write")) return c.json({ error: "Access denied" }, 403);

  const body = await c.req.json();
  const { name, price_monthly, posts_per_month_limit, ai_generations_limit, social_accounts_limit, trial_days } = body;
  if (!name) return c.json({ error: "name is required" }, 400);
  const id = name.toLowerCase().replace(/\s+/g, "_");
  await c.env.mypilotpost
    .prepare(`
      INSERT OR REPLACE INTO plans
        (id, name, price_monthly, price_cents, posts_per_month_limit, ai_generations_limit,
         social_accounts_limit, trial_days, is_active, billing_interval, currency, features_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'monthly', 'ZAR', '[]')
    `)
    .bind(id, name, price_monthly || 0, price_monthly || 0, posts_per_month_limit || 30, ai_generations_limit || 10, social_accounts_limit || 3, trial_days || 14)
    .run();
  return c.json({ success: true, id });
});

adminRoutes.put("/pricing/:id", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "pricing:write")) return c.json({ error: "Access denied" }, 403);

  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, price_monthly, posts_per_month_limit, ai_generations_limit, social_accounts_limit, trial_days } = body;
  await c.env.mypilotpost
    .prepare(`
      UPDATE plans SET name=?, price_monthly=?, price_cents=?, posts_per_month_limit=?,
        ai_generations_limit=?, social_accounts_limit=?, trial_days=?
      WHERE id=?
    `)
    .bind(name, price_monthly || 0, price_monthly || 0, posts_per_month_limit || 30, ai_generations_limit || 10, social_accounts_limit || 3, trial_days || 14, id)
    .run();
  return c.json({ success: true });
});

adminRoutes.patch("/pricing/:id/toggle", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "pricing:write")) return c.json({ error: "Access denied" }, 403);

  const { id } = c.req.param();
  await c.env.mypilotpost
    .prepare("UPDATE plans SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ success: true });
});

// ─── PROMOTIONS ───────────────────────────────────────────────────────────────

adminRoutes.get("/promotions", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "promotions:read")) return c.json({ error: "Access denied" }, 403);

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT id, code, name, discount_type, discount_value, max_uses, uses_count, is_active, expires_at, created_at
      FROM promotions ORDER BY created_at DESC LIMIT 100
    `)
    .all();
  return c.json({ promotions: results || [] });
});

adminRoutes.post("/promotions", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "promotions:write")) return c.json({ error: "Access denied" }, 403);

  const body = await c.req.json();
  const { code, discount_type, discount_value, max_uses, expires_at, name } = body;
  if (!code || !discount_type || discount_value == null) {
    return c.json({ error: "code, discount_type, discount_value are required" }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.mypilotpost
    .prepare(`
      INSERT INTO promotions (id, code, name, discount_type, discount_value, max_uses, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(id, code.toUpperCase(), name || null, discount_type, discount_value, max_uses || null, expires_at || null, payload.user_id)
    .run();
  return c.json({ success: true, id });
});

// ─── BLOG ─────────────────────────────────────────────────────────────────────

adminRoutes.get("/blog", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "blog:read")) return c.json({ error: "Access denied" }, 403);

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT id, title, slug, status, category, published_at, author, created_at
      FROM marketing_blog_posts ORDER BY created_at DESC LIMIT 100
    `)
    .all();
  return c.json({ posts: results || [] });
});

adminRoutes.post("/blog", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "blog:write")) return c.json({ error: "Access denied" }, 403);

  const body = await c.req.json();
  const { title, slug, excerpt, content_html, featured_image, category, status, author, published_at } = body;
  if (!title || !slug) return c.json({ error: "title and slug are required" }, 400);
  const id = crypto.randomUUID();
  await c.env.mypilotpost
    .prepare(`
      INSERT INTO marketing_blog_posts
        (id, title, slug, excerpt, content_html, featured_image, category, status, author, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(id, title, slug, excerpt || null, content_html || "", featured_image || null, category || null, status || "draft", author || "myPilotPost Team", published_at || null)
    .run();
  return c.json({ success: true, id });
});

adminRoutes.patch("/blog/:id", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "blog:write")) return c.json({ error: "Access denied" }, 403);

  const { id } = c.req.param();
  const body = await c.req.json();
  const { title, slug, excerpt, content_html, featured_image, category, status, author, published_at } = body;
  await c.env.mypilotpost
    .prepare(`
      UPDATE marketing_blog_posts
      SET title=?, slug=?, excerpt=?, content_html=?, featured_image=?, category=?,
          status=?, author=?, published_at=?, updated_at=datetime('now')
      WHERE id=?
    `)
    .bind(title, slug, excerpt || null, content_html || "", featured_image || null, category || null, status || "draft", author || "myPilotPost Team", published_at || null, id)
    .run();
  return c.json({ success: true });
});

adminRoutes.delete("/blog/:id", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "blog:write")) return c.json({ error: "Access denied" }, 403);

  const { id } = c.req.param();
  await c.env.mypilotpost.prepare("DELETE FROM marketing_blog_posts WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// ─── SUPPORT ─────────────────────────────────────────────────────────────────

adminRoutes.get("/support/threads", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "support:read")) return c.json({ error: "Access denied" }, 403);

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT sm.sender_id, u.email as sender_email,
        COUNT(sm.id) as message_count,
        SUM(CASE WHEN sm.sender_type = 'customer' THEN 1 ELSE 0 END) as unread_count,
        MAX(sm.created_at) as last_message_at
      FROM support_messages sm
      LEFT JOIN users u ON u.id = sm.sender_id
      WHERE sm.sender_type = 'customer'
      GROUP BY sm.sender_id
      ORDER BY last_message_at DESC
      LIMIT 50
    `)
    .all();
  return c.json({ threads: results || [] });
});

adminRoutes.post("/support/message", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "support:write")) return c.json({ error: "Access denied" }, 403);

  const { receiver_id, message } = await c.req.json();
  if (!receiver_id || !message) return c.json({ error: "receiver_id and message are required" }, 400);
  const id = crypto.randomUUID();
  await c.env.mypilotpost
    .prepare("INSERT INTO support_messages (id, thread_id, sender_type, sender_id, message) VALUES (?, ?, 'admin', ?, ?)")
    .bind(id, `admin_${receiver_id}`, payload.user_id, message)
    .run();
  return c.json({ success: true });
});

adminRoutes.post("/support/broadcast", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "messaging:write")) return c.json({ error: "Access denied" }, 403);

  const { message, filter } = await c.req.json();
  if (!message) return c.json({ error: "message is required" }, 400);

  let query = "SELECT id FROM users WHERE (role = 'user' OR role IS NULL) AND is_active = 1";
  const binds: string[] = [];
  if (filter?.plan_id) { query += " AND plan_id = ?"; binds.push(filter.plan_id); }

  const { results: users } = await c.env.mypilotpost.prepare(query).bind(...binds).all();
  const stmt = c.env.mypilotpost.prepare(
    "INSERT INTO support_messages (id, thread_id, sender_type, sender_id, message) VALUES (?, ?, 'admin', ?, ?)"
  );
  let sent = 0;
  for (const user of users) {
    await stmt.bind(crypto.randomUUID(), `admin_${user.id}`, payload.user_id, message).run();
    sent++;
  }
  return c.json({ success: true, sent });
});

// ─── COMPLIANCE ───────────────────────────────────────────────────────────────

adminRoutes.get("/compliance/deletions", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) return c.json({ error: "Access denied" }, 403);

  const status = c.req.query("status") || "pending";
  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT dr.id, dr.user_id, dr.requested_at, dr.scheduled_for, dr.status, dr.reason, u.email
      FROM deletion_requests dr
      LEFT JOIN users u ON u.id = dr.user_id
      WHERE dr.status = ?
      ORDER BY dr.requested_at DESC LIMIT 50
    `)
    .bind(status)
    .all();
  return c.json({ deletions: results || [] });
});

adminRoutes.get("/compliance/exports", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) return c.json({ error: "Access denied" }, 403);

  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT er.id, er.user_id, er.requested_at, er.status, er.format, u.email
      FROM export_requests er
      LEFT JOIN users u ON u.id = er.user_id
      ORDER BY er.requested_at DESC LIMIT 50
    `)
    .all();
  return c.json({ exports: results || [] });
});

adminRoutes.get("/compliance/audit-log", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "operations:read")) return c.json({ error: "Access denied" }, 403);

  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const { results } = await c.env.mypilotpost
    .prepare(`
      SELECT al.id, al.action as event_type, al.target_type, al.created_at, u.email
      FROM admin_audit_logs al
      LEFT JOIN users u ON u.id = al.admin_id
      ORDER BY al.created_at DESC LIMIT ?
    `)
    .bind(limit)
    .all();
  return c.json({ events: results || [] });
});

// ─── OPERATIONS ───────────────────────────────────────────────────────────────

adminRoutes.get("/operations/health", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "operations:read")) return c.json({ error: "Access denied" }, 403);

  const delivery = await c.env.mypilotpost
    .prepare(`
      SELECT SUM(CASE WHEN state = 'failed' AND created_at > datetime('now', '-1 hour') THEN 1 ELSE 0 END) as failures
      FROM content_delivery_jobs
    `)
    .first();
  return c.json({
    ai_generations_last_hour: 0,
    oauth_failures_24h: 0,
    delivery_failures_last_hour: delivery?.failures || 0
  });
});

adminRoutes.get("/system/status", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "operations:read")) return c.json({ error: "Access denied" }, 403);

  const delivery = await c.env.mypilotpost
    .prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN state = 'delivered' THEN 1 ELSE 0 END) as delivered
      FROM content_delivery_jobs
      WHERE created_at > datetime('now', '-24 hours')
    `)
    .first();

  const total = delivery?.total || 0;
  const failed = delivery?.failed || 0;
  const fail_rate = total > 0 ? failed / total : 0;

  return c.json({
    status: fail_rate > 0.3 ? "degraded" : "operational",
    delivery_24h: { total, failed, delivered: delivery?.delivered || 0, fail_rate },
    recent_events: []
  });
});
