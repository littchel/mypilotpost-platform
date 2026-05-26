/**
 * myPilotPost — API Router
 * AUTHORITATIVE • PRODUCTION • V1 LOCKED
 */

import { json, error } from "./lib/json.js";
import { SupportChatRoom } from "./core/realtime/ChatRoom.js";

/* ======================================================
   AUTH
====================================================== */
/* 🔐 UNIFIED OAUTH & INTEGRATIONS (PHASE 1.1 HARDENED) */
import {
  startOAuth,
  handleCallback,
  listIntegrations,
  disconnectIntegration,
  listSocialConnections,
  disconnectSocialConnection,
  refreshConnectionOnDemand
} from "./integrations/handlers.js";

import {
  startUnifiedOAuth,
  handleUnifiedCallback
} from "./integrations/oauth_unified.js";

import { requireAuth, requirePermission, requireAdmin, requireBrandContext } from "./auth/middleware.js";
import { hasPermission } from "./auth/permissions.js";
import { logAdminAction } from "./lib/admin_logger.js";
import { getDB } from "./lib/db.js";
import { rateLimit } from "./lib/rate-limit.js";

import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  changePassword
} from "./auth/customer.js";

/* ======================================================
   ADMIN AUTH (COMPLETELY SEPARATE FROM CUSTOMER AUTH)
====================================================== */
import { adminLogin, requireAdminAuth } from "./auth/admin.js";

/* ======================================================
   CORE
====================================================== */
import { getDashboardSummary } from "./core/dashboard/summary.js";
import { getActivity } from "./core/dashboard/activity.js";
import { getExperienceSummary } from "./core/experience/engine.js";

import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  getPreferences,
  updatePreferences,
  getUnreadCount
} from "./core/notifications/notifications.js";

import {
  createBrand,
  createBrandRequest,
  listBrands,
  switchBrand
} from "./core/brands/brands.js";


import { getBrandIntelligence } from "./core/brands/brand-intelligence.js";
import { importBrandFromUrl } from "./core/brands/import.js";
import { getBrandDNA, updateBrandDNA } from "./core/brands/brand_dna.js";
import { getCompetitorBenchmarks, addCompetitor } from "./core/intelligence/competitor_engine.js";
import { generateOpportunities, listOpportunities, updateOpportunityStatus } from "./core/intelligence/opportunity_engine.js";
import { generateWeeklyPlan, getWeeklyPlan } from "./core/intelligence/weekly_planner.js";

/* ======================================================
   BACKEND FOUNDATION (CANON LOCK)
====================================================== */
import { createInvite, getInvites, getTeam, acceptInvite } from "./core/teams/handlers.js";
import { submitForApproval, getApprovalRequests } from "./core/approvals/handlers.js";
import { createReport, getReports, shareReport } from "./core/reporting/handlers.js";
import { approveSocialAssetsBulk } from "./core/content/social.js";
import { 
  getGrowthSummary, 
  getGrowthActivity, 
  getGrowthRewards, 
  processGrowthAction, 
  registerReferral as registerGrowthReferral 
} from "./core/growth/handlers.js";
import { listInsights, resolveInsight, listAudits, getFullAudit } from "./core/intelligence/handlers.js";
import { runPublicAudit, captureAuditLead, getPublicAuditById } from "./core/intelligence/public_audit.js";


/* ======================================================
   SEO & AI
====================================================== */
import {
  createSocialAsset,
  getSocialAsset,
  postSocialNow,
  deleteSocialAsset
} from "./core/content/social.js";

import {
  createBlogPost,
  getBlogPost,
  updateBlogPost,
  scheduleBlogPost
} from "./core/content/blog.js";

import {
  saveSocialVariants,
  getSocialVariants
} from "./core/content/social_variants.js";

import {
  listContent,
  listDrafts,
  getScheduled
} from "./core/content/drafts.js";

import { 
  addComment, 
  listComments, 
  updateContentStatus 
} from "./core/content/collaboration.js";

import {
  scheduleContent,
  rescheduleContent,
  postNow
} from "./core/content/scheduling.js";

import {
  getPublicContent,
  submitPublicDecision,
  addPublicComment
} from "./core/content/public_approval.js";

/* ======================================================
   AI (GENERATION ONLY — NOT ANALYTICS)
====================================================== */
import { generateHashtags } from "./core/ai/hashtags.js";
import { grammarCheck } from "./core/ai/grammar.js";
import { generateSocialContent } from "./core/ai/social_generate.js";
import { generateBlogArticle } from "./core/ai/blog_generate.js";
import { getAIUsage } from "./core/ai/ai_client.js";

/* ======================================================
   MEDIA
====================================================== */
import {
  listMediaLibrary,
  attachMedia,
  detachMedia,
  registerFreepikMedia,
  getAttachedMedia,
  uploadMedia,
  serveMediaFile
} from "./core/media/media.js";

import { getMediaSuggestions } from "./core/media/intelligence/index.js";

/* 🔒 CANON 3 — MEDIA PROVIDERS */
import { importFromGoogleDrive } from "./core/media/providers/google-drive.js";
import { importFromDropbox } from "./core/media/providers/dropbox.js";
import { importFromCanva } from "./core/media/providers/canva.js";
import {
  listGoogleDriveFiles,
  listDropboxFiles
} from "./core/media/providers/cloud_browsing.js";

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
   CAMPAIGNS V2
   ====================================================== */
import {
  createCampaign,
  getCampaigns,
  getCampaignDetails,
  linkContentToCampaign,
  unlinkContentFromCampaign,
  getTimeline,
  getCampaignInsights,
  getCampaignComparison,
  detectCampaignPatterns
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

import { handleAdminUsers, handleAdminUserDetail, toggleAdminUserStatus } from "./api/admin/users.js";

import { 
  billingOverview,
  mrrHistory 
} from "./api/admin/billing.js";
import { deliveryAnalytics } from "./api/admin/analytics.js";
import { handleYocoWebhook } from "./core/billing/yoco-webhook.js";
import { getCurrentPlan } from "./core/billing/billing.js";
// Using global error import

/* ======================================================
   ONBOARDING
====================================================== */
import {
  getOnboarding,
  updateOnboardingStep,
  saveMarketContext,
  completeOnboarding
} from "./core/onboarding/onboarding_v2.js";

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
   COMPLIANCE (PHASE 13)
====================================================== */
import {
  handleDeleteRequest,
  handleDeleteCancel,
  handleDeleteStatus,
  handleDataExport,
  handleExportHistory,
  handleConsentUpdate,
  handleConsentGet,
  adminListDeletions,
  adminComplianceAuditLog,
  adminListExports,
  processPendingDeletions,
} from "./api/customer/compliance.js";

/* ======================================================
   CUSTOMER ANALYTICS (AUTHORITATIVE)
====================================================== */
import {
  getAnalyticsOverview,
  getAnalyticsDetailed,
  generateReport,
  saveReportSnapshot as updateReport,
  getReportSnapshots as getReport,
  listReports,
  getSEOOverview,
  getContentAnalytics
} from "./core/analytics/analytics.js";
import { getExecutiveAnalytics } from "./core/analytics/executive.js";
import { analyzeContentSEO } from "./core/seo/seo.js";

import {
  getAgencyBranding,
  updateAgencyBranding
} from "./core/settings/settings.js";

/* ======================================================
   BRAND INTELLIGENCE ENGINE (THE BRAIN)
   ====================================================== */
import {
  generateInsights,
  getInsights
} from "./core/intelligence/intelligence.js";
import { getPromotionStatus, completeReferral, registerReferral } from "./core/promotions/promotions.js";
import { getAIAnalysis, getCoPilotGuidance } from "./core/ai/ai_intelligence.js";
import { getPressureAlerts, checkAndUnlockAchievements, grantExp } from "./core/ai/scale_engine.js";
import { generateAIStrategyReport } from "./core/ai/growth_reports.js";

/* ======================================================
   PERFORMANCE INGESTION (CANON 5.5 EXTENSION)
====================================================== */
import { runPerformanceIngestion } from "./core/delivery/performance/engine.js";
import { runBackgroundRefresh } from "./integrations/refresh_manager.js";

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
import { getAuditReport, getAuditReportPDF, getPublicAuditReport } from "./core/reports/audit_report.js";
import { handleAdminPricing, handleAdminPricingById, togglePlanStatus, createAdminPricing, getPublicPricing } from "./api/admin/pricing.js";
import { getSystemEvents } from "./api/admin/observability-api.js";

/* ======================================================
   DELIVERY ENGINE
====================================================== */
import { executeDeliveryJob } from "./core/delivery/poster.js";
import { manualRetryJob } from "./core/delivery/retries.js";
import { runDeliveryScheduler } from "./core/delivery/scheduler.js";
import { getDeliveryStats } from "./core/delivery/execute.js";
import { runEmailWorker } from "./core/workers/email-worker.js";
import { runLifecycleCron } from "./core/lifecycle/cron.js";
import { supportRoutes } from "./routes/support.js";
import { handleDataDeletionRequest } from "./core/compliance/compliance.js";
import { sendOTP, verifyOTP, getVerificationStatus } from "./core/trust/verification.js";
import {
  handleUnsubscribe,
  handleCategoryUnsubscribe,
  getUnsubscribeStatus,
  trackEmailOpen,
  trackEmailClick,
  getLifecycleAnalytics
} from "./core/lifecycle/engine.js";

/* ======================================================
   CORS HEADERS
====================================================== */
function getCorsHeaders(request) {
  if (!request || !request.headers) return defaultCorsHeaders;
  
  const origin = request.headers.get("Origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:8090",
    "https://mypilotpost.com",
    "https://www.mypilotpost.com",
    "https://app.mypilotpost.com",
    "https://admin.mypilotpost.com"
  ];

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[allowedOrigins.length - 1],
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };

  return headers;
}

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()"
};

