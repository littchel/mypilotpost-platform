import { Hono } from "hono";
import { verifyJWT } from "../auth/jwt.js";
import { hasPermission } from "../auth/permissions.js";

export const adminRoutes = new Hono();

// Admin auth guard (RBAC Upgrade)
adminRoutes.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing Bearer Token" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    
    // Base guard: Must have some admin-level permission or specific role
    if (!['super_admin', 'operations', 'support', 'admin'].includes(payload.role)) {
      return c.json({ error: "Access denied: unauthorized role" }, 403);
    }

    c.set("jwtPayload", payload);
    await next();
  } catch (err) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

// Customers
adminRoutes.get("/customers", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "users:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.mypilotpost
    .prepare("SELECT * FROM customers ORDER BY created_at DESC")
    .all();

  return c.json({ success: true, data: results });
});

// MRR history
adminRoutes.get("/billing/mrr-history", async (c) => {
  const payload = c.get("jwtPayload");
  if (!hasPermission(payload.role, "analytics:read") && !hasPermission(payload.role, "billing:read")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.mypilotpost
    .prepare("SELECT date, mrr FROM mrr_history ORDER BY date DESC LIMIT 30")
    .all();

  return c.json({ success: true, data: results });
});
