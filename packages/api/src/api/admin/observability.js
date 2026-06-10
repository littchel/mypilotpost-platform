import { getDB } from "../../lib/db.js";
import { json } from "../../lib/json.js";

/**
 * Append-only admin observability event.
 * metadata should be a pre-serialised JSON string or null.
 */
export async function writeSystemEvent(env, event) {
  const db = getDB(env);
  const { severity = "info", source = "unknown", message, metadata = null } = event;
  if (!message) return;
  await db.prepare(`
    INSERT INTO admin_system_events (id, severity, source, message, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    severity,
    source,
    message,
    typeof metadata === 'string' ? metadata : (metadata ? JSON.stringify(metadata) : null)
  ).run();
}

/**
 * GET /api/v1/admin/overview
 * Real-time platform overview: users, brands, revenue, delivery, errors, integrations.
 */
export async function getAdminDashboardOverview(env) {
  const db = getDB(env);

  const [users, brands, mrr, delivery, errors, integrations] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active,
             SUM(CASE WHEN subscription_status = 'trial'  THEN 1 ELSE 0 END) as trial,
             SUM(CASE WHEN created_at > datetime('now','-7 days') THEN 1 ELSE 0 END) as new_7d
      FROM users WHERE role = 'user'
    `).first().catch(() => ({})),
    db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN created_at > datetime('now','-7 days') THEN 1 ELSE 0 END) as new_7d
      FROM brands
    `).first().catch(() => ({})),
    db.prepare(`
      SELECT SUM(COALESCE(p.price_cents, p.price_monthly * 100, 0)) as mrr_cents
      FROM users u JOIN plans p ON u.plan_id = p.id
      WHERE u.subscription_status = 'active'
    `).first().catch(() => ({})),
    db.prepare(`
      SELECT COUNT(*) as total_24h,
             SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_24h,
             SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) as failed_24h
      FROM delivery_jobs WHERE created_at > datetime('now','-24 hours')
    `).first().catch(() => ({})),
    db.prepare(`
      SELECT COUNT(*) as critical_events_24h
      FROM admin_system_events
      WHERE severity = 'critical' AND created_at > datetime('now','-24 hours')
    `).first().catch(() => ({})),
    db.prepare(`
      SELECT COUNT(*) as total_active
      FROM social_connections WHERE status = 'active'
    `).first().catch(() => ({})),
  ]);

  const deliveryTotal = delivery?.total_24h || 0;
  const deliveryFailed = delivery?.failed_24h || 0;

  return json({
    users: {
      total: users?.total || 0,
      active: users?.active || 0,
      trial: users?.trial || 0,
      new_7d: users?.new_7d || 0,
    },
    brands: {
      total: brands?.total || 0,
      new_7d: brands?.new_7d || 0,
    },
    revenue: {
      mrr_cents: mrr?.mrr_cents || 0,
      currency: 'ZAR',
    },
    delivery: {
      total_24h: deliveryTotal,
      published_24h: delivery?.published_24h || 0,
      failed_24h: deliveryFailed,
      fail_rate: deliveryTotal > 0 ? +(deliveryFailed / deliveryTotal).toFixed(3) : 0,
    },
    alerts: {
      critical_events_24h: errors?.critical_events_24h || 0,
    },
    integrations: {
      active_connections: integrations?.total_active || 0,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/v1/admin/audit-log
 * Queries admin_audit_logs (admin actions), not compliance_audit_log (customer actions).
 */
export async function getAdminAuditLog(request, env) {
  const db = getDB(env);
  const u = new URL(request.url);
  const page   = Math.max(1, parseInt(u.searchParams.get('page')   || '1'));
  const limit  = Math.min(100, parseInt(u.searchParams.get('limit') || '50'));
  const offset = (page - 1) * limit;
  const action = u.searchParams.get('action')   || null;
  const adminId = u.searchParams.get('admin_id') || null;
  const since  = u.searchParams.get('since')     || null;
  const until  = u.searchParams.get('until')     || null;

  let where = [];
  let binds = [];
  if (action)  { where.push("action LIKE ?");      binds.push(`%${action}%`); }
  if (adminId) { where.push("admin_id = ?");        binds.push(adminId); }
  if (since)   { where.push("created_at >= ?");     binds.push(since); }
  if (until)   { where.push("created_at <= ?");     binds.push(until); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, countRow] = await Promise.all([
    db.prepare(`
      SELECT id, admin_id, action, target_type, target_id, metadata_json,
             substr(COALESCE(ip_address,''), 1, instr(COALESCE(ip_address,'')||'.', '.') - 1) || '.x.x.x' AS ip_masked,
             created_at
      FROM admin_audit_logs ${whereSQL}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...binds, limit, offset).all(),
    db.prepare(`SELECT COUNT(*) as count FROM admin_audit_logs ${whereSQL}`)
      .bind(...binds).first(),
  ]);

  return json({
    items:  rows.results || [],
    page,
    limit,
    total:  countRow?.count || 0,
  });
}
