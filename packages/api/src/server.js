/**
 * myPilotPost — API Router
 * AUTHORITATIVE • PRODUCTION • V1 LOCKED
 */

import { json } from "./lib/json.js";

/* ======================================================
   AUTH
====================================================== */
import { googleStart, googleCallback } from "./auth/google.js";

/* 🔒 NEW OAUTH PROVIDERS (ADDITIVE ONLY) */
import { linkedinStart, linkedinCallback } from "./auth/linkedin.js";
import { facebookStart, facebookCallback } from "./auth/facebook.js";
import { xStart, xCallback } from "./auth/x.js";
import { pinterestStart, pinterestCallback } from "./auth/pinterest.js";
import { youtubeStart, youtubeCallback } from "./auth/youtube.js";
import { googleAnalyticsStart, googleAnalyticsCallback } from "./auth/google-analytics.js";
import { canvaStart, canvaCallback } from "./auth/canva.js";
import { tiktokStart, tiktokCallback } from "./auth/tiktok.js";  // ✅ FIXED: Removed /providers/ from path

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
   PERFORMANCE INGESTION (CANON 5.5 EXTENSION)
====================================================== */
import { runPerformanceIngestion } from "./core/delivery/performance/engine.js";

/* ======================================================
   REPORTS
====================================================== */
import {
  getSocialReport,
  generateSocialReportPDF
} from "./core/reports/social/controller.js";

/* ======================================================
   MARKETING BLOG
====================================================== */
import {
  createMarketingPost,
  listMarketingPosts,
  updateMarketingPost,
  deleteMarketingPost,
  publicListMarketingPosts,
  publicGetMarketingPost
} from "./core/marketing/blog.js";

/* ======================================================
   DELIVERY ENGINE
====================================================== */
import { executeDeliveryJob } from "./core/delivery/poster.js";

/* ======================================================
   CORS HEADERS
====================================================== */
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.mypilotpost.com",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
};

/* ======================================================
   ERROR HANDLER
====================================================== */
function handleError(err) {
  const status = err?.status || 500;
  console.error(`[API ${status}]`, err?.message || err);
  return json(
    { error: status === 500 ? "Internal server error" : err.message },
    status,
    { ...corsHeaders }
  );
}

