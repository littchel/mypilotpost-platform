/**
 * myPilotPost — Worker Entry
 * File: packages/api/src/index.js
 *
 * RESPONSIBILITIES:
 * - HTTP API (Hono)
 * - Cron orchestration (background engines)
 *
 * HARD RULES:
 * - Cron must NEVER throw
 * - Cron must NEVER block fetch
 * - Each cron engine is isolated & fail-soft
 */
import { SupportChatRoom } from "./core/realtime/ChatRoom.js";
export { SupportChatRoom };

import { Hono } from "hono";
import { cors } from "hono/cors";

import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import { supportRoutes } from "./routes/support";

/* ================== CRON ENGINES ================== */

/* Phase 3 — Delivery Engine */
import { runDeliveryScheduler } from "./core/delivery/scheduler.js";

/* Phase 2 — SEO Center */
// import { runSeoCron } from "./core/seo/cron.js";

/* ===================================================
   APP INIT
=================================================== */

const app = new Hono();

/* -------------------------------------------------
 * Global Middleware
 * ------------------------------------------------- */
app.use("*", cors());

/* -------------------------------------------------
 * Health Check (Zero Dependency)
 * ------------------------------------------------- */
app.get("/api/health", (c) =>
  c.json({
    status: "ONLINE",
    service: "mypilotpost-api",
    version: "1.0.0",
    environment: c.env?.ENVIRONMENT || "unknown",
  })
);

/* -------------------------------------------------
 * Route Groups
 * ------------------------------------------------- */
app.route("/api/v1", publicRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/support", supportRoutes);

/* ===================================================
   CLOUDFLARE WORKER ENTRY
=================================================== */

export default {
  /**
   * HTTP handler
   */
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  /**
   * Scheduled (Cron) handler
   *
   * Engines:
   * 1. Delivery Scheduler (Phase 3)
   * 2. SEO Cron (Phase 2)
   *
   * IMPORTANT:
   * - Engines are independent
   * - Failure in one must NOT affect the other
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        /* ------------------ DELIVERY ENGINE ------------------ */
        try {
          console.log("[CRON] Delivery scheduler started");
          await runDeliveryScheduler(env, ctx);
          console.log("[CRON] Delivery scheduler completed");
        } catch (err) {
          console.error("[CRON] Delivery scheduler failed", {
            error: err?.message || err,
          });
        }

        /* ------------------ SEO ENGINE ------------------ */
        /* Phase 2 — SEO Center (Disabled: Missing cron.js)
        try {
          console.log("[CRON] SEO cron started");
          await runSeoCron(env);
          console.log("[CRON] SEO cron completed");
        } catch (err) {
          console.error("[CRON] SEO cron failed", {
            error: err?.message || err,
          });
        }
        */
      })()
    );
  },
};
