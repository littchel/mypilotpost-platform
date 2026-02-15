/**
 * myPilotPost — API Router
 * AUTHORITATIVE • PRODUCTION • V1 LOCKED
 */

import { json } from "./lib/json.js";

/* ======================================================
   AUTH
====================================================== */
import { googleStart, googleCallback } from "./auth/google.js";
import { requireAuth } from "./auth/middleware.js";

import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword
} from "./auth/customer.js";

/* ======================================================
   ADMIN AUTH
====================================================== */
function requireAdmin(request, env) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}

/* ======================================================
   CORE
====================================================== */
import { getDashboardSummary } from "./core/dashboard/summary.js";
import { getActivity } from "./core/dashboard/activity.js";

import {
  getNotifications,
  markNotificationRead
} from "./core/notifications/notifications.js";

import {
  createBrand,
  listBrands,
  switchBrand
} from "./core/brands/brands.js";

/* ======================================================
   CONTENT
====================================================== */
import {
  createSocialAsset,
  getSocialAsset,
  updateSocialAsset
} from "./core/content/social.js";

import {
  createBlogPost,
  getBlogPost,
  updateBlogPost,
  markBlogReady,
  scheduleBlogPost
} from "./core/content/blog.js";

import {
  saveSocialVariants,
  getSocialVariants
} from "./core/content/social_variants.js";

import {
  listContent,
  getDrafts,
  getScheduled,
  updateContent
} from "./core/content/drafts.js";

/* ======================================================
   AI (GENERATION ONLY — NOT ANALYTICS)
====================================================== */
import { generateHashtags } from "./core/ai/hashtags.js";
import { grammarCheck } from "./core/ai/grammar.js";
import { generateSocialContent } from "./core/ai/social_generate.js";
import { generateBlogArticle } from "./core/ai/blog_generate.js";

/* ======================================================
   MEDIA
====================================================== */
import {
  uploadMedia,
  listMedia,
  attachMedia,
  detachMedia,
  registerFreepikMedia
} from "./core/media/media.js";

/* 🔒 CANON 3 — MEDIA PROVIDERS */
import { importFromGoogleDrive } from "./core/media/providers/google-drive.js";
import { importFromDropbox } from "./core/media/providers/dropbox.js";
import { importFromCanva } from "./core/media/providers/canva.js";

/* ======================================================
   SCHEDULE
====================================================== */
import {
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule
} from "./core/schedule/schedule.js";

/* ======================================================
   CAMPAIGNS
====================================================== */
import {
  createCampaign,
  updateCampaign,
  listCampaigns,
  attachCampaignContent
} from "./core/campaigns/campaigns.js";

/* ======================================================
   ADMIN — CAMPAIGNS & EMAILS
====================================================== */
import {
  handleCampaigns,
  handleCampaignContent,
  handleEmailCampaigns,
  handleEmailMessages,
  handleEmailTemplates
} from "./api/admin/campaigns-emails.js";

/* ======================================================
   ONBOARDING
====================================================== */
import {
  createBrandOnboarding,
  updateBrandOnboarding
} from "./core/onboarding/onboarding.js";

import {
  ingestWebsite,
  ingestSocial
} from "./core/onboarding/ingest.js";

import {
  listPlatforms,
  savePlatforms,
  connectPlatform,
  disconnectPlatform
} from "./core/onboarding/platforms.js";

import { getReadiness } from "./core/onboarding/readiness.js";

/* ======================================================
   CUSTOMER ANALYTICS (AUTHORITATIVE)
====================================================== */
import {
  getAnalyticsOverview,
  getContentAnalytics,
  getPlatformAnalytics,
  getOperationalAnalytics,
  getCampaignAnalytics
} from "./core/analytics/analytics.js";

/* ======================================================
   REPORTS
====================================================== */
import {
  getSocialReport,
  generateSocialReportPDF
} from "./core/reports/social/controller.js";

/* ======================================================
   ERROR HANDLER
====================================================== */
function handleError(err) {
  const status = err?.status || 500;
  console.error(`[API ${status}]`, err?.message || err);
  return json(
    { error: status === 500 ? "Internal server error" : err.message },
    status
  );
}