/* ======================================================
   RESPONSE WRAPPER (CORS SAFE)
====================================================== */
async function withCors(responsePromise) {
  try {
    const response = await responsePromise;
    
    if (!response) {
      return new Response(
        JSON.stringify({ error: "Empty response" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

/* ======================================================
   WORKER ENTRY
====================================================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    const method = request.method;

    // Handle OPTIONS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      /* ================= HEALTH ================= */
      if (method === "GET" && path === "/api/health") {
        return json({ status: "ok", service: "mypilotpost-api" }, 200, { ...corsHeaders });
      }

      /* ================= INTERNAL PERFORMANCE INGESTION ================= */
      if (method === "POST" && path === "/api/internal/performance/ingest") {
        await runPerformanceIngestion(env);
        return json({ success: true }, 200, { ...corsHeaders });
      }

      /* ================= INTERNAL DELIVERY JOB EXECUTION ================= */
      if (method === "POST" && path === "/api/internal/delivery/run") {
        requireAdmin(request, env);

        const { results } = await env.DB.prepare(`
          SELECT *
          FROM delivery_jobs
          WHERE status = 'scheduled'
          ORDER BY scheduled_at ASC
        `).all();

        for (const job of results) {
          await executeDeliveryJob(env, job);
        }

        return json({ executed: results.length });
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

        return json({ posts: results || [] }, 200, { ...corsHeaders });
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
          return json({ error: "Not found" }, 404, { ...corsHeaders });
        }

        return json({ post }, 200, { ...corsHeaders });
      }

      /* ================= PUBLIC MARKETING BLOG ================= */
      if (method === "GET" && path === "/api/public/marketing/blog")
        return withCors(publicListMarketingPosts(request, env));

      if (
        method === "GET" &&
        path.startsWith("/api/public/marketing/blog/")
      ) {
        const slug = path.split("/")[5];
        return withCors(publicGetMarketingPost(request, env, slug));
      }

      /* ================= PUBLIC AUTH ================= */
      if (method === "POST" && path === "/api/customer/register")
        return withCors(register(request, env));

      if (method === "POST" && path === "/api/customer/login")
        return withCors(login(request, env));

      if (method === "POST" && path === "/api/customer/verify-email")
        return withCors(verifyEmail(request, env));

      if (method === "POST" && path === "/api/customer/forgot-password")
        return withCors(forgotPassword(request, env));

      if (method === "POST" && path === "/api/customer/reset-password")
        return withCors(resetPassword(request, env));

      /* ================= OAUTH STARTS (PUBLIC) ================= */
      if (method === "GET" && path === "/api/customer/oauth/google/start")
        return googleStart(request, env);

      /* ================= OAUTH CALLBACKS (ALL PUBLIC - NO AUTH REQUIRED) ================= */
      if (method === "GET" && path === "/api/customer/oauth/google/callback")
        return googleCallback(request, env);

      if (method === "GET" && path === "/api/customer/oauth/linkedin/callback")
        return linkedinCallback(request, env);

      if (method === "GET" && path === "/api/customer/oauth/facebook/callback")
        return facebookCallback(request, env);

      if (method === "GET" && path === "/api/customer/oauth/x/callback")
        return xCallback(request, env);

      if (method === "GET" && path === "/api/customer/oauth/pinterest/callback")
        return pinterestCallback(request, env);

      if (method === "GET" && path === "/api/customer/oauth/youtube/callback")
        return youtubeCallback(request, env);

      if (method === "GET" && path === "/api/customer/oauth/google-analytics/callback")
        return googleAnalyticsCallback(request, env);

      /* 🔓 PUBLIC - CANVA CALLBACK MUST BE ABOVE requireAuth BLOCK */
      if (method === "GET" && path === "/api/customer/oauth/canva/callback")
        return canvaCallback(request, env);

      /* 🔓 PUBLIC - TIKTOK CALLBACK (ABOVE requireAuth) */
      if (method === "GET" && path === "/api/customer/oauth/tiktok/callback")
        return tiktokCallback(request, env);

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

      /* ======================================================
         CUSTOMER (PROTECTED)
      ====================================================== */
      if (path.startsWith("/api/customer")) {
        const auth = await requireAuth(request, env);

        /* ---------- PLATFORM OAUTH STARTS (PROTECTED) ---------- */
        if (method === "GET" && path === "/api/customer/oauth/linkedin/start")
          return linkedinStart(request, env, auth);

        if (method === "GET" && path === "/api/customer/oauth/facebook/start")
          return facebookStart(request, env, auth);

        if (method === "GET" && path === "/api/customer/oauth/x/start")
          return xStart(request, env, auth);

        if (method === "GET" && path === "/api/customer/oauth/pinterest/start")
          return pinterestStart(request, env, auth);

        if (method === "GET" && path === "/api/customer/oauth/youtube/start")
          return youtubeStart(request, env, auth);

        if (method === "GET" && path === "/api/customer/oauth/google-analytics/start")
          return googleAnalyticsStart(request, env, auth);

        /* 🔐 PROTECTED - CANVA START MUST BE JWT PROTECTED */
        if (method === "GET" && path === "/api/customer/oauth/canva/start")
          return canvaStart(request, env, auth);

        /* 🔐 PROTECTED - TIKTOK START (JWT PROTECTED) */
        if (method === "GET" && path === "/api/customer/oauth/tiktok/start")
          return tiktokStart(request, env, auth);

        /* ---------- BRANDS ---------- */
        if (method === "POST" && path === "/api/customer/brands/create")
          return withCors(createBrand(request, env, auth));

        if (method === "GET" && path === "/api/customer/brands")
          return withCors(listBrands(request, env, auth));

        if (method === "POST" && path === "/api/customer/brands/switch")
          return withCors(switchBrand(request, env, auth));

        /* ---------- SCHEDULE ---------- */
        if (method === "GET" && path === "/api/customer/schedule")
          return withCors(getSchedule(request, env, auth));

        if (method === "POST" && path === "/api/customer/schedule")
          return withCors(createSchedule(request, env, auth));

        if (method === "PUT" && path.startsWith("/api/customer/schedule/")) {
          const jobId = path.split("/")[4];
          return withCors(updateSchedule(request, env, auth, jobId));
        }

        if (method === "DELETE" && path.startsWith("/api/customer/schedule/")) {
          const jobId = path.split("/")[4];
          return withCors(deleteSchedule(request, env, auth, jobId));
        }

        /* ---------- MARKETING BLOG (ADMIN) ---------- */
        if (method === "POST" && path === "/api/customer/marketing/blog")
          return withCors(createMarketingPost(request, env, auth));

        if (method === "GET" && path === "/api/customer/marketing/blog")
          return withCors(listMarketingPosts(request, env, auth));

        /* ---------- GET SINGLE MARKETING POST (ADMIN) ---------- */
        if (
          method === "GET" &&
          path.startsWith("/api/customer/marketing/blog/") &&
          path.split("/").length === 6
        ) {
          const id = path.split("/")[5];

          const response = await (async () => {
            const post = await env.DB.prepare(`
              SELECT *
              FROM marketing_blog_posts
              WHERE id = ?
              LIMIT 1
            `).bind(id).first();

            if (!post) {
              return json({ error: "Not found" }, 404);
            }

            return json({ post });
          })();

          return withCors(Promise.resolve(response));
        }

        if (method === "PATCH" && path.startsWith("/api/customer/marketing/blog/")) {
          const id = path.split("/")[5];
          return withCors(updateMarketingPost(request, env, auth, id));
        }

        if (method === "DELETE" && path.startsWith("/api/customer/marketing/blog/")) {
          const id = path.split("/")[5];
          return withCors(deleteMarketingPost(request, env, auth, id));
        }

        /* ---------- CONTENT ---------- */
        if (method === "POST" && path === "/api/customer/content/blog")
          return withCors(createBlogPost(request, env, auth));

        if (
          method === "POST" &&
          path.startsWith("/api/customer/content/blog/") &&
          path.endsWith("/ready")
        )
          return withCors(markBlogReady(request, env, auth));

        if (
          method === "POST" &&
          path.startsWith("/api/customer/content/blog/") &&
          path.endsWith("/schedule")
        )
          return withCors(scheduleBlogPost(request, env, auth));

        if (
          method === "GET" &&
          path.startsWith("/api/customer/content/blog/") &&
          !path.endsWith("/ready") &&
          !path.endsWith("/schedule")
        )
          return withCors(getBlogPost(request, env, auth));

        if (
          method === "PATCH" &&
          path.startsWith("/api/customer/content/blog/") &&
          !path.endsWith("/ready") &&
          !path.endsWith("/schedule")
        )
          return withCors(updateBlogPost(request, env, auth));

        if (method === "POST" && path === "/api/customer/content/social")
          return withCors(createSocialAsset(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/content/social/"))
          return withCors(getSocialAsset(request, env, auth));

        if (method === "PATCH" && path.startsWith("/api/customer/content/social/"))
          return withCors(updateSocialAsset(request, env, auth));

        if (method === "GET" && path === "/api/customer/content")
          return withCors(listContent(request, env, auth));

        if (method === "GET" && path === "/api/customer/content/drafts")
          return withCors(getDrafts(request, env, auth));

        if (method === "GET" && path === "/api/customer/content/scheduled")
          return withCors(getScheduled(request, env, auth));

        if (method === "PUT" && path === "/api/customer/content")
          return withCors(updateContent(request, env, auth));

        /* ---------- MEDIA ---------- */
        if (method === "POST" && path === "/api/customer/media")
          return withCors(uploadMedia(request, env, auth));

        if (method === "GET" && path === "/api/customer/media")
          return withCors(listMedia(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/attach")
          return withCors(attachMedia(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/detach")
          return withCors(detachMedia(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/freepik")
          return withCors(registerFreepikMedia(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-google-drive")
          return withCors(importFromGoogleDrive(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-dropbox")
          return withCors(importFromDropbox(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-canva")
          return withCors(importFromCanva(request, env, auth));

        /* ---------- ANALYTICS ---------- */
        if (method === "GET" && path === "/api/customer/analytics/overview")
          return withCors(getAnalyticsOverview(request, env, auth));

        if (method === "GET" && path === "/api/customer/analytics/content")
          return withCors(getContentAnalytics(request, env, auth));

        if (method === "GET" && path === "/api/customer/analytics/platforms")
          return withCors(getPlatformAnalytics(request, env, auth));

        if (method === "GET" && path === "/api/customer/analytics/operations")
          return withCors(getOperationalAnalytics(request, env, auth));

        if (method === "GET" && path === "/api/customer/analytics/campaigns")
          return withCors(getCampaignAnalytics(request, env, auth));
      }

      return json({ error: "Not found" }, 404, { ...corsHeaders });

    } catch (err) {
      return handleError(err);
    }
  }
};