/* ======================================================
   ERROR HANDLER
====================================================== */
function handleError(err, request = null) {
  const cors = request ? getCorsHeaders(request) : defaultCorsHeaders;
  const allHeaders = { ...securityHeaders, ...cors };

  if (err instanceof Response) {
    const newHeaders = new Headers(err.headers);
    Object.entries(allHeaders).forEach(([k, v]) => newHeaders.set(k, v));

    return new Response(err.body, {
      status: err.status,
      statusText: err.statusText,
      headers: newHeaders
    });
  }

  const status = err?.status || 500;
  const code = err?.code || (status >= 500 ? "SERVER_ERROR" : "BAD_REQUEST");
  
  let message = "Internal server error";
  if (status < 500) {
    message = err?.message || "An unexpected error occurred";
  }

  // LOG FOR OPS (Internal only)
  if (status >= 500) {
    console.error(`[CRITICAL ERROR]`, err);
  }

  // PRODUCTION SAFETY: No stack traces or details to client
  return json(
    { error: message, code },
    status,
    allHeaders
  );
}


/* ======================================================
   RESPONSE WRAPPER (CORS SAFE)
====================================================== */
async function withCors(request, responsePromise) {
  const cors = getCorsHeaders(request);
  const allHeaders = { ...securityHeaders, ...cors };
  try {
    const response = await responsePromise;

    if (!response) {
      return handleError(new Error("Empty response"), request);
    }

    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...allHeaders
        }
      });
    }

    const status = response.status;
    const body = await response.text();

    return new Response(body, {
      status,
      headers: {
        "Content-Type": contentType || "application/json",
        ...allHeaders
      }
    });
  } catch (error) {
    return handleError(error, request);
  }
}

/* ======================================================
   ADMIN HANDLER FUNCTIONS
====================================================== */

async function handleAdminCustomers(request, env) {
  const db = getDB(env);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";

  let query = `
    SELECT u.id, u.email, u.role, u.plan_id, u.subscription_status,
           u.is_active, u.created_at,
           (SELECT COUNT(*) FROM brands b WHERE b.id IN (SELECT brand_id FROM brand_users bu WHERE bu.user_id = u.id)) as brand_count,
           p.name as plan_name
    FROM users u
    LEFT JOIN plans p ON p.id = u.plan_id
    WHERE u.role = 'user'
  `;
  const binds = [];
  if (search) {
    query += " AND LOWER(u.email) LIKE ?";
    binds.push(`%${search.toLowerCase()}%`);
  }
  query += ` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const { results } = binds.length
    ? await db.prepare(query).bind(...binds).all()
    : await db.prepare(query).all();

  return json({ success: true, data: results || [], page, limit });
}

async function getAdminSupportThreads(request, env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT
      sm.sender_id,
      u.email as sender_email,
      MAX(sm.created_at) as last_message_at,
      COUNT(*) as message_count,
      SUM(CASE WHEN sm.read_at IS NULL AND sm.is_admin_msg = 0 THEN 1 ELSE 0 END) as unread_count,
      (SELECT message FROM support_messages WHERE sender_id = sm.sender_id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM support_messages sm
    LEFT JOIN users u ON u.id = sm.sender_id
    GROUP BY sm.sender_id
    ORDER BY last_message_at DESC
    LIMIT 100
  `).all();
  return json({ threads: results || [] });
}

async function sendAdminMessage(request, env, auth) {
  const db = getDB(env);
  const { receiver_id, message } = await request.json();
  if (!receiver_id || !message) return error("receiver_id and message required", "BAD_REQUEST", null, 400);

  const msgId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.prepare(
    "INSERT INTO support_messages (id, sender_id, receiver_id, message, is_admin_msg, created_at) VALUES (?, ?, ?, ?, 1, ?)"
  ).bind(msgId, auth.user_id, receiver_id, message, timestamp).run();

  await logAdminAction(env, auth, "send_message", "support_message", msgId, { receiver_id });
  return json({ success: true, id: msgId });
}

async function broadcastAdminMessage(request, env, auth) {
  const db = getDB(env);
  const { message, filter } = await request.json();
  if (!message) return error("message required", "BAD_REQUEST", null, 400);

  let query = "SELECT id FROM users WHERE role = 'user' AND is_active = 1";
  const binds = [];
  if (filter?.plan_id) { query += " AND plan_id = ?"; binds.push(filter.plan_id); }

  const { results: users } = binds.length
    ? await db.prepare(query).bind(...binds).all()
    : await db.prepare(query).all();

  const timestamp = new Date().toISOString();
  let sent = 0;
  for (const u of users) {
    try {
      await db.prepare(
        "INSERT INTO support_messages (id, sender_id, receiver_id, message, is_admin_msg, created_at) VALUES (?, ?, ?, ?, 1, ?)"
      ).bind(crypto.randomUUID(), auth.user_id, u.id, message, timestamp).run();
      sent++;
    } catch { /* continue */ }
  }

  await logAdminAction(env, auth, "broadcast_message", "support_messages", "broadcast", { sent, filter });
  return json({ success: true, sent });
}

async function getAdminSystemStatus(env) {
  const db = getDB(env);
  const [delivery, events] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM delivery_jobs WHERE created_at > datetime('now', '-24 hours')
    `).first(),
    db.prepare("SELECT severity, source, message, created_at FROM admin_system_events ORDER BY created_at DESC LIMIT 20").all()
  ]);
  const failRate = delivery.total > 0 ? delivery.failed / delivery.total : 0;
  return json({
    status: failRate > 0.3 ? "degraded" : "operational",
    delivery_24h: { total: delivery.total || 0, failed: delivery.failed || 0, completed: delivery.completed || 0, fail_rate: failRate },
    recent_events: events.results || [],
    timestamp: new Date().toISOString()
  });
}

async function getOperationsHealth(env) {
  const db = getDB(env);
  const [aiUsage, oauthFails, deliveryFails] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM ai_generations WHERE created_at > datetime('now', '-1 hour')").first(),
    db.prepare("SELECT COUNT(*) as count FROM admin_system_events WHERE source = 'oauth' AND severity = 'critical' AND created_at > datetime('now', '-24 hours')").first().catch(() => ({ count: 0 })),
    db.prepare("SELECT COUNT(*) as count FROM delivery_jobs WHERE status = 'failed' AND updated_at > datetime('now', '-1 hour')").first()
  ]);
  return json({
    ai_generations_last_hour: aiUsage?.count || 0,
    oauth_failures_24h: oauthFails?.count || 0,
    delivery_failures_last_hour: deliveryFails?.count || 0,
    timestamp: new Date().toISOString()
  });
}

async function getAdminPromotions(env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, code, discount_type, discount_value, max_uses, uses_count,
           is_active, expires_at, created_at
    FROM promotions ORDER BY created_at DESC LIMIT 50
  `).all().catch(() => ({ results: [] }));
  return json({ promotions: results || [] });
}

