import { Hono } from "hono";
import { register, login, verifyEmail, forgotPassword, resetPassword } from "../auth/customer.js";

export const publicRoutes = new Hono();

// Auth Endpoints (Base is /api/v1)
publicRoutes.post("/auth/register", (c) => register(c.req.raw, c.env));
publicRoutes.post("/auth/login", (c) => login(c.req.raw, c.env));
publicRoutes.post("/auth/verify-email", (c) => verifyEmail(c.req.raw, c.env));
publicRoutes.post("/auth/forgot-password", (c) => forgotPassword(c.req.raw, c.env));
publicRoutes.post("/auth/reset-password", (c) => resetPassword(c.req.raw, c.env));

publicRoutes.post("/missions", async (c) => {
  return c.json({ success: true, message: "Mission created (stub)" });
});
