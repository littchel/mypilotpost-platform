import { Hono } from "hono";

export const publicRoutes = new Hono();

publicRoutes.post("/missions", async (c) => {
  return c.json({ success: true, message: "Mission created (stub)" });
});