async function createAdminPromotion(request, env, auth) {
  const db = getDB(env);
  const { code, discount_type, discount_value, max_uses, expires_at } = await request.json();
  if (!code || !discount_type || !discount_value) {
    return error("code, discount_type, discount_value required", "BAD_REQUEST", null, 400);
  }
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO promotions (id, code, discount_type, discount_value, max_uses, is_active, expires_at, created_at)
    VALUES (?, UPPER(?), ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
  `).bind(id, code, discount_type, discount_value, max_uses || null, expires_at || null).run().catch(err => {
    if (err.message?.includes("UNIQUE")) throw error("Promo code already exists", "CONFLICT", null, 409);
    throw err;
  });
  await logAdminAction(env, auth, "create_promotion", "promotion", id, { code, discount_type, discount_value });
  return json({ success: true, id });
}

/* ======================================================
   WORKER ENTRY
====================================================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname.replace(/\/+$/, "");

    // Handle OPTIONS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    try {
      /* ================= HEALTH ================= */
      if (path === "/api/health") return withCors(request, Promise.resolve(json({ status: "ok", version: "1.1.1" })));

      /* ================= SUPPORT (SSE & MESSAGES) ================= */
      if (path.startsWith("/api/v1/support")) {
        return supportRoutes.fetch(request, env);
      }

      /* ================= INTERNAL PERFORMANCE INGESTION ================= */
      if (method === "POST" && path === "/api/internal/performance/ingest") {
        await requireAdmin(request, env);
        await runPerformanceIngestion(env);
        return json({ success: true }, 200, { ...securityHeaders, ...defaultCorsHeaders });
      }

      /* ================= INTERNAL BRAND INTELLIGENCE ================= */
      if (method === "POST" && path === "/api/internal/intelligence/run") {
        await requireAdmin(request, env);
        // Trigger for ALL brands or specific? Let's allow specific via query
        return withCors(request, generateInsights(request, env));
      }

      /* ================= INTERNAL DELIVERY JOB EXECUTION ================= */
      if (method === "POST" && path === "/api/internal/delivery/run") {
        await requireAdmin(request, env);

        const { results } = await env.mypilotpost.prepare(`
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

      /* ================= PUBLIC BLOG (STANDARDIZED) ================= */
      if (method === "GET" && path === "/api/blog")
        return withCors(request, publicListMarketingPosts(request, env));

      if (
        method === "GET" &&
        path.startsWith("/api/blog/") &&
        path.split("/").length === 4
      ) {
        const slug = path.split("/")[3];
        return withCors(request, publicGetMarketingPost(request, env, slug));
      }

      /* ================= PUBLIC MARKETING BLOG ================= */
      if (method === "GET" && path === "/api/public/marketing/blog")
        return withCors(request, publicListMarketingPosts(request, env));

      if (
        method === "GET" &&
        path.startsWith("/api/public/marketing/blog/")
      ) {
        const slug = path.split("/")[5];
        return withCors(request, publicGetMarketingPost(request, env, slug));
      }

      /* ================= PUBLIC PRICING (DYNAMIC) ================= */
      if (method === "GET" && path === "/api/v1/pricing") {
        return withCors(request, getPublicPricing(request, env));
      }

      /* ================= PUBLIC BRAND AUDIT (CONVERSION) ================= */
      if (method === "POST" && path === "/api/public/brand-audit") {
        return withCors(request, runPublicAudit(request, env));
      }

      if (method === "GET" && path.startsWith("/api/public/brand-audit/") && path.endsWith("/report")) {
        return withCors(request, getPublicAuditReport(request, env));
      }

      if (method === "GET" && path.startsWith("/api/public/brand-audit/")) {
        const auditId = path.split("/")[4];
        return withCors(request, getPublicAuditById(request, env, auditId));
      }

      if (method === "POST" && path === "/api/public/audit-lead") {
        return withCors(request, captureAuditLead(request, env));
      }

      /* ================= PUBLIC APPROVAL (NO AUTH) ================= */
      if (method === "GET" && path.startsWith("/api/public/approval/") && !path.endsWith("/comment")) {
        const contentId = path.split("/")[4];
        return withCors(request, getPublicContent(request, env, contentId));
      }

      if (method === "POST" && path.startsWith("/api/public/approval/") && path.endsWith("/comment")) {
        const contentId = path.split("/")[4];
        return withCors(request, addPublicComment(request, env, contentId));
      }

      if (method === "POST" && path.startsWith("/api/public/approval/") && !path.endsWith("/comment")) {
        const contentId = path.split("/")[4];
        return withCors(request, submitPublicDecision(request, env, contentId));
      }

      /* ================= PUBLIC AUTH ================= */
      if (path === "/api/customer/profile" && method === "GET") {
        const auth = await requireAuth(request, env);
        request.user = { id: auth.user_id, ...auth };
        return withCors(request, getProfile(request, env));
      }

      if (path === "/api/customer/register" && method === "POST") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return withCors(request, Promise.resolve(limited));
        return withCors(request, register(request, env));
      }

      if (path === "/api/v1/auth/register" && method === "POST") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return limited;
        return withCors(request, register(request, env));
      }

      if (method === "POST" && (path === "/api/customer/login" || path === "/api/v1/auth/login")) {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return withCors(request, Promise.resolve(limited));
        return withCors(request, login(request, env));
      }

      if (method === "POST" && path === "/api/customer/verify-email") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return limited;
        return withCors(request, verifyEmail(request, env));
      }

      /* ── LIFECYCLE EMAIL — PUBLIC UNSUBSCRIBE + TRACKING ── */
      if (method === "GET" && path === "/api/unsubscribe")
        return withCors(request, handleUnsubscribe(request, env));
      if (method === "POST" && path === "/api/unsubscribe/category")
        return withCors(request, handleCategoryUnsubscribe(request, env));
      if (method === "GET" && path === "/api/track/open")
        return trackEmailOpen(request, env);
      if (method === "GET" && path === "/api/track/click")
        return trackEmailClick(request, env);

      /* ── TRUST / EMAIL VERIFICATION (OTP) ── */
      if (path === "/api/customer/trust/otp/send" && method === "POST") {
        const auth = await requireAuth(request, env);
        return withCors(request, sendOTP(request, env, auth));
      }
      if (path === "/api/customer/trust/otp/verify" && method === "POST") {
        const auth = await requireAuth(request, env);
        return withCors(request, verifyOTP(request, env, auth));
      }
      if (path === "/api/customer/trust/status" && method === "GET") {
        const auth = await requireAuth(request, env);
        return withCors(request, getVerificationStatus(request, env, auth));
      }

      if (method === "POST" && path === "/api/customer/forgot-password") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return limited;
        return withCors(request, forgotPassword(request, env));
      }

      if (method === "POST" && path === "/api/customer/reset-password") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return limited;
        return withCors(request, resetPassword(request, env));
      }

      if (method === "POST" && path === "/api/customer/account/change-password") {
        const auth = await requireAuth(request, env);
        if (auth instanceof Response) return auth;
        request.user = { id: auth.user_id };
        return withCors(request, changePassword(request, env));
      }

      /* ---------- PUBLIC INVITE ACCEPTANCE ---------- */
      if (method === "POST" && path === "/api/customer/invites/accept") {
        return withCors(request, acceptInvite(request, env));
      }

      /* ================= OAUTH STARKS / CALLBACKS (PUBLIC) ================= */
      // All callbacks are public (state verification handles security)
      if (method === "GET" && path.startsWith("/api/customer/oauth/") && path.endsWith("/callback")) {
        const provider = path.split("/")[4];
        request.params = { provider };
        return handleCallback(request, env);
      }

      /* ---------- UNIFIED OAUTH CALLBACK (PUBLIC) ---------- */
      if (method === "GET" && path.startsWith("/api/oauth/") && path.endsWith("/callback")) {
        return handleUnifiedCallback(request, env);
      }

      /* ---------- UNIFIED OAUTH START (PROTECTED — requires JWT) ---------- */
      if (method === "GET" && path.startsWith("/api/oauth/") && path.endsWith("/connect")) {
        const auth = await requireAuth(request, env);
        return withCors(request, startUnifiedOAuth(request, env, auth));
      }

      /* ================= ADMIN AUTH (SEPARATE FROM CUSTOMER) ================= */
      if (path === "/api/admin/login" && method === "POST") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return withCors(request, Promise.resolve(limited));
        return withCors(request, adminLogin(request, env));
      }

      if (path === "/api/admin/session" && method === "GET") {
        const auth = await requireAdminAuth(request, env);
        return withCors(request, Promise.resolve(json({ user_id: auth.user_id, email: auth.email, role: auth.role })));
      }

      if (path === "/api/admin/profile" && method === "GET") {
        const auth = await requireAdminAuth(request, env);
        return withCors(request, Promise.resolve(json({ user_id: auth.user_id, email: auth.email, role: auth.role, is_admin: true })));
      }

      /* ================= ADMIN (all routes require admin JWT with is_admin:true) ================= */
      if (path.startsWith("/api/v1/admin")) {
        if (path === "/api/v1/admin/overview") {
          await requireAdminAuth(request, env);
          return billingOverview(env);
        }

        if (path === "/api/v1/admin/billing/overview") {
          await requireAdminAuth(request, env);
          return billingOverview(env);
        }

        if (path === "/api/v1/admin/billing/mrr-history") {
          await requireAdminAuth(request, env);
          return mrrHistory(env);
        }

        if (path === "/api/v1/admin/analytics/delivery") {
          await requireAdminAuth(request, env);
          return deliveryAnalytics(env);
        }

        if (path === "/api/v1/admin/users") {
          await requireAdminAuth(request, env);
          return handleAdminUsers(request, env);
        }

        if (path.startsWith("/api/v1/admin/users/") && path.endsWith("/toggle")) {
          await requireAdminAuth(request, env);
          return toggleAdminUserStatus(request, env, path.split("/")[5]);
        }

        if (path === "/api/v1/admin/campaigns") {
          await requireAdminAuth(request, env);
          return handleCampaigns(request, env);
        }

        if (path.startsWith("/api/v1/admin/campaigns/") && path.endsWith("/content")) {
          await requireAdminAuth(request, env);
          return handleCampaignContent(request, env, path.split("/")[5]);
        }

        if (path === "/api/v1/admin/emails/campaigns") {
          await requireAdminAuth(request, env);
          return handleEmailCampaigns(request, env);
        }

        if (path === "/api/v1/admin/emails/messages") {
          await requireAdminAuth(request, env);
          return handleEmailMessages(request, env);
        }

        if (path === "/api/v1/admin/emails/templates") {
          await requireAdminAuth(request, env);
          return handleEmailTemplates(request, env);
        }

        /* ---------- PRICING MANAGEMENT ---------- */
        if (path === "/api/v1/admin/pricing" && method === "GET") {
          await requireAdminAuth(request, env);
          return handleAdminPricing(env);
        }

        if (path === "/api/v1/admin/pricing" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "pricing:write")) throw error("Pricing write requires admin role", "FORBIDDEN", null, 403);
          const res = await createAdminPricing(request, env);
          await logAdminAction(env, auth, "create_plan", "pricing", "new_plan", { method });
          return res;
        }

        if (path.startsWith("/api/v1/admin/pricing/") && path.endsWith("/toggle")) {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "pricing:write")) throw error("Pricing write requires admin role", "FORBIDDEN", null, 403);
          const planId = path.split("/")[5];
          const res = await togglePlanStatus(request, env);
          await logAdminAction(env, auth, "toggle_plan", "pricing", planId);
          return res;
        }

        if (path.startsWith("/api/v1/admin/pricing/")) {
          await requireAdminAuth(request, env);
          return handleAdminPricingById(request, env);
        }

        /* ---------- CUSTOMERS (alias to /users for portal compat) ---------- */
        if (path === "/api/v1/admin/customers") {
          await requireAdminAuth(request, env);
          return handleAdminCustomers(request, env);
        }

        if (path.startsWith("/api/v1/admin/customers/") && path.endsWith("/toggle")) {
          await requireAdminAuth(request, env);
          return toggleAdminUserStatus(request, env, path.split("/")[5]);
        }

        if (path.startsWith("/api/v1/admin/customers/") && method === "GET") {
          await requireAdminAuth(request, env);
          return handleAdminUserDetail(request, env, path.split("/")[5]);
        }

        /* ---------- SUPPORT THREADS ---------- */
        if (path === "/api/v1/admin/support/threads") {
          await requireAdminAuth(request, env);
          return getAdminSupportThreads(request, env);
        }

        if (path === "/api/v1/admin/support/message" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          return sendAdminMessage(request, env, auth);
        }

        if (path === "/api/v1/admin/support/broadcast" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          return broadcastAdminMessage(request, env, auth);
        }

        /* ---------- COMPLIANCE (ADMIN, PHASE 13) ---------- */
        if (path === "/api/v1/admin/compliance/deletions" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, adminListDeletions(request, env));
        }
        if (path === "/api/v1/admin/compliance/exports" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, adminListExports(request, env));
        }
        if (path === "/api/v1/admin/compliance/audit-log" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, adminComplianceAuditLog(request, env));
        }

        /* ---------- SYSTEM STATUS ---------- */
        if (path === "/api/v1/admin/system/status") {
          await requireAdminAuth(request, env);
          return getAdminSystemStatus(env);
        }

        /* ---------- OPERATIONS / HEALTH ---------- */
        if (path === "/api/v1/admin/operations/health") {
          await requireAdminAuth(request, env);
          return getOperationsHealth(env);
        }

        /* ---------- BLOG (MARKETING) ---------- */
        if (path === "/api/v1/admin/blog" && method === "GET") {
          const auth = await requireAdminAuth(request, env);
          return listMarketingPosts(request, env, auth);
        }
        if (path === "/api/v1/admin/blog" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          return createMarketingPost(request, env, auth);
        }
        if (path.startsWith("/api/v1/admin/blog/") && method === "PATCH") {
          const auth = await requireAdminAuth(request, env);
          const id = path.split("/")[5];
          return updateMarketingPost(request, env, auth, id);
        }
        if (path.startsWith("/api/v1/admin/blog/") && method === "DELETE") {
          const auth = await requireAdminAuth(request, env);
          const id = path.split("/")[5];
          return deleteMarketingPost(request, env, auth, id);
        }

        /* ---------- PROMOTIONS ---------- */
        if (path === "/api/v1/admin/promotions" && method === "GET") {
          await requireAdminAuth(request, env);
          return getAdminPromotions(env);
        }
        if (path === "/api/v1/admin/promotions" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          return createAdminPromotion(request, env, auth);
        }

        /* ---------- STUBS for future sections (return empty, no error) ---------- */
        if (path === "/api/v1/admin/memory")
          return withCors(request, Promise.resolve(json({ brands: [], total: 0 })));
        if (path === "/api/v1/admin/seo/overview")
          return withCors(request, Promise.resolve(json({ pages: [], coverage: 0 })));
        if (path === "/api/v1/admin/automation/rules")
          return withCors(request, Promise.resolve(json({ rules: [] })));
        if (path === "/api/v1/admin/ml/health")
          return withCors(request, Promise.resolve(json({ status: "ok", models: [] })));
        if (path === "/api/v1/admin/experiments")
          return withCors(request, Promise.resolve(json({ experiments: [] })));
      }

      /* ================= PUBLIC WEBHOOKS (NO AUTH) ================= */
      if (method === "POST" && path === "/api/webhooks/yoco")
        return handleYocoWebhook(request, env);

      /* ======================================================
         CUSTOMER (PROTECTED)
      ====================================================== */
      /* ---------- AUDIT PDF (own auth — path starts with /api/v1/ not /api/customer/) ---------- */
      if (method === "GET" && path.startsWith("/api/v1/audit/report/") && path.endsWith("/pdf")) {
        const auth = await requireAuth(request, env);
        return withCors(request, getAuditReportPDF(request, env, auth));
      }

      if (path.startsWith("/api/customer")) {
        const auth = await requireAuth(request, env);

        if (path.startsWith("/api/customer/audit/report/")) {
          return withCors(request, getAuditReport(request, env, auth));
        }

        /* ---------- UNIFIED INTEGRATIONS (PHASE 1.1) ---------- */
        if (method === "GET" && path.startsWith("/api/customer/oauth/") && path.endsWith("/start")) {
          const provider = path.split("/")[4];
          request.params = { provider };
          return startOAuth(request, env, auth);
        }

        if (method === "GET" && path === "/api/customer/integrations")
          return listIntegrations(request, env, auth);

        if (method === "DELETE" && path.startsWith("/api/customer/integrations/")) {
          const id = path.split("/")[4];
          request.params = { id };
          return disconnectIntegration(request, env, auth);
        }

        /* ---------- SOCIAL CONNECTIONS (unified table) ---------- */
        if (method === "GET" && path === "/api/customer/social-connections")
          return withCors(request, listSocialConnections(request, env, auth));

        if (method === "DELETE" && path.startsWith("/api/customer/social-connections/")) {
          const id = path.split("/")[4];
          request.params = { id };
          return withCors(request, disconnectSocialConnection(request, env, auth));
        }

        if (method === "POST" && path.startsWith("/api/customer/social-connections/") && path.endsWith("/refresh")) {
          const id = path.split("/")[4];
          request.params = { id };
          return withCors(request, refreshConnectionOnDemand(request, env, auth));
        }

        /* ---------- BRANDS ---------- */
        if (method === "POST" && path === "/api/customer/brand/import") return withCors(request, importBrandFromUrl(request, env, auth));
        if (method === "POST" && path === "/api/customer/brands/create")
          return withCors(request, createBrandRequest(request, env, auth));

        if (method === "GET" && path === "/api/customer/brands")
          return withCors(request, listBrands(request, env, auth));

        if (method === "POST" && path === "/api/customer/brands/switch")
          return withCors(request, switchBrand(request, env, auth));

        /* ---------- ONBOARDING V2 ---------- */
        if (method === "GET" && path === "/api/customer/onboarding")
          return withCors(request, getOnboarding(request, env, auth));
        
        if (method === "POST" && path === "/api/customer/onboarding/step")
          return withCors(request, updateOnboardingStep(request, env, auth));
        
        if (method === "POST" && path === "/api/customer/onboarding/market")
          return withCors(request, saveMarketContext(request, env, auth));
        
        if (method === "POST" && path === "/api/customer/onboarding/complete")
          return withCors(request, completeOnboarding(request, env, auth));

        /* ---------- BILLING ---------- */
        if (method === "GET" && path === "/api/customer/billing/plan") {
           const db = env.mypilotpost;
           const plan = await getCurrentPlan(db, auth.user_id);
           return json({ plan }, 200, getCorsHeaders(request));
        }

        if (method === "POST" && path === "/api/customer/billing/upgrade") {
           const body = await request.json();
           const { plan_id } = body;
           if (!plan_id) return json({ error: "plan_id required" }, 400, getCorsHeaders(request));
           const db = env.mypilotpost;
           const validPlan = await db.prepare("SELECT id, name FROM plans WHERE id = ? AND is_active = 1").bind(plan_id).first();
           if (!validPlan) return json({ error: "Invalid plan" }, 400, getCorsHeaders(request));
           const now = new Date().toISOString();
           const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
           await db.batch([
             db.prepare("UPDATE users SET plan_id = ?, subscription_status = 'active', current_period_start = ?, current_period_end = ? WHERE id = ?")
               .bind(plan_id, now, periodEnd, auth.user_id),
             db.prepare("UPDATE subscriptions SET plan_id = ?, plan = ?, status = 'active', current_period_start = ?, current_period_end = ?, updated_at = ? WHERE user_id = ?")
               .bind(plan_id, validPlan.name, now, periodEnd, now, auth.user_id),
           ]);
           const updatedPlan = await getCurrentPlan(db, auth.user_id);
           return json({ success: true, plan: updatedPlan }, 200, getCorsHeaders(request));
        }

        if (method === "GET" && path === "/api/customer/billing/history") {
           const db = env.mypilotpost;
           const { results } = await db.prepare(`
             SELECT p.provider, p.amount, p.currency, p.status, p.occurred_at
             FROM payments p
             JOIN brands b ON b.id = p.brand_id
             JOIN brand_users bu ON bu.brand_id = b.id
             WHERE bu.user_id = ?
             ORDER BY p.occurred_at DESC LIMIT 50
           `).bind(auth.user_id).all();
           return json({ history: results || [] }, 200, getCorsHeaders(request));
        }

        if (method === "GET" && path === "/api/customer/billing/usage") {
           const db = env.mypilotpost;
           const plan = await getCurrentPlan(db, auth.user_id);
           const tracking = await db.prepare(
             "SELECT posts_used, ai_generations_used, social_accounts_used FROM usage_tracking WHERE user_id = ?"
           ).bind(auth.user_id).first();
           const usage = [
             { label: "Posts", used: tracking?.posts_used || 0, limit: plan.posts_per_month_limit || 30 },
             { label: "AI Generations", used: tracking?.ai_generations_used || 0, limit: plan.ai_generations_limit || 10 },
             { label: "Social Accounts", used: tracking?.social_accounts_used || 0, limit: plan.social_accounts_limit || 3 },
           ];
           return json({ usage }, 200, getCorsHeaders(request));
        }
         if (method === "POST" && path === "/api/customer/schedule")
           return withCors(request, createSchedule(request, env, auth));

         /* ---------- TEAM & INVITES ---------- */
         if (method === "GET" && path === "/api/customer/team")
           return withCors(request, getTeam(request, env, auth));
         
         if (method === "GET" && path === "/api/customer/invites")
           return withCors(request, getInvites(request, env, auth));
         
         if (method === "POST" && path === "/api/customer/invites")
           return withCors(request, createInvite(request, env, auth));

         /* ---------- APPROVALS ---------- */
         if (method === "GET" && path === "/api/customer/approvals")
           return withCors(request, getApprovalRequests(request, env, auth));
         
         if (method === "POST" && path === "/api/customer/approvals")
           return withCors(request, submitForApproval(request, env, auth));

         /* ---------- REPORTING ---------- */
         if (method === "GET" && path === "/api/customer/reports")
           return withCors(request, getReports(request, env, auth));
         
         if (method === "POST" && path === "/api/customer/reports")
           return withCors(request, createReport(request, env, auth));

         if (method === "POST" && path.startsWith("/api/customer/reports/") && path.endsWith("/share"))
           return withCors(request, shareReport(request, env, auth));


         /* ---------- GROWTH ---------- */
         /* ---------- GROWTH V2 ---------- */
         if (method === "GET" && path === "/api/customer/growth/summary")
           return withCors(request, getGrowthSummary(request, env, auth));
         
         if (method === "GET" && path === "/api/customer/growth/activity")
           return withCors(request, getGrowthActivity(request, env, auth));

         if (method === "GET" && path === "/api/customer/growth/rewards")
           return withCors(request, getGrowthRewards(request, env, auth));

         if (method === "POST" && path === "/api/customer/growth/action")
           return withCors(request, processGrowthAction(request, env, auth));

         if (method === "POST" && path === "/api/customer/growth/referral")
           return withCors(request, registerGrowthReferral(request, env, auth));


                   if (method === "GET" && path === "/api/customer/analytics/executive")
            return withCors(request, getExecutiveAnalytics(request, env, auth));

          /* ---------- INTELLIGENCE & AUDITS ---------- */
         if (method === "GET" && path === "/api/customer/intelligence") return withCors(request, listInsights(request, env, auth));
         if (method === "POST" && path === "/api/customer/intelligence/resolve") return withCors(request, resolveInsight(request, env, auth));
         if (method === "GET" && path === "/api/customer/intelligence/audits") return withCors(request, listAudits(request, env, auth));
         if (method === "GET" && path.startsWith("/api/customer/intelligence/audits/")) return withCors(request, getFullAudit(request, env, auth));

          /* ---------- BRAND DNA (STRATEGIC LAYER) ---------- */
          if (method === "GET" && path === "/api/customer/brand-dna") return withCors(request, getBrandDNA(request, env, auth));
          if (method === "POST" && path === "/api/customer/brand-dna") return withCors(request, updateBrandDNA(request, env, auth));
          if (method === "PATCH" && path === "/api/customer/brand-dna") return withCors(request, updateBrandDNA(request, env, auth));

          /* ---------- COMPETITOR INTELLIGENCE ---------- */
          if (method === "GET" && path === "/api/customer/competitors") return withCors(request, getCompetitorBenchmarks(request, env, auth));
          if (method === "POST" && path === "/api/customer/competitors") return withCors(request, addCompetitor(request, env, auth));

          /* ---------- CONTENT OPPORTUNITIES ---------- */
          if (method === "GET" && path === "/api/customer/opportunities") return withCors(request, listOpportunities(request, env, auth));
          if (method === "POST" && path === "/api/customer/opportunities/generate") return withCors(request, generateOpportunities(request, env, auth));
          if (method === "PATCH" && path.startsWith("/api/customer/opportunities/")) return withCors(request, updateOpportunityStatus(request, env, auth));
          if (method === "GET" && path === "/api/customer/opportunities/weekly-plan") return withCors(request, getWeeklyPlan(request, env, auth));
          if (method === "POST" && path === "/api/customer/opportunities/weekly-plan") return withCors(request, generateWeeklyPlan(request, env, auth));

         /* ---------- NOTIFICATIONS (EXTENDED) ---------- */
         if (method === "GET"  && path === "/api/customer/notifications/unread-count")
           return withCors(request, getUnreadCount(request, env, auth));
         if (method === "POST" && path === "/api/customer/notifications/read-all")
           return withCors(request, markAllRead(request, env, auth));
         if (method === "GET"  && path === "/api/customer/notifications/preferences")
           return withCors(request, getPreferences(request, env, auth));
         if (method === "PUT"  && path === "/api/customer/notifications/preferences")
           return withCors(request, updatePreferences(request, env, auth));

         /* ---------- LIFECYCLE EMAIL (UNSUBSCRIBE + ANALYTICS) ---------- */
         if (method === "GET" && path === "/api/customer/lifecycle/unsubscribe-status")
           return withCors(request, getUnsubscribeStatus(request, env, auth));
         if (method === "GET" && path === "/api/customer/lifecycle/analytics")
           return withCors(request, getLifecycleAnalytics(request, env, auth));

         /* ---------- PROMOTIONS ---------- */
         if (method === "GET" && path === "/api/customer/promotions") {
           const db = env.mypilotpost;
           const status = await getPromotionStatus(db, auth.user_id);
           return json({ status });
         }

         if (method === "POST" && path === "/api/customer/promotions/referral") {
           // This allows attaching a referral post-registration (Optional but supported)
           const { code } = await request.json();
           const db = env.mypilotpost;
           const success = await registerReferral(db, code, auth.user_id, {
             ip: request.headers.get("CF-Connecting-IP"),
             ua: request.headers.get("User-Agent")
           });
           return json({ success: !!success });
         }

         if (method === "POST" && path === "/api/internal/promotions/complete") {
            // Internal allow-list check or admin check could go here if needed
            const db = env.mypilotpost;
            await completeReferral(db, auth.user_id, env);
            return json({ success: true });
         }

         /* ---------- AI INTELLIGENCE + USAGE ---------- */
         if (method === "GET" && path === "/api/customer/ai/usage")
           return withCors(request, getAIUsage(request, env, auth));

         if (method === "GET" && path === "/api/customer/intelligence/ai") {
            const db = env.mypilotpost;
            try {
              const ai = await getAIAnalysis(db, auth.brand_id, 'strategic', null, env, false, { mode: 'fast', priority: 'normal' });
              return json(ai);
            } catch (e) {
              if (e.message === "AI_COOLDOWN") return json({ error: "AI_COOLDOWN" }, 429);
              return error("AI Intelligence unavailable", "AI_FAILED", null, 500);
            }
          }

         if (method === "POST" && path === "/api/customer/intelligence/ai/refresh") {
           const db = env.mypilotpost;
           try {
             const ai = await getAIAnalysis(db, auth.brand_id, 'strategic', null, env, true, { mode: 'fast', priority: 'normal' });
             return json(ai);
           } catch (e) {
             if (e.message === "AI_COOLDOWN") return json({ error: "AI_COOLDOWN" }, 429);
             return error("AI Refresh failed", "AI_FAILED", null, 500);
           }
         }

          if (method === "GET" && path === "/api/customer/intelligence/audit") {
            const db = env.mypilotpost;
            try {
              const audit = await getAIAnalysis(db, auth.brand_id, 'audit', null, env, false, { mode: 'deep', priority: 'high' });
              return json(audit);
            } catch (e) {
              if (e.message === "AI_COOLDOWN") return json({ error: "AI_COOLDOWN" }, 429);
              return error("AI Audit failed", "AI_FAILED", null, 500);
            }
          }

          if (method === "POST" && path === "/api/customer/intelligence/audit/refresh") {
            const db = env.mypilotpost;
            try {
              const audit = await getAIAnalysis(db, auth.brand_id, 'audit', null, env, true, { mode: 'deep', priority: 'high' });
              return json(audit);
            } catch (e) {
              if (e.message === "AI_COOLDOWN") return json({ error: "AI_COOLDOWN" }, 429);
              return error("AI Audit refresh failed", "AI_FAILED", null, 500);
            }
          }

          if (method === "POST" && path === "/api/customer/intelligence/audit/seen") {
            const db = env.mypilotpost;
            await db.prepare("UPDATE brands SET audit_seen = 1 WHERE id = ?").bind(auth.brand_id).run();
            return json({ success: true });
          }

          if (method === "GET" && path === "/api/customer/intelligence/weekly") {
            const db = env.mypilotpost;
            try {
              const weekly = await getAIAnalysis(db, auth.brand_id, 'weekly', null, env, false, { mode: 'fast', priority: 'normal' });
              return json(weekly);
            } catch (e) {
              if (e.message === "AI_COOLDOWN") return json({ error: "AI_COOLDOWN" }, 429);
              return error("Weekly Report failed", "AI_FAILED", null, 500);
            }
          }

          if (method === "GET" && path === "/api/customer/intelligence/weekly-plan") {
            const db = env.mypilotpost;
            try {
              const plan = await getAIAnalysis(db, auth.brand_id, 'weekly_plan', null, env, false, { mode: 'fast', priority: 'normal' });
              return json(plan);
            } catch (e) {
              return error("Weekly Plan failed", "AI_FAILED", null, 500);
            }
          }

          if (method === "POST" && path === "/api/customer/intelligence/weekly-plan/fix") {
             const db = env.mypilotpost;
             try {
                // 1. Get AI fixes
                const plan = await getAIAnalysis(db, auth.brand_id, 'weekly_plan', null, env);
                const fixes = plan?.fixes || [];

                // 2. Map to actual placeholder jobs
                const stmt = db.prepare(`
                  INSERT INTO delivery_jobs (id, brand_id, content_id, platform, status, scheduled_at, created_at)
                  VALUES (?, ?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP)
                `);

                for (const fix of fixes) {
                   const jobId = crypto.randomUUID();
                   // Determine future slot (e.g., next occurring instance of 'day')
                   const scheduledAt = new Date();
                   scheduledAt.setDate(scheduledAt.getDate() + 2); // Simulating gap filling

                   await stmt.bind(jobId, auth.brand_id, 'STRATEGIC_PLACEHOLDER', 'linkedin', scheduledAt.toISOString()).run();
                }

                // 3. Grant XP for strategic alignment
                await grantExp(db, auth.brand_id, 25);
                await db.prepare("UPDATE brands SET current_score = current_score + 2 WHERE id = ?").bind(auth.brand_id).run();

                return json({ success: true, count: fixes.length, message: "Weekly plan optimized with drafts." });
             } catch (e) {
                return error("Fix failed", "INTERNAL_ERROR", null, 500);
             }
          }

          if (method === "GET" && path === "/api/customer/intelligence/progression") {
            const db = env.mypilotpost;
            const brand = await db.prepare("SELECT archetype, archetype_level, archetype_exp, current_score, name FROM brands WHERE id = ?").bind(auth.brand_id).first();
            
            // Calculate percentile (Simulated elite status)
            const percentile = brand?.current_score > 90 ? 98 : brand?.current_score > 70 ? 85 : 60;
            
            return json({
               archetype: brand.archetype,
               level: brand.archetype_level,
               exp: brand.archetype_exp,
               next_level: brand.archetype_level * 100,
               percentile,
               brand_name: brand.name
            });
          }
          if (method === "POST" && path === "/api/customer/intelligence/reports") {
            const db = env.mypilotpost;
            try {
              const report = await generateAIStrategyReport(db, auth.brand_id, env);
              return json(report);
            } catch (e) {
              return error("Report Generation failed", "AI_FAILED", null, 500);
            }
          }

          if (method === "GET" && path === "/api/customer/intelligence/reports/history") {
             const db = env.mypilotpost;
             const history = await db.prepare("SELECT id, public_id, score_at_time, is_public, created_at FROM brand_growth_reports WHERE brand_id = ? ORDER BY created_at DESC").bind(auth.brand_id).all();
             return json({ reports: history.results });
          }

          if (method === "PATCH" && path.startsWith("/api/customer/intelligence/reports/")) {
             const reportId = path.split("/").pop();
             const { is_public } = await request.json();
             const db = env.mypilotpost;
             await db.prepare("UPDATE brand_growth_reports SET is_public = ? WHERE id = ? AND brand_id = ?").bind(is_public, reportId, auth.brand_id).run();
             return json({ success: true });
          }

          if (method === "GET" && path.startsWith("/api/public/reports/")) {
              const publicId = path.split("/").pop();
              const db = env.mypilotpost;
              const report = await db.prepare("SELECT content_json, score_at_time, created_at FROM brand_growth_reports WHERE public_id = ? AND is_public = 1").bind(publicId).first();
              if (!report) return error("Report not found or private", "NOT_FOUND", null, 404);
              return json(report);
          }

          if (method === "GET" && path === "/api/customer/intelligence/achievements") {
            const db = env.mypilotpost;
            const { results } = await db.prepare(`
    SELECT * FROM brand_insights
    WHERE brand_id = ? AND resolved = 0
    ORDER BY priority DESC, created_at DESC
    LIMIT ?
  `).bind(auth.brand_id, parseInt(new URL(request.url).searchParams.get("limit")) || 50).all();
            return json({ achievements: results });
          }

          if (method === "POST" && path === "/api/customer/intelligence/audit/refresh") {
            const db = env.mypilotpost;
            try {
               const audit = await getAIAnalysis(db, auth.brand_id, 'audit', null, env, true, { mode: 'deep', priority: 'high' });
               await checkAndUnlockAchievements(db, auth.brand_id, env);
               return json(audit);
            } catch (e) {
               if (e.message === "AI_COOLDOWN") return json({ error: "AI_COOLDOWN" }, 429);
               return error("Audit refresh failed", "AI_FAILED", null, 500);
            }
          }

          if (method === "POST" && path === "/api/customer/intelligence/copilot") {
            const db = env.mypilotpost;
            const body = await request.json();
            try {
              const copilot = await getCoPilotGuidance(db, auth.brand_id, body, env);
              return json(copilot);
            } catch (e) {
              return error("Co-Pilot failed", "AI_FAILED", null, 500);
            }
          }

         if (method === "GET" && path.startsWith("/api/customer/campaigns/") && path.endsWith("/ai-analysis")) {
           const db = env.mypilotpost;
           const campaignId = path.split("/")[4];
           try {
             const ai = await getAIAnalysis(db, auth.brand_id, 'campaign', campaignId, env, false, { mode: 'fast', priority: 'normal' });
             return json(ai);
           } catch (e) {
             return error("Campaign AI analysis failed", "AI_FAILED", null, 500);
           }
         }

        if (method === "PUT" && path.startsWith("/api/customer/schedule/")) {
          const jobId = path.split("/")[4];
          return withCors(request, updateSchedule(request, env, auth, jobId));
        }

        if (method === "DELETE" && path.startsWith("/api/customer/schedule/")) {
          const jobId = path.split("/")[4];
          return withCors(request, deleteSchedule(request, env, auth, jobId));
        }

        /* ---------- MARKETING BLOG (ADMIN) ---------- */
        if (method === "POST" && path === "/api/customer/marketing/blog")
          return withCors(request, createMarketingPost(request, env, auth));

        if (method === "GET" && path === "/api/customer/marketing/blog")
          return withCors(request, listMarketingPosts(request, env, auth));

        /* ---------- GET SINGLE MARKETING POST (ADMIN) ---------- */
        if (
          method === "GET" &&
          path.startsWith("/api/customer/marketing/blog/") &&
          path.split("/").length === 6
        ) {
          const id = path.split("/")[5];

          const response = await (async () => {
            const post = await env.mypilotpost.prepare(`
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

          return withCors(request, Promise.resolve(response));
        }

        if (method === "PATCH" && path.startsWith("/api/customer/marketing/blog/")) {
          const id = path.split("/")[5];
          return withCors(request, updateMarketingPost(request, env, auth, id));
        }

        if (method === "DELETE" && path.startsWith("/api/customer/marketing/blog/")) {
          const id = path.split("/")[5];
          return withCors(request, deleteMarketingPost(request, env, auth, id));
        }

        /* ---------- COLLABORATION & APPROVAL ---------- */
        if (method === "PATCH" && path.startsWith("/api/customer/content/") && path.endsWith("/status")) {
          const id = path.split("/")[4];
          return withCors(request, updateContentStatus(request, env, auth, id));
        }

        if (method === "GET" && path.startsWith("/api/customer/content/") && path.endsWith("/comments")) {
          const id = path.split("/")[4];
          request.params = { id };
          return withCors(request, listComments(request, env, auth));
        }

        if (method === "POST" && path.startsWith("/api/customer/content/") && path.endsWith("/comments")) {
          const id = path.split("/")[4];
          request.params = { id };
          return withCors(request, addComment(request, env, auth));
        }

        /* ---------- UNIFIED SCHEDULING (PHASE 2) ---------- */
        if (method === "POST" && path === "/api/customer/content/schedule")
          return withCors(request, scheduleContent(request, env, auth));

        if (method === "POST" && path === "/api/customer/content/reschedule")
          return withCors(request, rescheduleContent(request, env, auth));

        if (method === "POST" && path === "/api/customer/content/post-now")
          return withCors(request, postNow(request, env, auth));

        /* ---------- CONTENT ---------- */
        if (method === "GET" && (path === "/api/customer/content" || path === "/api/customer/content/social"))
          return withCors(request, listDrafts(request, env, auth));

        if (method === "POST" && path === "/api/customer/content/blog")
          return withCors(request, createBlogPost(request, env, auth));


        if (
          method === "POST" &&
          path.startsWith("/api/customer/content/blog/") &&
          path.endsWith("/schedule")
        )
          return withCors(request, scheduleBlogPost(request, env, auth));

        if (
          method === "GET" &&
          (path.startsWith("/api/customer/content/blog/") || path.startsWith("/api/customer/content/article/")) &&
          !path.endsWith("/ready") &&
          !path.endsWith("/schedule") &&
          !path.endsWith("/status")
        ) {
          const id = path.split("/")[5];
          return withCors(request, getBlogPost(request, env, auth, id));
        }

        if (
          method === "PATCH" &&
          (path.startsWith("/api/customer/content/blog/") || path.startsWith("/api/customer/content/article/")) &&
          !path.endsWith("/ready") &&
          !path.endsWith("/schedule") &&
          !path.endsWith("/status")
        ) {
          const id = path.split("/")[5];
          return withCors(request, updateBlogPost(request, env, auth, id));
        }

        if (path.startsWith("/api/customer/content/social")) {
          const auth = await requireBrandContext(request, env);
          if (method === "POST" && path.endsWith("/submit-approval")) return withCors(request, import("./core/content/social.js").then(m => m.submitForApproval(request, env, auth)));
          if (method === "POST" && path.endsWith("/approve")) return withCors(request, import("./core/content/social.js").then(m => m.approveContent(request, env, auth)));
          if (method === "POST" && path.endsWith("/reject")) return withCors(request, import("./core/content/social.js").then(m => m.rejectContent(request, env, auth)));
          if (method === "POST" && path === "/api/customer/content/social") return withCors(request, createSocialAsset(request, env, auth));
          if (method === "POST" && path === "/api/customer/content/social/approve-bulk") return withCors(request, approveSocialAssetsBulk(request, env, auth));
          if (method === "GET" && path === "/api/customer/content/social") return withCors(request, listDrafts(request, env, auth));
          if (method === "GET") return withCors(request, getSocialAsset(request, env, auth));
          if (method === "PATCH") return withCors(request, createSocialAsset(request, env, auth));
          if (method === "DELETE") return withCors(request, deleteSocialAsset(request, env, auth));
        }

        /* ---------- GROWTH ENGINE ---------- */
        if (path === "/api/customer/growth/score") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, import("./core/experience/growth.js").then(m => m.getGrowthScore(request, env, auth)));
        }

        /* ---------- REPORTING SYSTEM ---------- */
        if (path === "/api/customer/reports/generate") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, import("./core/reporting/engine.js").then(m => m.generateReport(request, env, auth)));
        }
        if (path === "/api/customer/reports") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, import("./core/reporting/engine.js").then(m => m.listReports(request, env, auth)));
        }

        /* ---------- UNIFIED MESSAGING ---------- */
        if (path === "/api/customer/messages/send") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, import("./core/messages/messages.js").then(m => m.sendMessage(request, env, auth)));
        }
        if (path === "/api/customer/messages") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, import("./core/messages/messages.js").then(m => m.listMessages(request, env, auth)));
        }

        if (method === "POST" && path === "/api/customer/delivery/retry")
          return withCors(request, manualRetryJob(request, env, auth));
        if (method === "GET" && path === "/api/customer/delivery/stats")
          return withCors(request, getDeliveryStats(request, env, auth));


        /* ---------- MEDIA ---------- */
        if (method === "GET" && path === "/api/customer/media/library")
          return withCors(request, listMediaLibrary(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/suggestions")
          return withCors(request, getMediaSuggestions(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-freepik")
          return withCors(request, registerFreepikMedia(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/attach")
          return withCors(request, attachMedia(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/detach")
          return withCors(request, detachMedia(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/media/attached/")) {
          const parts = path.split("/");
          request.params = { type: parts[5], id: parts[6] };
          return withCors(request, getAttachedMedia(request, env, auth));
        }

        if (method === "GET" && path === "/api/customer/media/google-drive/list")
          return withCors(request, listGoogleDriveFiles(request, env, auth));

        if (method === "GET" && path === "/api/customer/media/dropbox/list")
          return withCors(request, listDropboxFiles(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-google-drive")
          return withCors(request, importFromGoogleDrive(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-dropbox")
          return withCors(request, importFromDropbox(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/from-canva")
          return withCors(request, importFromCanva(request, env, auth));

        if (method === "POST" && path === "/api/customer/media/upload")
          return withCors(request, uploadMedia(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/media/file/"))
          return withCors(request, serveMediaFile(request, env, auth));

        /* ---------- ANALYTICS & REPORTING ---------- */
        if (method === "GET" && path === "/api/customer/analytics/overview")
          return withCors(request, getAnalyticsOverview(request, env, auth));

        switch (path) {
          case "/api/customer/analytics/detailed": return withCors(request, getAnalyticsDetailed(request, env, auth));
          case "/api/customer/analytics/content": return withCors(request, getContentAnalytics(request, env, auth));
          case "/api/customer/analytics/seo/overview": return withCors(request, getSEOOverview(request, env, auth));
          case "/api/customer/analytics/report/generate": return withCors(request, generateReport(request, env, auth));
        }

        if (method === "PATCH" && path === "/api/customer/analytics/report/update")
          return withCors(request, updateReport(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/analytics/report/"))
          return withCors(request, getReport(request, env, auth));

        if (method === "GET" && path === "/api/customer/analytics/reports")
          return withCors(request, listReports(request, env, auth));

        /* ---------- BRAND INTELLIGENCE ---------- */
        if (method === "GET" && path === "/api/customer/intelligence")
          return withCors(request, getInsights(request, env, auth));

        if (method === "POST" && path === "/api/customer/intelligence/run")
          return withCors(request, generateInsights(request, env, auth));

        if (method === "DELETE" && path === "/api/customer/compliance/delete-account")
          return withCors(request, handleDataDeletionRequest(request, env, auth));

        /* ---------- COMPLIANCE (PHASE 13) ---------- */
        if (method === "POST" && path === "/api/customer/account/delete-request")
          return withCors(request, handleDeleteRequest(request, env, auth));

        if (method === "DELETE" && path === "/api/customer/account/delete-request")
          return withCors(request, handleDeleteCancel(request, env, auth));

        if (method === "GET" && path === "/api/customer/account/delete-status")
          return withCors(request, handleDeleteStatus(request, env, auth));

        if (method === "POST" && path === "/api/customer/data/export")
          return withCors(request, handleDataExport(request, env, auth));

        if (method === "GET" && path === "/api/customer/data/export/history")
          return withCors(request, handleExportHistory(request, env, auth));

        if (method === "POST" && path === "/api/customer/consent")
          return withCors(request, handleConsentUpdate(request, env, auth));

        if (method === "GET" && path === "/api/customer/consent")
          return withCors(request, handleConsentGet(request, env, auth));

        /* ---------- SETTINGS ---------- */
        if (method === "GET" && path === "/api/customer/settings/agency")
          return withCors(request, getAgencyBranding(request, env, auth));

        if (method === "PATCH" && path === "/api/customer/settings/agency")
          return withCors(request, updateAgencyBranding(request, env, auth));

        /* ---------- BRAND INTELLIGENCE ---------- */
        if (method === "GET" && path === "/api/customer/brand-intelligence")
          return withCors(request, getBrandIntelligence(request, env, auth));

        /* ---------- DASHBOARD (CORE) ---------- */
        if (method === "GET" && (path === "/api/customer/dashboard/summary" || path === "/api/customer/dashboard/overview"))
          return withCors(request, getDashboardSummary(request, env, auth));

        if (method === "GET" && path === "/api/customer/activity")
          return withCors(request, getActivity(request, env, auth));

        if (method === "GET" && path === "/api/customer/experience")
          return withCors(request, getExperienceSummary(request, env, auth));

        /* ---------- NOTIFICATIONS ---------- */
        if (method === "GET" && path === "/api/customer/notifications")
          return withCors(request, getNotifications(request, env, auth));

        if (method === "POST" && path === "/api/customer/notifications/read")
          return withCors(request, markNotificationRead(request, env, auth));

        /* ---------- CAMPAIGNS V2 ---------- */
        if (method === "GET" && path === "/api/customer/campaigns")
          return withCors(request, getCampaigns(request, env, auth));

        if (method === "POST" && path === "/api/customer/campaigns/create")
          return withCors(request, createCampaign(request, env, auth));

        if (method === "POST" && path === "/api/customer/campaigns/link")
          return withCors(request, linkContentToCampaign(request, env, auth));

        if (method === "POST" && path === "/api/customer/campaigns/unlink")
          return withCors(request, unlinkContentFromCampaign(request, env, auth));

        switch (path) {
          case "/api/customer/campaigns/comparison": return withCors(request, getCampaignComparison(request, env, auth));
          case "/api/customer/seo/analyze": return withCors(request, analyzeContentSEO(request, env, auth));
        }

        if (method === "GET" && path === "/api/customer/campaigns/patterns")
          return withCors(request, detectCampaignPatterns(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/campaigns/")) {
          const parts = path.split("/");
          const campaignId = parts[4];
          const subRoute = parts[5];

          if (subRoute === "timeline") return withCors(request, getTimeline(request, env, auth, campaignId));
          if (subRoute === "insights") return withCors(request, getCampaignInsights(request, env, auth, campaignId));
          
          return withCors(request, getCampaignDetails(request, env, auth, campaignId));
        }


        /* ---------- AI & SEO ---------- */
        if (method === "POST" && path === "/api/customer/ai/generate/social")
          return withCors(request, generateSocialContent(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/generate/blog")
          return withCors(request, generateBlogArticle(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/grammar")
          return withCors(request, grammarCheck(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/hashtags")
          return withCors(request, generateHashtags(request, env, auth));
      }


      return withCors(request, Promise.resolve(error("Route not found", "NOT_FOUND", null, 404)));
    } catch (err) {
      return withCors(request, Promise.resolve(handleError(err)));
    }
  },

  async scheduled(event, env, ctx) {
    const cron = event.cron;
    console.log(`[CRON] Triggered: ${cron}`);

    ctx.waitUntil(
      (async () => {
        // Every-minute cron: delivery scheduler + email worker
        if (cron === "* * * * *") {
          try {
            await runDeliveryScheduler(env, ctx);
          } catch (err) {
            console.error("[CRON] Delivery scheduler failed:", err?.message || err);
          }
          try {
            await runEmailWorker(env);
          } catch (err) {
            console.error("[CRON] Email worker failed:", err?.message || err);
          }
        }

        // Daily 3am cron: lifecycle email campaigns
        if (cron === "0 3 * * *") {
          try {
            await runLifecycleCron(env);
          } catch (err) {
            console.error("[CRON] Lifecycle cron failed:", err?.message || err);
          }
        }

        // Every 4 hours: refresh expiring OAuth tokens
        if (cron === "0 */4 * * *") {
          try {
            await runBackgroundRefresh(env);
          } catch (err) {
            console.error("[CRON] Token refresh failed:", err?.message || err);
          }
        }
      })()
    );
  }
};
export { SupportChatRoom };
