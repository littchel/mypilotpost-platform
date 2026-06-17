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
  getSocialConnectionById,
  disconnectSocialConnection,
  refreshConnectionOnDemand
} from "./integrations/handlers.js";

import {
  startUnifiedOAuth,
  handleUnifiedCallback
} from "./integrations/oauth_unified.js";

import { getAdobeConfig, getAdobeStatus } from "./integrations/adobe.js";

/* ── Build Wave 3 — Platform Ops + Content + Config ── */
import { listAdminJobs, retryAdminJob } from "./api/admin/jobs.js";
import { listAdminMedia, traceMediaUsage, deleteAdminMedia } from "./api/admin/media.js";
import { getAdminUsage } from "./api/admin/usage.js";
import { getAdminRoles, getSystemExtended, getAdminTemplates } from "./api/admin/governance.js";
import { getAdminSEOOverview } from "./api/admin/seo.js";

import {
  getAccountResources,
  selectResource,
  getGMBLocations
} from "./integrations/google-accounts.js";

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
  changePassword,
  logout,
  refreshSession
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
import { updateMemberRole, removeMember, revokeInvite } from "./core/team/members.js";
import { listClients, createClient, updateClient, archiveClient, sendToClient, getClientLinks } from "./core/team/clients.js";
import { createSupportRequest, listSupportRequests } from "./core/support/requests.js";
import { adminListThreads, adminGetThreadByUser, adminUpdateThread, adminSendMessage } from "./core/support/admin.js";
import { getMemory, getFeatures, getSnapshot, getEvents } from "./core/memory/query.js";
import { getActivity as getTeamActivity } from "./core/team/activity.js";
import { getCommPreferences, updateCommPreferences } from "./core/communication/preferences.js";
import { recordNotificationEvent, handleOpenPixel } from "./core/communication/tracking.js";
import { submitForApproval, getApprovalRequests } from "./core/approvals/handlers.js";
import {
  listVault, saveToVault, getVaultItem, deleteVaultItem,
  vaultApproval, vaultSchedule, vaultPublishNow, vaultCancel,
  getApprovalItems,
} from "./core/content/vault.js";
import { createReport, getReports, shareReport, renderReportHandler } from "./core/reporting/handlers.js";
import { approveSocialAssetsBulk } from "./core/content/social.js";
import {
  getGrowthSummary,
  getGrowthActivity,
  getGrowthRewards,
  processGrowthAction,
  redeemReward,
  registerReferral as registerGrowthReferral
} from "./core/growth/handlers.js";
import { getGrowthEngine } from "./core/growth/growth_engine.js";
import {
  listInsights, resolveInsight, listAudits, getFullAudit,
  getIntelligenceFeedHandler, dismissIntelligenceHandler, forceRefreshIntelligence,
  getDashboardFeedHandler, recordImpressionHandler, acknowledgeHandler,
  runDailyIntelligence,
} from "./core/intelligence/handlers.js";
import { getInsightsFeed } from "./core/insights/handlers.js";
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
import { rewriteContent } from "./core/ai/rewrite.js";
import { regenerateContent } from "./core/ai/regenerate.js";

/* ======================================================
   MEDIA
====================================================== */
import {
  listMediaLibrary,
  attachMedia,
  detachMedia,
  registerPexelsMedia,
  getAttachedMedia,
  uploadMedia,
  serveMediaFile,
  servePublicMediaFile
} from "./core/media/media.js";

import { getMediaSuggestions } from "./core/media/intelligence/controller.js";

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

import { getCalendarItems } from "./core/schedule/calendar.js";

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
  detectCampaignPatterns,
  updateCampaignStatus,
} from "./core/campaigns/campaigns.js";

import { generateCampaignPlan, generatePostIdea, generateRecommendation, generateVisualBrief } from "./core/templates/templates.js";
import { getStudioOpportunities, generateStudioPost, runPlaybook, generateCampaignContent, getStudioVault, scrapeWebsite } from "./core/studio/studio.js";

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

import { handleAdminUsers, handleAdminUserDetail, toggleAdminUserStatus, forceVerifyUser } from "./api/admin/users.js";
import {
  getCustomerProfile,
  patchCustomer,
  getCustomerSubscriptions,
  getCustomerSupport,
  getCustomerActivity,
  getCustomerAccess,
  revokeCustomerSession,
  getCustomerLifecycle,
  getCustomerAudit,
  getCustomerHealthSummary,
} from "./api/admin/customers.js";

import {
  billingOverview,
  mrrHistory,
  listAdminPayments,
  listAdminCheckouts,
  listAdminSubscriptions,
  billingCompliance,
} from "./api/admin/billing.js";
import {
  requestRefund,
  getRefundRequest,
  listRefundRequests,
  approveRefund,
  rejectRefund,
  getCustomerRefunds,
} from "./api/admin/refund.js";
import { deliveryAnalytics } from "./api/admin/analytics.js";
import { handleYocoWebhook } from "./core/billing/yoco-webhook.js";
import { getCurrentPlan } from "./core/billing/billing.js";
import {
  createCheckout, getCheckout, cancelCheckout,
  checkoutSuccess, checkoutCancel,
} from "./core/billing/checkout.js";
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
  getAnalyticsTimeseries,
  getAnalyticsDetailed,
  generateReport,
  saveReportSnapshot as updateReport,
  getReportSnapshots as getReport,
  listReports,
  getSEOOverview,
  getContentAnalytics
} from "./core/analytics/analytics.js";
import { getExecutiveAnalytics } from "./core/analytics/executive.js";
import { analyzeContentSEO, getSEOSummary, getSEOKeywords } from "./core/seo/seo.js";
import {
  syncSearchConsoleData,
  getSearchConsoleProperties,
  getSearchConsoleOverview
} from "./integrations/search_console.js";

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
  publicGetMarketingPost,
  uploadBlogMedia
} from "./core/marketing/blog.js";
import { getAuditReport, getAuditReportPDF, getPublicAuditReport } from "./core/reports/audit_report.js";
import { getPublicPricing } from "./api/admin/pricing.js";
import { getSystemEvents } from "./api/admin/observability-api.js";
import { writeSystemEvent, getAdminDashboardOverview, getAdminAuditLog } from "./api/admin/observability.js";
import { aggregateDeliveryMetrics } from "./api/admin/delivery-metrics.js";
import { isControlActive } from "./lib/controls.js";
import { getIntegrationsDiagnostics } from "./api/admin/integrations-diagnostics.js";
import { runBackfill, getBackfillStatus } from "./core/delivery/performance/backfill/engine.js";
import { getAttributionDiagnostics } from "./api/admin/attribution-diagnostics.js";
import { getAdminRewardsOverview } from "./api/admin/rewards.js";
import {
  listPlans, createPlan, updatePlan, archivePlan, clonePlan, getPlanVersions,
  listFeatures, createFeature, updateFeature,
  listPlanEntitlements, updateEntitlement,
  getCommercialMetrics,
} from "./api/admin/commercial.js";
import { requireEntitlement, getCustomerEntitlementSummary } from "./lib/entitlements.js";

/* ======================================================
   PLATFORM SANDBOX
====================================================== */
import { runPlatformTest, listTestableConnections } from "./api/admin/platform-test.js";