/* ======================================================
   WORKER ENTRY
====================================================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const method = request.method;

    try {
      /* ================= HEALTH ================= */
      if (method === "GET" && path === "/api/health") {
        return json({ status: "ok", service: "mypilotpost-api" });
      }

      /* ================= PUBLIC BLOG ================= */
      if (method === "GET" && path === "/api/public/blog") {
        const { results } = await env.DB.prepare(`
          SELECT id, slug, title, excerpt, featured_image_url, published_at
          FROM content_blog_posts
          WHERE status = 'PUBLISHED'
          ORDER BY published_at DESC
          LIMIT 20
        `).all();

        return json({ posts: results || [] });
      }

      if (
        method === "GET" &&
        path.startsWith("/api/public/blog/") &&
        path.split("/").length === 5
      ) {
        const slug = path.split("/")[4];

        const post = await env.DB.prepare(`
          SELECT id, title, content_html, seo_title, seo_description, published_at
          FROM content_blog_posts
          WHERE slug = ? AND status = 'PUBLISHED'
          LIMIT 1
        `).bind(slug).first();

        if (!post) {
          return json({ error: "Not found" }, 404);
        }

        return json({ post });
      }

      /* ================= PUBLIC AUTH ================= */
      if (method === "POST" && path === "/api/customer/register")
        return register(request, env);

      if (method === "POST" && path === "/api/customer/login")
        return login(request, env);

      if (method === "POST" && path === "/api/customer/verify-email")
        return verifyEmail(request, env);

      if (method === "POST" && path === "/api/customer/forgot-password")
        return forgotPassword(request, env);

      if (method === "POST" && path === "/api/customer/reset-password")
        return resetPassword(request, env);

      /* ================= OAUTH ================= */
      if (method === "GET" && path === "/api/customer/oauth/google/start")
        return googleStart(request, env);

      if (method === "GET" && path === "/api/customer/oauth/google/callback")
        return googleCallback(request, env);

      /* ================= ADMIN ================= */
      if (path.startsWith("/api/admin")) {
        requireAdmin(request, env);

        if (path === "/api/admin/campaigns")
          return handleCampaigns(request, env);

        if (path.startsWith("/api/admin/campaigns/") && path.endsWith("/content"))
          return handleCampaignContent(request, env, path.split("/")[4]);

        if (path === "/api/admin/emails/campaigns")
          return handleEmailCampaigns(request, env);

        if (path === "/api/admin/emails/messages")
          return handleEmailMessages(request, env);

        if (path === "/api/admin/emails/templates")
          return handleEmailTemplates(request, env);
      }

      /* ================= CUSTOMER (PROTECTED) ================= */
      if (path.startsWith("/api/customer")) {
        const auth = await requireAuth(request, env);

        /* ---------- BRANDS ---------- */
        if (method === "POST" && path === "/api/customer/brands/create")
          return createBrand(request, env, auth);

        if (method === "POST" && path === "/api/customer/brands/switch")
          return switchBrand(request, env, auth);

        /* ---------- CONTENT ---------- */
        if (method === "POST" && path === "/api/customer/content/blog")
          return createBlogPost(request, env, auth);

        if (
          method === "POST" &&
          path.startsWith("/api/customer/content/blog/") &&
          path.endsWith("/ready")
        )
          return markBlogReady(request, env, auth);

        if (
          method === "POST" &&
          path.startsWith("/api/customer/content/blog/") &&
          path.endsWith("/schedule")
        )
          return scheduleBlogPost(request, env, auth);

        if (
          method === "GET" &&
          path.startsWith("/api/customer/content/blog/") &&
          !path.endsWith("/ready") &&
          !path.endsWith("/schedule")
        )
          return getBlogPost(request, env, auth);

        if (
          method === "PATCH" &&
          path.startsWith("/api/customer/content/blog/") &&
          !path.endsWith("/ready") &&
          !path.endsWith("/schedule")
        )
          return updateBlogPost(request, env, auth);

        if (method === "POST" && path === "/api/customer/content/social")
          return createSocialAsset(request, env, auth);

        if (method === "GET" && path.startsWith("/api/customer/content/social/"))
          return getSocialAsset(request, env, auth);

        if (method === "PATCH" && path.startsWith("/api/customer/content/social/"))
          return updateSocialAsset(request, env, auth);

        if (method === "GET" && path === "/api/customer/content")
          return listContent(request, env, auth);

        if (method === "GET" && path === "/api/customer/content/drafts")
          return getDrafts(request, env, auth);

        if (method === "GET" && path === "/api/customer/content/scheduled")
          return getScheduled(request, env, auth);

        if (method === "PUT" && path === "/api/customer/content")
          return updateContent(request, env, auth);

        /* ---------- MEDIA ---------- */
        if (method === "POST" && path === "/api/customer/media")
          return uploadMedia(request, env, auth);

        if (method === "GET" && path === "/api/customer/media")
          return listMedia(request, env, auth);

        if (method === "POST" && path === "/api/customer/media/attach")
          return attachMedia(request, env, auth);

        if (method === "POST" && path === "/api/customer/media/detach")
          return detachMedia(request, env, auth);

        if (method === "POST" && path === "/api/customer/media/from-google-drive")
          return importFromGoogleDrive(request, env, auth);

        if (method === "POST" && path === "/api/customer/media/from-dropbox")
          return importFromDropbox(request, env, auth);

        if (method === "POST" && path === "/api/customer/media/from-canva")
          return importFromCanva(request, env, auth);

        /* ---------- ANALYTICS (CUSTOMER ONLY) ---------- */
        if (method === "GET" && path === "/api/customer/analytics/overview")
          return getAnalyticsOverview(request, env, auth);

        if (method === "GET" && path === "/api/customer/analytics/content")
          return getContentAnalytics(request, env, auth);

        if (method === "GET" && path === "/api/customer/analytics/platforms")
          return getPlatformAnalytics(request, env, auth);

        if (method === "GET" && path === "/api/customer/analytics/operations")
          return getOperationalAnalytics(request, env, auth);

        if (method === "GET" && path === "/api/customer/analytics/campaigns")
          return getCampaignAnalytics(request, env, auth);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return handleError(err);
    }
  }
};
