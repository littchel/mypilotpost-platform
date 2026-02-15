/**
 * Admin Customers API — PRODUCTION CANON
 *
 * IMPORTANT:
 * - Backed by `brands`
 * - Displayed as "customers" in Admin UI
 * - Drill-down is PER BRAND
 *
 * Routes:
 *   GET /api/admin/customers
 *   GET /api/admin/customers/:brandId
 */

import { json } from "../../lib/json.js";

/* =====================================================
   LIST ALL CUSTOMERS (BRANDS)
===================================================== */
export async function handleAdminCustomers(request, env) {
  const { results } = await env.mypilotpost
    .prepare(`
      SELECT
        b.id               AS brand_id,
        b.customer_id      AS customer_id,
        b.name             AS name,
        b.industry         AS industry,
        b.created_at       AS created_at,

        COALESCE(c.plan, 'free') AS plan,
        COALESCE(c.mrr, 0)       AS mrr,

        COALESCE(u.delivered, 0) AS delivered,
        COALESCE(u.total, 0)     AS total,

        CASE
          WHEN u.total > 0
          THEN u.delivered * 1.0 / u.total
          ELSE 0
        END AS success_ratio,

        CASE
          WHEN u.total > 0
          THEN (u.total - u.delivered) * 1.0 / u.total
          ELSE 0
        END AS failed_delivery_rate

      FROM brands b
      LEFT JOIN customers c
        ON c.id = b.customer_id
      LEFT JOIN usage_metrics u
        ON u.customer_id = b.id

      ORDER BY b.created_at DESC
    `)
    .all();

  return json({ customers: results ?? [] });
}

/* =====================================================
   SINGLE CUSTOMER (SINGLE BRAND DRILL-DOWN)
===================================================== */
export async function handleAdminCustomerById(request, env) {
  const brandId = request.url.split("/").pop();

  const brand = await env.mypilotpost
    .prepare(`
      SELECT
        b.id               AS brand_id,
        b.customer_id      AS customer_id,
        b.name             AS name,
        b.industry         AS industry,
        b.created_at       AS created_at,

        COALESCE(c.plan, 'free') AS plan,
        COALESCE(c.mrr, 0)       AS mrr,

        COALESCE(u.generations, 0) AS generations,
        COALESCE(u.scheduled, 0)   AS scheduled,
        COALESCE(u.delivered, 0)   AS delivered,
        COALESCE(u.total, 0)       AS total,

        CASE
          WHEN u.total > 0
          THEN u.delivered * 1.0 / u.total
          ELSE 0
        END AS success_ratio

      FROM brands b
      LEFT JOIN customers c
        ON c.id = b.customer_id
      LEFT JOIN usage_metrics u
        ON u.customer_id = b.id

      WHERE b.id = ?
      LIMIT 1
    `)
    .bind(brandId)
    .first();

  if (!brand) {
    return json({ error: "Customer not found" }, 404);
  }

  return json(brand);
}
