import { Hono } from "hono";

export const adminRoutes = new Hono();

// Admin auth guard
adminRoutes.use("*", async (c, next) => {
  const secret = c.req.header("X-Admin-Secret");
  if (secret !== c.env.ADMIN_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Customers
adminRoutes.get("/customers", async (c) => {
  const { results } = await c.env.ADMIN_DB
    .prepare("SELECT * FROM customers ORDER BY created_at DESC")
    .all();

  return c.json({ success: true, data: results });
});

// MRR history
adminRoutes.get("/billing/mrr-history", async (c) => {
  const { results } = await c.env.ADMIN_DB
    .prepare("SELECT date, mrr FROM mrr_history ORDER BY date DESC LIMIT 30")
    .all();

  return c.json({ success: true, data: results });
});