/* ======================================================
   CERTIFICATION
====================================================== */
import {
  getCertificationMatrix,
  validateMediaUrl,
  getPlatformDeliveryHistory,
} from "./api/customer/certification.js";

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
    "https://admin.mypilotpost.com",
    "https://mypilotpost-admin-v3.littchel.workers.dev"
  ];

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[allowedOrigins.length - 1],
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Secret",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };

  return headers;
}

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Secret",
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
             SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as completed
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
    SELECT id, code,
           discount_type, discount_type AS type,
           discount_value, discount_value AS value,
           max_uses,
           uses_count, uses_count AS used_count,
           is_active, expires_at, created_at
    FROM promotions ORDER BY created_at DESC LIMIT 50
  `).all().catch(() => ({ results: [] }));
  return json({ promotions: results || [] });
}

async function createAdminPromotion(request, env, auth) {
  const db = getDB(env);
  const body = await request.json().catch(() => ({}));
  const code = body.code;
  const discount_type = body.discount_type || body.type;
  const discount_value = body.discount_value !== undefined ? body.discount_value : body.value;
  const max_uses = body.max_uses;
  const expires_at = body.expires_at;

  if (!code || !discount_type || discount_value === undefined || discount_value === null) {
    return error("code, type/discount_type, and value/discount_value are required", "BAD_REQUEST", null, 400);
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

async function deleteAdminPromotion(request, env, auth) {
  const db = getDB(env);
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  const promotion = await db.prepare("SELECT code, uses_count, expires_at FROM promotions WHERE id = ?").bind(id).first();
  if (!promotion) {
    return error("Promotion not found", "NOT_FOUND", null, 404);
  }

  if ((promotion.uses_count ?? 0) > 0) {
    return error("Cannot delete promotion with active usage history", "FORBIDDEN", null, 403);
  }

  const isExpired = promotion.expires_at && new Date(promotion.expires_at) < new Date();
  if (!isExpired) {
    return error("Cannot delete active or unexpired promotion", "FORBIDDEN", null, 403);
  }

  await db.prepare("DELETE FROM promotions WHERE id = ?").bind(id).run();
  await logAdminAction(env, auth, "delete_promotion", "promotion", id, { code: promotion.code });
  return json({ success: true });
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
      if (path === "/api/health") {
        // Live health check: verify DB is reachable
        try {
          const _db = getDB(env);
          await _db.prepare("SELECT 1").first();
          return withCors(request, Promise.resolve(json({ status: "ok", version: "1.1.1" })));
        } catch (_e) {
          return withCors(request, Promise.resolve(json({ status: "degraded", version: "1.1.1", detail: "DB unreachable" }, 503)));
        }
      }

      /* ================= MAINTENANCE MODE GATE ================= */
      if (path.startsWith("/api/customer/") || (path.startsWith("/api/v1/") && !path.startsWith("/api/v1/admin") && !path.startsWith("/api/v1/support") && !path.startsWith("/api/v1/auth") && !path.startsWith("/api/v1/pricing") && !path.startsWith("/api/v1/audit"))) {
        try {
          const _db = getDB(env);
          const maint = await isControlActive(_db, 'maintenance_mode');
          if (maint) return withCors(request, Promise.resolve(json({ error: "Platform is temporarily unavailable for maintenance", code: "MAINTENANCE" }, 503)));
        } catch (_e) { /* fail-open */ }
      }

      /* ================= PUBLIC MEDIA (no auth — UUID-keyed R2 assets for platform adapters) ================= */
      if ((method === "GET" || method === "HEAD") && path.startsWith("/api/media/file/"))
        return withCors(request, servePublicMediaFile(request, env));

      /* ================= SUPPORT (SSE & MESSAGES) ================= */
      if (path.startsWith("/api/v1/support")) {
        const supportRes = await supportRoutes.fetch(request, env);
        // Hono doesn't add CORS headers — inject them here
        const corsH = getCorsHeaders(request);
        const newHeaders = new Headers(supportRes.headers);
        Object.entries({ ...securityHeaders, ...corsH }).forEach(([k, v]) => {
          newHeaders.set(k, v);
        });
        return new Response(supportRes.body, { status: supportRes.status, headers: newHeaders });
      }

      /* ================= INTERNAL PERFORMANCE INGESTION ================= */
      if (method === "POST" && path === "/api/internal/performance/ingest") {
        // requireAdminAuth (not requireAdmin) — internal ops must require is_admin:true JWT.
        // requireAdmin accepts customer JWTs whose brand role happens to be 'admin', which
        // would allow any brand admin to trigger platform-wide performance ingestion.
        await requireAdminAuth(request, env);
        await runPerformanceIngestion(env);
        return json({ success: true }, 200, { ...securityHeaders, ...defaultCorsHeaders });
      }

      /* ================= INTERNAL BRAND INTELLIGENCE ================= */
      if (method === "POST" && path === "/api/internal/intelligence/run") {
        await requireAdminAuth(request, env);
        // Trigger for ALL brands or specific? Let's allow specific via query
        return withCors(request, generateInsights(request, env));
      }

      /* ================= INTERNAL DELIVERY JOB EXECUTION ================= */
      if (method === "POST" && path === "/api/internal/delivery/run") {
        await requireAdminAuth(request, env);

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

      /* ================= CHECKOUT REDIRECT TARGETS (public — no auth) ================= */
      // Yoco redirects the browser here after payment. The frontend polls /success until paid.
      if (method === "GET" && path === "/api/checkout/success")
        return withCors(request, checkoutSuccess(request, env));

      if (method === "GET" && path === "/api/checkout/cancel")
        return withCors(request, checkoutCancel(request, env));

      /* ================= PUBLIC BRAND AUDIT (CONVERSION) ================= */
      if (method === "POST" && path === "/api/public/brand-audit") {
        return withCors(request, runPublicAudit(request, env));
      }

      if (method === "GET" && path.startsWith("/api/t/") && path.endsWith("/open.gif"))
        return handleOpenPixel(request, env);

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

      /* ================= PUBLIC APPROVAL (token-gated, no auth) ================= */
      if (method === "GET" && path.startsWith("/api/public/approval/") && !path.endsWith("/comment")) {
        const shareToken = path.split("/")[4];
        return withCors(request, getPublicContent(request, env, shareToken));
      }

      if (method === "POST" && path.startsWith("/api/public/approval/") && path.endsWith("/comment")) {
        const shareToken = path.split("/")[4];
        return withCors(request, addPublicComment(request, env, shareToken));
      }

      if (method === "POST" && path.startsWith("/api/public/approval/") && !path.endsWith("/comment")) {
        const shareToken = path.split("/")[4];
        return withCors(request, submitPublicDecision(request, env, shareToken));
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
        const _regPaused = await isControlActive(getDB(env), 'pause_registration').catch(() => false);
        if (_regPaused) return withCors(request, Promise.resolve(json({ error: "Registrations are temporarily paused", code: "REGISTRATION_PAUSED" }, 503)));
        return withCors(request, register(request, env));
      }

      if (path === "/api/v1/auth/register" && method === "POST") {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return limited;
        const _regPaused = await isControlActive(getDB(env), 'pause_registration').catch(() => false);
        if (_regPaused) return json({ error: "Registrations are temporarily paused", code: "REGISTRATION_PAUSED" }, 503);
        return withCors(request, register(request, env));
      }

      if (method === "POST" && (path === "/api/customer/login" || path === "/api/v1/auth/login")) {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return withCors(request, Promise.resolve(limited));
        return withCors(request, login(request, env));
      }

      if (method === "POST" && (path === "/api/customer/auth/logout" || path === "/api/v1/auth/logout")) {
        const auth = await requireAuth(request, env);
        return withCors(request, logout(request, env, auth));
      }

      if (method === "POST" && (path === "/api/customer/auth/refresh" || path === "/api/v1/auth/refresh")) {
        const limited = await rateLimit(request, env, "auth");
        if (limited) return withCors(request, Promise.resolve(limited));
        return withCors(request, refreshSession(request, env));
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

      /* ================= OAUTH CALLBACKS (PUBLIC) ================= */
      // Legacy path: /api/customer/oauth/:platform/callback
      // Proxied to unified flow — writes to social_connections (not connected_accounts)
      if (method === "GET" && path.startsWith("/api/customer/oauth/") && path.endsWith("/callback")) {
        const provider = path.split("/")[4];
        const unifiedUrl = new URL(request.url);
        unifiedUrl.pathname = `/api/oauth/${provider}/callback`;
        return handleUnifiedCallback(new Request(unifiedUrl.toString(), request), env);
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

      /* ---------- RESOURCE SELECTION (PROTECTED) ---------- */
      if (method === "GET" && path.startsWith("/api/oauth/") && path.endsWith("/accounts")) {
        const auth = await requireAuth(request, env);
        return withCors(request, getAccountResources(request, env, auth));
      }
      if (method === "POST" && path.startsWith("/api/oauth/") && path.endsWith("/select")) {
        const auth = await requireAuth(request, env);
        return withCors(request, selectResource(request, env, auth));
      }
      if (method === "GET" && path === "/api/oauth/google_business/locations") {
        const auth = await requireAuth(request, env);
        return withCors(request, getGMBLocations(request, env, auth));
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
        return withCors(request, (async () => {
        if (path === "/api/v1/admin/overview") {
          await requireAdminAuth(request, env);
          return getAdminDashboardOverview(env);
        }

        if (path === "/api/v1/admin/billing/overview") {
          await requireAdminAuth(request, env);
          return billingOverview(env);
        }

        if (path === "/api/v1/admin/billing/mrr-history") {
          await requireAdminAuth(request, env);
          return mrrHistory(env);
        }

        if (path === "/api/v1/admin/billing/payments" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listAdminPayments(env));
        }

        if (path === "/api/v1/admin/billing/checkouts" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listAdminCheckouts(env));
        }

        if (path === "/api/v1/admin/billing/subscriptions" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listAdminSubscriptions(env));
        }

        if (path === "/api/v1/admin/billing/compliance" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, billingCompliance(env));
        }

        /* ---------- REFUND DOMAIN ---------- */
        if (path === "/api/v1/admin/billing/refund/request" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!["super_admin","admin"].includes(auth.role))
            throw error("Admin role required for refund requests", "FORBIDDEN", null, 403);
          const res = await requestRefund(request, env, auth);
          await logAdminAction(env, auth, "refund_request", "billing", "payment", {}).catch(() => {});
          return withCors(request, res);
        }

        if (path === "/api/v1/admin/billing/refunds" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listRefundRequests(env));
        }

        if (path.startsWith("/api/v1/admin/billing/refund/") && method === "GET") {
          await requireAdminAuth(request, env);
          const refundId = path.split("/")[6];
          return withCors(request, getRefundRequest(request, env, refundId));
        }

        if (path.startsWith("/api/v1/admin/billing/refund/") && path.endsWith("/approve") && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!["super_admin","admin"].includes(auth.role))
            throw error("Admin role required to approve refunds", "FORBIDDEN", null, 403);
          const refundId = path.split("/")[6];
          const res = await approveRefund(request, env, auth, refundId);
          await logAdminAction(env, auth, "refund_approve", "billing", refundId, {}).catch(() => {});
          return withCors(request, res);
        }

        if (path.startsWith("/api/v1/admin/billing/refund/") && path.endsWith("/reject") && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!["super_admin","admin"].includes(auth.role))
            throw error("Admin role required to reject refunds", "FORBIDDEN", null, 403);
          const refundId = path.split("/")[6];
          const res = await rejectRefund(request, env, refundId);
          await logAdminAction(env, auth, "refund_reject", "billing", refundId, {}).catch(() => {});
          return withCors(request, res);
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
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "users:write")) throw error("Insufficient permissions: users:write required", "FORBIDDEN", null, 403);
          return toggleAdminUserStatus(request, env, path.split("/")[5], auth);
        }

        if (path === "/api/v1/admin/campaigns") {
          const auth = await requireAdminAuth(request, env);
          if (method === 'GET') {
            // Admin-level: list all campaigns across all brands (no X-Brand-Id required)
            const db = getDB(env);
            const url2 = new URL(request.url);
            const brand_id = url2.searchParams.get('brand_id');
            let q = `SELECT c.id, c.brand_id, c.name, c.objective, c.channel, c.status, c.created_at,
                            b.name as brand_name
                     FROM campaigns c JOIN brands b ON b.id = c.brand_id`;
            const binds = [];
            if (brand_id) { q += ' WHERE c.brand_id = ?'; binds.push(brand_id); }
            q += ' ORDER BY c.created_at DESC LIMIT 200';
            const { results } = binds.length
              ? await db.prepare(q).bind(...binds).all()
              : await db.prepare(q).all();
            return json({ campaigns: results || [] });
          }
          const res = await handleCampaigns(request, env);
          if (method === 'POST') logAdminAction(env, auth, 'create_campaign', 'campaign', 'new', {}).catch(() => {});
          return res;
        }

        if (path.startsWith("/api/v1/admin/campaigns/") && path.endsWith("/content")) {
          const auth = await requireAdminAuth(request, env);
          const res = await handleCampaignContent(request, env, path.split("/")[5]);
          if (method === 'POST') logAdminAction(env, auth, 'add_campaign_content', 'campaign', path.split("/")[5], {}).catch(() => {});
          return res;
        }

        if (path === "/api/v1/admin/emails/campaigns") {
          const auth = await requireAdminAuth(request, env);
          if (method === 'POST') {
            if (!hasPermission(auth.role, "messaging:write")) throw error("Insufficient permissions: messaging:write required", "FORBIDDEN", null, 403);
          }
          const res = await handleEmailCampaigns(request, env);
          if (method === 'POST') logAdminAction(env, auth, 'create_email_campaign', 'email_campaign', 'new', {}).catch(() => {});
          return res;
        }

        if (path === "/api/v1/admin/emails/messages") {
          const auth = await requireAdminAuth(request, env);
          if (method === 'POST') {
            if (!hasPermission(auth.role, "messaging:write")) throw error("Insufficient permissions: messaging:write required", "FORBIDDEN", null, 403);
          }
          const res = await handleEmailMessages(request, env);
          if (method === 'POST') logAdminAction(env, auth, 'send_email_message', 'email_message', 'new', {}).catch(() => {});
          return res;
        }

        if (path === "/api/v1/admin/emails/templates") {
          const auth = await requireAdminAuth(request, env);
          if (method === 'POST') {
            if (!hasPermission(auth.role, "messaging:write")) throw error("Insufficient permissions: messaging:write required", "FORBIDDEN", null, 403);
          }
          const res = await handleEmailTemplates(request, env);
          if (method === 'POST') logAdminAction(env, auth, 'create_email_template', 'email_template', 'new', {}).catch(() => {});
          return res;
        }

        /* ---------- CUSTOMERS -------------------------------------------- */
        if (path === "/api/v1/admin/customers") {
          await requireAdminAuth(request, env);
          return handleAdminCustomers(request, env);
        }

        // Health summary (Command Center) — must precede the /:id matcher
        if (path === "/api/v1/admin/customers/health-summary" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getCustomerHealthSummary(request, env));
        }

        if (path.startsWith("/api/v1/admin/customers/") && path.endsWith("/toggle")) {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "users:write")) throw error("Insufficient permissions: users:write required", "FORBIDDEN", null, 403);
          return toggleAdminUserStatus(request, env, path.split("/")[5], auth);
        }

        if (path.startsWith("/api/v1/admin/customers/") && path.endsWith("/verify") && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "users:write")) throw error("Insufficient permissions: users:write required", "FORBIDDEN", null, 403);
          return forceVerifyUser(request, env, path.split("/")[5], auth);
        }

        // Sub-resource routes must be matched before the generic /:id GET
        if (path.startsWith("/api/v1/admin/customers/")) {
          const segments = path.split("/");
          // /api/v1/admin/customers/:id  =>  segments[5] = id, segments[6] = sub
          const customerId = segments[5];
          const sub        = segments[6] || null;
          const subsub     = segments[7] || null;

          if (!customerId) { /* fall through */ } else {

            /* PATCH /api/v1/admin/customers/:id — extend trial */
            if (method === "PATCH" && !sub) {
              const auth = await requireAdminAuth(request, env);
              return withCors(request, patchCustomer(request, env, customerId, auth));
            }

            /* GET /api/v1/admin/customers/:id/profile */
            if (method === "GET" && sub === "profile") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerProfile(request, env, customerId));
            }

            /* GET /api/v1/admin/customers/:id/subscriptions */
            if (method === "GET" && sub === "subscriptions") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerSubscriptions(request, env, customerId));
            }

            /* GET /api/v1/admin/customers/:id/support */
            if (method === "GET" && sub === "support") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerSupport(request, env, customerId));
            }

            /* GET /api/v1/admin/customers/:id/activity */
            if (method === "GET" && sub === "activity") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerActivity(request, env, customerId));
            }

            /* GET /api/v1/admin/customers/:id/access */
            if (method === "GET" && sub === "access") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerAccess(request, env, customerId));
            }

            /* DELETE /api/v1/admin/customers/:id/session/:sid */
            if (method === "DELETE" && sub === "session" && subsub) {
              const auth = await requireAdminAuth(request, env);
              return withCors(request, revokeCustomerSession(request, env, customerId, subsub, auth));
            }

            /* GET /api/v1/admin/customers/:id/lifecycle */
            if (method === "GET" && sub === "lifecycle") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerLifecycle(request, env, customerId));
            }

            /* GET /api/v1/admin/customers/:id/audit */
            if (method === "GET" && sub === "audit") {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerAudit(request, env, customerId));
            }

            /* GET /api/v1/admin/customers/:id — full profile (legacy + new) */
            if (method === "GET" && !sub) {
              await requireAdminAuth(request, env);
              return withCors(request, getCustomerProfile(request, env, customerId));
            }
          }
        }

        /* ---------- SUPPORT (canonical: support_threads + support_messages) ---------- */
        if (path === "/api/v1/admin/support/threads") {
          await requireAdminAuth(request, env);
          return getAdminSupportThreads(request, env);
        }

        if (path === "/api/v1/admin/support/requests" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, adminListThreads(request, env));
        }

        if (path.startsWith("/api/v1/admin/support/requests/") && method === "PUT") {
          const auth = await requireAdminAuth(request, env);
          const threadId = path.split("/").pop();
          return withCors(request, adminUpdateThread(request, env, auth, threadId));
        }

        // GET /api/v1/admin/support/:threadUserId — thread + messages for a customer
        if (path.startsWith("/api/v1/admin/support/")
            && method === "GET"
            && !["threads", "requests"].includes(path.split("/")[5])
            && path.split("/").length === 6) {
          await requireAdminAuth(request, env);
          return withCors(request, adminGetThreadByUser(request, env, path.split("/")[5]));
        }

        if (path === "/api/v1/admin/comms/delivery" && method === "GET") {
          await requireAdminAuth(request, env);
          const db = getDB(env);
          const { results } = await db.prepare(`SELECT channel, status, COUNT(*) as count FROM notification_delivery_logs GROUP BY channel, status ORDER BY channel, status`).all();
          return withCors(request, json({ data: results || [] }));
        }

        /* ---------- ADMIN MEMORY ---------- */
        if (path === "/api/v1/admin/memory/events" && method === "GET") {
          await requireAdminAuth(request, env);
          const db  = getDB(env);
          const url2 = new URL(request.url);
          const limit = Math.min(parseInt(url2.searchParams.get('limit')) || 100, 500);
          const { results } = await db.prepare(`SELECT id, brand_id, user_id, tool, event, value, metadata, created_at FROM memory_events ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
          return withCors(request, json({ data: results || [] }));
        }

        if (path === "/api/v1/admin/memory/features" && method === "GET") {
          await requireAdminAuth(request, env);
          const db  = getDB(env);
          const url2 = new URL(request.url);
          const brandId = url2.searchParams.get('brand_id');
          let q = 'SELECT brand_id, feature, value, window, computed_at FROM memory_features';
          const b = [];
          if (brandId) { q += ' WHERE brand_id=?'; b.push(brandId); }
          q += ' ORDER BY computed_at DESC LIMIT 200';
          const { results } = await db.prepare(q).bind(...b).all();
          return withCors(request, json({ data: results || [] }));
        }

        if (path === "/api/v1/admin/memory/brands" && method === "GET") {
          await requireAdminAuth(request, env);
          const db = getDB(env);
          const url2 = new URL(request.url);
          const brandId = url2.searchParams.get('brand_id');
          let q = 'SELECT brand_id, namespace, key, value, confidence, source, updated_at FROM brand_memory';
          const b = [];
          if (brandId) { q += ' WHERE brand_id=?'; b.push(brandId); }
          q += ' ORDER BY brand_id, namespace, key LIMIT 500';
          const { results } = await db.prepare(q).bind(...b).all();
          return withCors(request, json({ data: results || [] }));
        }

        if (path === "/api/v1/admin/support/message" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          return withCors(request, adminSendMessage(request, env, auth));
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

        /* ---------- CONTENT APPROVAL QUEUE (admin view) ---------- */
        if (path === "/api/v1/admin/approvals" && method === "GET") {
          await requireAdminAuth(request, env);
          const db = getDB(env);
          const url2 = new URL(request.url);
          const status = url2.searchParams.get('status') || 'pending';
          const { results } = await db.prepare(`
            SELECT ar.id, ar.brand_id, ar.content_id, ar.status, ar.type,
                   ar.expires_at, ar.created_at, ar.updated_at,
                   b.name AS brand_name,
                   COALESCE(sp.title, bp.title, 'Untitled') AS content_title,
                   COALESCE(sp.content_type, 'post') AS content_type
            FROM approval_requests ar
            LEFT JOIN brands b ON b.id = ar.brand_id
            LEFT JOIN social_posts sp ON sp.id = ar.content_id
            LEFT JOIN blog_posts bp ON bp.id = ar.content_id
            WHERE ar.status = ?
            ORDER BY ar.created_at DESC
            LIMIT 100
          `).bind(status).all().catch(() => ({ results: [] }));
          return withCors(request, json({ approvals: results || [], status }));
        }

        /* ---------- CONTENT APPROVAL QUEUE — update status ---------- */
        if (path.startsWith("/api/v1/admin/approvals/") && method === "PATCH") {
          const auth = await requireAdminAuth(request, env);
          const approvalId = path.split("/")[5];
          if (!approvalId) throw error("Approval ID required", "BAD_REQUEST", null, 400);
          const body = await request.json().catch(() => ({}));
          const VALID = ["pending","review","approved","rejected","changes_requested"];
          if (!VALID.includes(body.status)) throw error("Invalid status", "BAD_REQUEST", null, 400);
          const db = getDB(env);
          const existing = await db.prepare("SELECT id, brand_id, content_id FROM approval_requests WHERE id = ?").bind(approvalId).first();
          if (!existing) throw error("Approval request not found", "NOT_FOUND", null, 404);
          await db.prepare(`UPDATE approval_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, approvalId).run();
          logAdminAction(env, auth, `approval_${body.status}`, "approval_requests", approvalId, { brand_id: existing.brand_id }).catch(() => {});
          writeSystemEvent(env, { severity: "info", source: "approvals", message: `Approval ${approvalId} set to ${body.status} by admin ${auth.user_id}` }).catch(() => {});
          return withCors(request, json({ success: true, id: approvalId, status: body.status }));
        }

        /* ---------- ADMIN ACTION AUDIT LOG (admin_audit_logs) ---------- */
        if (path === "/api/v1/admin/audit-log" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getAdminAuditLog(request, env));
        }

        /* ---------- PLATFORM CONTROLS (kill switches) ---------- */
        if (path === "/api/v1/admin/controls" && method === "GET") {
          await requireAdminAuth(request, env);
          const db = getDB(env);
          const { results } = await db.prepare("SELECT key, enabled, reason, updated_by, updated_at FROM platform_controls ORDER BY key ASC").all();
          return withCors(request, json({ controls: results || [] }));
        }

        if (path.startsWith("/api/v1/admin/controls/") && method === "PATCH") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "*") && auth.role !== 'super_admin' && auth.role !== 'admin') {
            throw error("Platform controls require super_admin or admin role", "FORBIDDEN", null, 403);
          }
          const controlKey = path.split("/")[5];
          if (!controlKey) throw error("Control key required", "BAD_REQUEST", null, 400);
          const body = await request.json().catch(() => ({}));
          const enabled = body.enabled === true || body.enabled === 1 ? 1 : 0;
          const reason = body.reason || null;
          const db = getDB(env);
          const existing = await db.prepare("SELECT key FROM platform_controls WHERE key = ?").bind(controlKey).first();
          if (!existing) throw error(`Unknown control: ${controlKey}`, "NOT_FOUND", null, 404);
          await db.prepare(`
            UPDATE platform_controls SET enabled = ?, reason = ?, updated_by = ?, updated_at = datetime('now')
            WHERE key = ?
          `).bind(enabled, reason, auth.user_id, controlKey).run();
          await logAdminAction(env, auth, enabled ? "enable_control" : "disable_control", "platform_controls", controlKey, { reason });
          writeSystemEvent(env, {
            severity: enabled ? 'warning' : 'info',
            source: 'operations',
            message: `Platform control ${enabled ? 'enabled' : 'disabled'}: ${controlKey}${reason ? ` — ${reason}` : ''}`,
            metadata: JSON.stringify({ key: controlKey, enabled, actor: auth.user_id })
          }).catch(() => {});
          return withCors(request, json({ success: true, key: controlKey, enabled: enabled === 1 }));
        }

        /* ---------- SYSTEM STATUS & EVENTS ---------- */
        if (path === "/api/v1/admin/system/status") {
          await requireAdminAuth(request, env);
          return getAdminSystemStatus(env);
        }

        if (path === "/api/v1/admin/system/events" && method === "GET") {
          await requireAdminAuth(request, env);
          return getSystemEvents(request, env);
        }

        /* ---------- OPERATIONS / HEALTH ---------- */
        if (path === "/api/v1/admin/operations/health") {
          await requireAdminAuth(request, env);
          return getOperationsHealth(env);
        }

        /* ---------- INTEGRATIONS DIAGNOSTICS ---------- */
        if (path === "/api/v1/admin/integrations/diagnostics" && method === "GET") {
          await requireAdminAuth(request, env);
          return getIntegrationsDiagnostics(env);
        }

        /* ---------- HISTORICAL ANALYTICS BACKFILL ---------- */
        if (path === "/api/v1/admin/integrations/backfill" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "operations:read")) throw error("Insufficient permissions: operations:read required", "FORBIDDEN", null, 403);
          const body = await request.json().catch(() => ({}));
          const result = await runBackfill(env, {
            brandId:  body.brand_id  || undefined,
            platform: body.platform  || undefined,
            daysBack: body.days_back || 90,
          });
          logAdminAction(env, auth, "trigger_analytics_backfill", "integrations", body.brand_id || "all", { platform: body.platform, days_back: body.days_back }).catch(() => {});
          return json(result);
        }

        if (path === "/api/v1/admin/integrations/backfill/status" && method === "GET") {
          await requireAdminAuth(request, env);
          const url = new URL(request.url);
          const brandId = url.searchParams.get("brand_id") || undefined;
          const runs = await getBackfillStatus(env, { brandId });
          return json({ runs });
        }

        /* ---------- ATTRIBUTION DIAGNOSTICS ---------- */
        if (path === "/api/v1/admin/attribution/diagnostics" && method === "GET") {
          await requireAdminAuth(request, env);
          return getAttributionDiagnostics(env);
        }

        /* ---------- REWARDS (READ-ONLY) ---------- */
        if (path === "/api/v1/admin/rewards" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getAdminRewardsOverview(request, env));
        }

        /* ---------- PLATFORM CERTIFICATION ---------- */
        if (path.startsWith("/api/v1/admin/certification")) {
          await requireAdminAuth(request, env);
          const brand_id = url.searchParams.get("brand_id");
          if (!brand_id) return withCors(request, Promise.resolve(new Response(JSON.stringify({ error: "brand_id required" }), { status: 400, headers: { "Content-Type": "application/json" } })));
          const certAuth = { brand_id };
          if (path === "/api/v1/admin/certification/matrix" && method === "GET")
            return withCors(request, getCertificationMatrix(request, env, certAuth));
          if (path === "/api/v1/admin/certification/delivery-history" && method === "GET")
            return withCors(request, getPlatformDeliveryHistory(request, env, certAuth));
          if (path === "/api/v1/admin/certification/validate-media" && method === "POST")
            return withCors(request, validateMediaUrl(request, env, certAuth));
        }

        /* ---------- PLATFORM SANDBOX ---------- */
        if (path === "/api/v1/admin/platform-test" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "operations:read")) throw error("Insufficient permissions: operations:read required", "FORBIDDEN", null, 403);
          const testBody = await request.clone().json().catch(() => ({}));
          const testRes = await runPlatformTest(request, env);
          logAdminAction(env, auth, "run_platform_test", "platform_sandbox", testBody.brand_id || "unknown", { platform: testBody.platform }).catch(() => {});
          return withCors(request, testRes);
        }
        if (path === "/api/v1/admin/platform-test/connections" && method === "GET") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "operations:read")) throw error("Insufficient permissions: operations:read required", "FORBIDDEN", null, 403);
          return withCors(request, listTestableConnections(request, env));
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
        if (path === "/api/v1/admin/blog/upload" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          return uploadBlogMedia(request, env, auth);
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
        if (path.startsWith("/api/v1/admin/promotions/") && method === "DELETE") {
          const auth = await requireAdminAuth(request, env);
          return deleteAdminPromotion(request, env, auth);
        }

        /* ---------- COMMERCIAL CONTROL SYSTEM ---------- */

        // Plans
        if (path === "/api/v1/admin/commercial/plans" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listPlans(env));
        }
        if (path === "/api/v1/admin/commercial/plans" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "*") && !["super_admin","admin"].includes(auth.role))
            throw error("admin role required", "FORBIDDEN", null, 403);
          return withCors(request, createPlan(request, env, auth));
        }
        if (path.startsWith("/api/v1/admin/commercial/plans/") && path.endsWith("/archive")) {
          const auth = await requireAdminAuth(request, env);
          const planId = path.split("/")[6];
          if (!hasPermission(auth.role, "*") && !["super_admin","admin"].includes(auth.role))
            throw error("admin role required", "FORBIDDEN", null, 403);
          logAdminAction(env, auth, "archive_plan", "plans", planId, {}).catch(() => {});
          return withCors(request, archivePlan(request, env, auth, planId));
        }
        if (path.startsWith("/api/v1/admin/commercial/plans/") && path.endsWith("/clone")) {
          const auth = await requireAdminAuth(request, env);
          const planId = path.split("/")[6];
          logAdminAction(env, auth, "clone_plan", "plans", planId, {}).catch(() => {});
          return withCors(request, clonePlan(request, env, auth, planId));
        }
        if (path.startsWith("/api/v1/admin/commercial/plans/") && path.endsWith("/versions")) {
          await requireAdminAuth(request, env);
          const planId = path.split("/")[6];
          return withCors(request, getPlanVersions(env, planId));
        }
        if (path.startsWith("/api/v1/admin/commercial/plans/") && method === "PATCH") {
          const auth = await requireAdminAuth(request, env);
          const planId = path.split("/")[6];
          logAdminAction(env, auth, "update_plan", "plans", planId, {}).catch(() => {});
          return withCors(request, updatePlan(request, env, auth, planId));
        }

        // Features catalog
        if (path === "/api/v1/admin/commercial/features" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listFeatures(env));
        }
        if (path === "/api/v1/admin/commercial/features" && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          logAdminAction(env, auth, "create_feature", "plan_features", "new", {}).catch(() => {});
          return withCors(request, createFeature(request, env));
        }
        if (path.startsWith("/api/v1/admin/commercial/features/") && method === "PATCH") {
          const auth = await requireAdminAuth(request, env);
          const featureKey = path.split("/")[6];
          logAdminAction(env, auth, "update_feature", "plan_features", featureKey, {}).catch(() => {});
          return withCors(request, updateFeature(request, env, featureKey));
        }

        // Entitlements
        if (path.startsWith("/api/v1/admin/commercial/entitlements/")) {
          const auth = await requireAdminAuth(request, env);
          const parts = path.split("/");
          const planId = parts[6];
          const featureKey = parts[7];
          if (method === "GET") {
            return withCors(request, listPlanEntitlements(env, planId));
          }
          if (method === "PATCH" && featureKey) {
            logAdminAction(env, auth, "update_entitlement", "plan_entitlements", `${planId}:${featureKey}`, {}).catch(() => {});
            return withCors(request, updateEntitlement(request, env, auth, planId, featureKey));
          }
        }

        // Commercial metrics
        if (path === "/api/v1/admin/commercial/metrics" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getCommercialMetrics(env));
        }

        /* ---------- BUILD WAVE 3 — Platform Ops + Content + Config ---------- */
        if (path === "/api/v1/admin/jobs" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listAdminJobs(request, env));
        }
        if (path.startsWith("/api/v1/admin/jobs/") && path.endsWith("/retry") && method === "POST") {
          const auth = await requireAdminAuth(request, env);
          if (!hasPermission(auth.role, "operations:read")) throw error("operations access required", "FORBIDDEN", null, 403);
          return withCors(request, retryAdminJob(request, env, auth, path.split("/")[5]));
        }
        if (path === "/api/v1/admin/media" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, listAdminMedia(request, env));
        }
        if (path.startsWith("/api/v1/admin/media/") && path.endsWith("/usage") && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, traceMediaUsage(request, env, path.split("/")[5]));
        }
        if (path.startsWith("/api/v1/admin/media/") && method === "DELETE") {
          const auth = await requireAdminAuth(request, env);
          return withCors(request, deleteAdminMedia(request, env, auth, path.split("/")[5]));
        }
        if (path === "/api/v1/admin/usage" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getAdminUsage(request, env));
        }
        if (path === "/api/v1/admin/roles" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, Promise.resolve(getAdminRoles()));
        }
        if (path === "/api/v1/admin/system/extended" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getSystemExtended(env));
        }
        if (path === "/api/v1/admin/templates" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, Promise.resolve(getAdminTemplates()));
        }
        if (path === "/api/v1/admin/seo/overview" && method === "GET") {
          await requireAdminAuth(request, env);
          return withCors(request, getAdminSEOOverview(request, env));
        }

        /* ---------- STUBS (authenticated, not yet implemented) ---------- */
        for (const stubPath of [
          "/api/v1/admin/memory",
          "/api/v1/admin/automation/rules",
          "/api/v1/admin/ml/health",
          "/api/v1/admin/experiments",
        ]) {
          if (path === stubPath) {
            await requireAdminAuth(request, env);
            return withCors(request, Promise.resolve(new Response(
              JSON.stringify({ error: "Not implemented", stub: true }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            )));
          }
        }
      })());
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
        // Legacy path: /api/customer/oauth/:platform/start
        // Proxied to unified flow — stores state in KV, writes to social_connections on callback
        if (method === "GET" && path.startsWith("/api/customer/oauth/") && path.endsWith("/start")) {
          const provider = path.split("/")[4];
          const unifiedUrl = new URL(request.url);
          unifiedUrl.pathname = `/api/oauth/${provider}/connect`;
          return withCors(request, startUnifiedOAuth(new Request(unifiedUrl.toString(), request), env, auth));
        }

        if (method === "GET" && path === "/api/customer/integrations")
          return withCors(request, listIntegrations(request, env, auth));

        /* ── Adobe (Express Embed config + capability status) ── */
        if (method === "GET" && path === "/api/customer/integrations/adobe/config")
          return withCors(request, getAdobeConfig(env));
        if (method === "GET" && path === "/api/customer/integrations/adobe/status")
          return withCors(request, getAdobeStatus(env));

        if (method === "DELETE" && path.startsWith("/api/customer/integrations/")) {
          const id = path.split("/")[4];
          request.params = { id };
          return withCors(request, disconnectIntegration(request, env, auth));
        }

        /* ---------- SOCIAL CONNECTIONS (unified table) ---------- */
        if (method === "GET" && path === "/api/customer/social-connections")
          return withCors(request, listSocialConnections(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/social-connections/")) {
          const id = path.split("/")[4];
          request.params = { id };
          return withCors(request, getSocialConnectionById(request, env, auth));
        }

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

        if (method === "GET" && path === "/api/customer/onboarding/platforms")
          return withCors(request, listPlatforms(request, env, auth));

        if (method === "POST" && path === "/api/customer/onboarding/platforms")
          return withCors(request, savePlatforms(request, env, auth));

        if (method === "GET" && path === "/api/customer/onboarding/readiness")
          return withCors(request, getReadiness(request, env, auth));

        if (path.startsWith("/api/customer/onboarding/platforms/")) {
          const platformName = path.split("/")[5];
          if (method === "POST" && path.endsWith("/connect"))
            return withCors(request, connectPlatform(request, env, auth, platformName));
          if (method === "POST" && path.endsWith("/disconnect"))
            return withCors(request, disconnectPlatform(request, env, auth, platformName));
        }

        /* ---------- CHECKOUT ---------- */
        if (method === "POST" && path === "/api/customer/checkout/create")
          return withCors(request, createCheckout(request, env, auth));

        if (method === "GET" && path.startsWith("/api/customer/checkouts/") && !path.endsWith("/cancel")) {
          const checkoutId = path.split("/")[4];
          return withCors(request, getCheckout(request, env, auth, checkoutId));
        }

        if (method === "POST" && path.startsWith("/api/customer/checkouts/") && path.endsWith("/cancel")) {
          const checkoutId = path.split("/")[4];
          return withCors(request, cancelCheckout(request, env, auth, checkoutId));
        }

        /* ---------- BILLING ---------- */
        if (method === "GET" && path === "/api/customer/billing/plan") {
           const db = env.mypilotpost;
           const plan = await getCurrentPlan(db, auth.user_id);
           // Include brand_id and period info so frontend can initiate checkout without a separate call
           const sub = await db.prepare(
             "SELECT customer_id AS brand_id, current_period_start, current_period_end FROM subscriptions WHERE user_id = ? LIMIT 1"
           ).bind(auth.user_id).first().catch(() => null);
           return json({
             plan: {
               ...plan,
               brand_id:             sub?.brand_id             || auth.brand_id || null,
               current_period_start: sub?.current_period_start || null,
               current_period_end:   sub?.current_period_end   || null,
             }
           }, 200, getCorsHeaders(request));
        }

        if (method === "GET" && path === "/api/customer/entitlements") {
          const db = getDB(env);
          const summary = await getCustomerEntitlementSummary(db, auth.user_id);
          return json(summary, 200, getCorsHeaders(request));
        }

        if (method === "POST" && path === "/api/customer/billing/upgrade") {
           const body = await request.json();
           const { plan_id } = body;
           if (!plan_id) return json({ error: "plan_id required" }, 400, getCorsHeaders(request));
           const db = env.mypilotpost;
           // Verify plan exists before proceeding
           const validPlan = await db.prepare("SELECT id, name FROM plans WHERE id = ? AND is_active = 1").bind(plan_id).first();
           if (!validPlan) return json({ error: "Invalid plan" }, 400, getCorsHeaders(request));
           // Verify a confirmed payment exists for this brand.
           // The Yoco webhook activates the subscription; this endpoint confirms it completed.
           const confirmedPayment = await db.prepare(`
             SELECT 1 FROM payments WHERE brand_id = ? AND status = 'succeeded' LIMIT 1
           `).bind(auth.brand_id).first();
           if (!confirmedPayment) {
             return json({
               error: "No confirmed payment found. Complete your payment first.",
               code: "PAYMENT_REQUIRED"
             }, 402, getCorsHeaders(request));
           }
           // Webhook already activated the plan. Return current plan state — no entitlement writes.
           const currentPlan = await getCurrentPlan(db, auth.user_id);
           return json({ success: true, plan: currentPlan }, 200, getCorsHeaders(request));
        }

        if (method === "GET" && path === "/api/customer/billing/history") {
           const db = env.mypilotpost;
           // Restrict to brands the user OWNS (not just member of) to prevent
           // payment data leakage to invited team members.
           const { results } = await db.prepare(`
             SELECT p.provider, p.amount, p.currency, p.status, p.occurred_at
             FROM payments p
             JOIN brands b ON b.id = p.brand_id
             WHERE b.owner_user_id = ?
             ORDER BY p.occurred_at DESC LIMIT 50
           `).bind(auth.user_id).all();
           return json({ history: results || [] }, 200, getCorsHeaders(request));
        }

        if (method === "GET" && path === "/api/customer/billing/refunds")
          return withCors(request, getCustomerRefunds(request, env, auth));

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
         if (method === "GET" && path === "/api/customer/calendar")
           return withCors(request, getCalendarItems(request, env, auth));

         if (method === "GET" && path === "/api/customer/schedule")
           return withCors(request, getSchedule(request, env, auth));

         if (method === "POST" && path === "/api/customer/schedule")
           return withCors(request, createSchedule(request, env, auth));

         /* ---------- TEAM & INVITES ---------- */
         if (method === "GET" && path === "/api/customer/team")
           return withCors(request, getTeam(request, env, auth));
         
         if (method === "GET" && path === "/api/customer/invites")
           return withCors(request, getInvites(request, env, auth));
         
         if (method === "POST" && path === "/api/customer/invites")
           return withCors(request, createInvite(request, env, auth));

         if (method === "PUT" && path.startsWith("/api/customer/team/") && !path.endsWith("/team/"))
           return withCors(request, updateMemberRole(request, env, auth));

         if (method === "DELETE" && path.startsWith("/api/customer/team/") && !path.endsWith("/team/"))
           return withCors(request, removeMember(request, env, auth));

         if (method === "DELETE" && path.startsWith("/api/customer/invites/") && !path.endsWith("/invites/accept"))
           return withCors(request, revokeInvite(request, env, auth));

         /* ---------- CLIENTS ---------- */
         if (method === "GET"    && path === "/api/customer/clients")
           return withCors(request, listClients(request, env, auth));
         if (method === "POST"   && path === "/api/customer/clients")
           return withCors(request, createClient(request, env, auth));
         if (method === "PUT"    && path.startsWith("/api/customer/clients/") && !path.includes("/send") && !path.includes("/links"))
           return withCors(request, updateClient(request, env, auth));
         if (method === "DELETE" && path.startsWith("/api/customer/clients/") && !path.includes("/send"))
           return withCors(request, archiveClient(request, env, auth));
         if (method === "POST"   && path.startsWith("/api/customer/clients/") && path.endsWith("/send"))
           return withCors(request, sendToClient(request, env, auth));
         if (method === "GET"    && path.startsWith("/api/customer/clients/") && path.endsWith("/links"))
           return withCors(request, getClientLinks(request, env, auth));

         /* ---------- ACTIVITY LOG ---------- */
         if (method === "GET" && path === "/api/customer/activity")
           return withCors(request, getTeamActivity(request, env, auth));

         /* ---------- COMMUNICATION PREFERENCES ---------- */
         if (method === "GET" && path === "/api/customer/communication/preferences")
           return withCors(request, getCommPreferences(request, env, auth));
         if (method === "PUT" && path === "/api/customer/communication/preferences")
           return withCors(request, updateCommPreferences(request, env, auth));

         if (method === "POST" && path.startsWith("/api/customer/notifications/") && path.endsWith("/event"))
           return withCors(request, recordNotificationEvent(request, env, auth));

         /* ---------- SUPPORT ---------- */
         if (method === "POST" && path === "/api/customer/support")
           return withCors(request, createSupportRequest(request, env, auth));
         if (method === "GET"  && path === "/api/customer/support")
           return withCors(request, listSupportRequests(request, env, auth));

         /* ---------- MEMORY LAYER (read-only) ---------- */
         if (method === "GET" && path === "/api/customer/memory")
           return withCors(request, getMemory(request, env, auth));
         if (method === "GET" && path === "/api/customer/features")
           return withCors(request, getFeatures(request, env, auth));
         if (method === "GET" && path === "/api/customer/memory/snapshot")
           return withCors(request, getSnapshot(request, env, auth));
         if (method === "GET" && path === "/api/customer/memory/events")
           return withCors(request, getEvents(request, env, auth));

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

         if (method === "POST" && path === "/api/customer/reports/render")
           return withCors(request, renderReportHandler(request, env, auth));


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

         if (method === "POST" && path === "/api/customer/growth/reward/redeem")
           return withCors(request, redeemReward(request, env, auth));

         if (method === "GET" && path === "/api/customer/growth-engine")
           return withCors(request, getGrowthEngine(request, env, auth));


                   if (method === "GET" && path === "/api/customer/analytics/executive")
            return withCors(request, getExecutiveAnalytics(request, env, auth));

          /* ---------- INSIGHTS (OPERATIONAL FEED) ---------- */
         if (method === "GET"  && path === "/api/customer/insights/feed") return withCors(request, getInsightsFeed(request, env, auth));

          /* ---------- INTELLIGENCE & AUDITS ---------- */
         if (method === "GET"  && path === "/api/customer/intelligence") return withCors(request, listInsights(request, env, auth));
         if (method === "POST" && path === "/api/customer/intelligence/resolve") return withCors(request, resolveInsight(request, env, auth));
         if (method === "GET"  && path === "/api/customer/intelligence/audits") return withCors(request, listAudits(request, env, auth));
         if (method === "GET"  && path.startsWith("/api/customer/intelligence/audits/")) return withCors(request, getFullAudit(request, env, auth));
         if (method === "GET"  && path === "/api/customer/intelligence/feed") return withCors(request, getIntelligenceFeedHandler(request, env, auth));
         if (method === "GET"  && path === "/api/customer/intelligence/dashboard") return withCors(request, getDashboardFeedHandler(request, env, auth));
         if (method === "POST" && path === "/api/customer/intelligence/force-refresh") return withCors(request, forceRefreshIntelligence(request, env, auth));
         if (method === "POST" && path.startsWith("/api/customer/intelligence/dismiss/")) return withCors(request, dismissIntelligenceHandler(request, env, auth));
         if (method === "POST" && path.startsWith("/api/customer/intelligence/impression/")) return withCors(request, recordImpressionHandler(request, env, auth));
         if (method === "POST" && path.startsWith("/api/customer/intelligence/acknowledge/")) return withCors(request, acknowledgeHandler(request, env, auth));

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
                // 1. Get AI fixes (analysis only — no delivery_jobs created here)
                const plan = await getAIAnalysis(db, auth.brand_id, 'weekly_plan', null, env);
                const fixes = plan?.fixes || [];

                // 2. Grant XP for strategic alignment
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

        /* ══════════════════════════════════════════════
           CONTENT VAULT — UNIFIED PIPELINE (CANONICAL)
           Single entry for all content types.
           All editors, AI Studio, and approvals route here.
           ══════════════════════════════════════════════ */

        if (method === "GET"  && path === "/api/customer/vault")
          return withCors(request, listVault(request, env, auth));

        if (method === "POST" && path === "/api/customer/vault")
          return withCors(request, saveToVault(request, env, auth));

        if (method === "GET"  && path === "/api/customer/vault/approvals")
          return withCors(request, getApprovalItems(request, env, auth));

        if (path.startsWith("/api/customer/vault/")) {
          const vaultId = path.split("/")[4];
          if (!vaultId) { /* fall through */ }
          else {
            request.params = { id: vaultId };
            const tail = path.split("/").slice(5).join("/");

            if (method === "GET"    && !tail) return withCors(request, getVaultItem(request, env, auth));
            if (method === "PATCH"  && !tail) return withCors(request, saveToVault(request, env, auth));
            if (method === "DELETE" && !tail) return withCors(request, deleteVaultItem(request, env, auth));
            if (method === "POST"   && tail === "approval")    return withCors(request, vaultApproval(request, env, auth));
            if (method === "POST"   && tail === "schedule")    return withCors(request, vaultSchedule(request, env, auth));
            if (method === "POST"   && tail === "publish-now") return withCors(request, vaultPublishNow(request, env, auth));
            if (method === "POST"   && tail === "cancel")      return withCors(request, vaultCancel(request, env, auth));
          }
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
          if (path.endsWith("/variants")) {
            const contentId = path.split("/")[5];
            if (method === "GET") return withCors(request, getSocialVariants(request, env, contentId, auth));
            if (method === "PUT" || method === "PATCH") return withCors(request, saveSocialVariants(request, env, contentId, auth));
          }
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
        // Legacy paths redirect to canonical analytics.js report engine
        if (path === "/api/customer/reports/generate") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, generateReport(request, env, auth));
        }
        if (path === "/api/customer/reports" && method === "GET") {
          const auth = await requireBrandContext(request, env);
          return withCors(request, listReports(request, env, auth));
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

        if (method === "POST" && path === "/api/customer/media/from-pexels")
          return withCors(request, registerPexelsMedia(request, env, auth));

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

        if (method === "GET" && path === "/api/customer/analytics/timeseries")
          return withCors(request, getAnalyticsTimeseries(request, env, auth));

        switch (path) {
          case "/api/customer/analytics/detailed": return withCors(request, getAnalyticsDetailed(request, env, auth));
          case "/api/customer/analytics/content": return withCors(request, getContentAnalytics(request, env, auth));
          case "/api/customer/analytics/seo/overview": return withCors(request, getSEOOverview(request, env, auth));
          case "/api/customer/analytics/report/generate": return withCors(request, generateReport(request, env, auth));
          case "/api/customer/analytics/search-console/overview": return withCors(request, getSearchConsoleOverview(request, env, auth));
          case "/api/customer/analytics/search-console/properties": return withCors(request, getSearchConsoleProperties(request, env, auth));
        }

        if (method === "POST" && path === "/api/customer/analytics/search-console/sync")
          return withCors(request, syncSearchConsoleData(request, env, auth));

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
        }
        if (method === "POST" && path === "/api/customer/seo/analyze")
          return withCors(request, analyzeContentSEO(request, env, auth));

        if (method === "GET" && path === "/api/customer/seo/summary")
          return withCors(request, getSEOSummary(request, env, auth));

        if (method === "GET" && path === "/api/customer/seo/keywords")
          return withCors(request, getSEOKeywords(request, env, auth));

        if (method === "GET" && path === "/api/customer/campaigns/patterns")
          return withCors(request, detectCampaignPatterns(request, env, auth));

        if (path.startsWith("/api/customer/campaigns/")) {
          const parts = path.split("/");
          const campaignId = parts[4];
          const subRoute = parts[5];

          if (method === "PATCH" && !subRoute) return withCors(request, updateCampaignStatus(request, env, auth, campaignId));
          if (method === "GET" && subRoute === "timeline") return withCors(request, getTimeline(request, env, auth, campaignId));
          if (method === "GET" && subRoute === "insights") return withCors(request, getCampaignInsights(request, env, auth, campaignId));
          if (method === "GET" && !subRoute) return withCors(request, getCampaignDetails(request, env, auth, campaignId));
        }

        /* ---------- AI CONTENT STUDIO ---------- */
        if (method === "GET"  && path === "/api/customer/studio/opportunities")
          return withCors(request, getStudioOpportunities(request, env, auth));
        if (method === "POST" && path === "/api/customer/studio/generate-post")
          return withCors(request, generateStudioPost(request, env, auth));
        if (method === "POST" && path === "/api/customer/studio/playbook")
          return withCors(request, runPlaybook(request, env, auth));
        if (method === "POST" && path === "/api/customer/studio/campaign")
          return withCors(request, generateCampaignContent(request, env, auth));
        if (method === "GET"  && path === "/api/customer/studio/vault")
          return withCors(request, getStudioVault(request, env, auth));
        if (method === "POST" && path === "/api/customer/studio/scrape-website")
          return withCors(request, scrapeWebsite(request, env, auth));

        /* ---------- TEMPLATES ---------- */
        if (method === "POST" && path === "/api/customer/templates/generate-campaign")
          return withCors(request, generateCampaignPlan(request, env, auth));

        if (method === "POST" && path === "/api/customer/templates/generate-post")
          return withCors(request, generatePostIdea(request, env, auth));

        if (method === "POST" && path === "/api/customer/templates/generate-recommendation")
          return withCors(request, generateRecommendation(request, env, auth));

        if (method === "POST" && path === "/api/customer/templates/visual-brief")
          return withCors(request, generateVisualBrief(request, env, auth));

        /* ---------- AI & SEO ---------- */
        if (method === "POST" && path === "/api/customer/ai/generate/social")
          return withCors(request, generateSocialContent(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/generate/blog")
          return withCors(request, generateBlogArticle(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/grammar")
          return withCors(request, grammarCheck(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/hashtags")
          return withCors(request, generateHashtags(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/rewrite")
          return withCors(request, rewriteContent(request, env, auth));

        if (method === "POST" && path === "/api/customer/ai/regenerate")
          return withCors(request, regenerateContent(request, env, auth));

        /* ─── CERTIFICATION ─── */
        if (method === "GET"  && path === "/api/customer/certification/matrix")
          return withCors(request, getCertificationMatrix(request, env, auth));
        if (method === "POST" && path === "/api/customer/certification/validate-media")
          return withCors(request, validateMediaUrl(request, env, auth));
        if (method === "GET"  && path === "/api/customer/certification/delivery-history")
          return withCors(request, getPlatformDeliveryHistory(request, env, auth));
      }


      return withCors(request, Promise.resolve(error("Route not found", "NOT_FOUND", null, 404)));
    } catch (err) {
      return withCors(request, Promise.resolve(handleError(err)));
    }
  },

  async scheduled(event, env, ctx) {
    const cron = event.cron;
    console.log(`[CRON] Triggered: ${cron}`);
    writeSystemEvent(env, { severity: 'info', source: 'cron', message: `Cron triggered: ${cron}` }).catch(() => {});

    ctx.waitUntil(
      (async () => {
        // Every-minute cron: delivery scheduler + email worker
        if (cron === "* * * * *" || cron === "") {
          if (cron === "") {
            console.warn("[CRON] Received test scheduled event without cron string. Running every-minute delivery/email workers.");
          }
          try {
            await runDeliveryScheduler(env, ctx);
          } catch (err) {
            console.error("[CRON] Delivery scheduler failed:", err?.message || err);
            writeSystemEvent(env, { severity: 'critical', source: 'cron', message: `Delivery scheduler crashed: ${err?.message}` }).catch(() => {});
          }
          try {
            await runEmailWorker(env);
          } catch (err) {
            console.error("[CRON] Email worker failed:", err?.message || err);
            writeSystemEvent(env, { severity: 'warning', source: 'cron', message: `Email worker failed: ${err?.message}` }).catch(() => {});
          }
        }

        // Daily 3am cron: lifecycle emails + brand intelligence pre-generation
        if (cron === "0 3 * * *") {
          try {
            await runLifecycleCron(env);
          } catch (err) {
            console.error("[CRON] Lifecycle cron failed:", err?.message || err);
            writeSystemEvent(env, { severity: 'warning', source: 'cron', message: `Lifecycle cron failed: ${err?.message}` }).catch(() => {});
          }

          // Pre-generate intelligence for active brands so users see fresh intelligence on first login
          try {
            const db = getDB(env);
            const { results: activeBrands } = await db.prepare(`
              SELECT id FROM brands
              WHERE (last_intelligence_run_at IS NULL OR last_intelligence_run_at < datetime('now', '-23 hours'))
                AND id IN (
                  SELECT DISTINCT brand_id FROM delivery_jobs
                  WHERE created_at > datetime('now', '-30 days')
                  UNION
                  SELECT DISTINCT brand_id FROM content_analytics
                  WHERE created_at > datetime('now', '-30 days')
                )
              LIMIT 30
            `).all();

            console.log(`[CRON_INTEL] Pre-generating intelligence for ${activeBrands?.length || 0} active brands`);
            for (const brand of (activeBrands || [])) {
              try {
                await runDailyIntelligence(env, brand.id, false);
              } catch (e) {
                console.error(`[CRON_INTEL] Failed for brand=${brand.id}: ${e.message}`);
              }
            }
          } catch (err) {
            console.error("[CRON_INTEL] Daily intelligence cron failed:", err?.message || err);
            writeSystemEvent(env, { severity: 'warning', source: 'cron', message: `Intelligence pre-generation failed: ${err?.message}` }).catch(() => {});
          }
        }

        // Daily 3am: process pending account deletions (7-day grace window)
        if (cron === "0 3 * * *") {
          try {
            await processPendingDeletions(env);
          } catch (err) {
            console.error("[CRON] processPendingDeletions failed:", err?.message || err);
            writeSystemEvent(env, { severity: 'warning', source: 'cron', message: `Account deletion cron failed: ${err?.message}` }).catch(() => {});
          }
        }

        // Daily 3am: memory aggregation + retention
        if (cron === "0 3 * * *") {
          try {
            const { runDailyAggregation, runWeeklyAggregation } = await import("./core/memory/aggregator.js");
            await runDailyAggregation(env);
            // Weekly aggregation on Mondays (getDay() === 1)
            if (new Date().getDay() === 1) {
              await runWeeklyAggregation(env);
            }
          } catch (err) { console.error("[CRON] Memory aggregation failed:", err?.message); }

          try {
            const { runRetention } = await import("./core/memory/retention.js");
            await runRetention(env);
          } catch (err) { console.error("[CRON] Memory retention failed:", err?.message); }
        }

        // Daily 3am: analytics backfill for site-level platforms (GA4, GSC)
        if (cron === "0 3 * * *") {
          for (const analyticsPlatform of ["google_analytics", "google_search_console"]) {
            try {
              await runBackfill(env, { platform: analyticsPlatform, daysBack: 7 });
            } catch (err) {
              console.error(`[CRON] Backfill ${analyticsPlatform} failed:`, err?.message || err);
            }
          }
        }

        // Phase 5: Daily 3am — aggregate delivery metrics + update platform_health
        if (cron === "0 3 * * *") {
          try {
            await aggregateDeliveryMetrics(env);
          } catch (err) {
            console.error("[CRON] aggregateDeliveryMetrics failed:", err?.message || err);
          }
        }

        // Phase 9: Daily 3am — retention for system/audit tables
        if (cron === "0 3 * * *") {
          try {
            const db = getDB(env);
            await db.batch([
              db.prepare("DELETE FROM admin_system_events WHERE created_at < datetime('now', '-90 days')"),
              db.prepare("DELETE FROM admin_audit_logs WHERE created_at < datetime('now', '-180 days')"),
              db.prepare("DELETE FROM compliance_audit_log WHERE created_at < datetime('now', '-365 days')"),
            ]);
          } catch (err) {
            console.error("[CRON] Ops retention failed:", err?.message || err);
          }
        }

        // Every 4 hours: refresh expiring OAuth tokens
        if (cron === "0 */4 * * *") {
          try {
            await runBackgroundRefresh(env);
          } catch (err) {
            console.error("[CRON] Token refresh failed:", err?.message || err);
            writeSystemEvent(env, { severity: 'warning', source: 'cron', message: `OAuth token refresh failed: ${err?.message}` }).catch(() => {});
          }
        }
      })()
    );
  }
};
export { SupportChatRoom };
