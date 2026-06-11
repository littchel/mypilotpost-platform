import { getToken, clearToken } from "./auth";
import type {
  ApiError, PaginatedResponse,
  OverviewStats, SystemStatus, SystemEvent, OperationsHealth,
  Customer, CustomerDetail,
  SupportThread, SupportRequest,
  BillingOverview, MrrHistoryItem, Promotion, CommsDeliveryRow,
  ComplianceDeletion, ComplianceExport,
  Plan, PlanFeature, PlanEntitlement, PlanVersion, CommercialMetrics,
  DeliveryStats, IntegrationDiagnostic, AttributionDiagnostic,
  BackfillRun, PlatformTestResult, CertificationMatrix, RewardsOverview,
  BlogPost, ContentApproval, Campaign, EmailCampaign,
  KillSwitch, AuditLogEntry, MemoryEvent, MemoryFeature, BrandMemory,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.mypilotpost.com/api";

export class ApiResponseError extends Error {
  status: number;
  body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.error ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login/";
    throw new ApiResponseError(401, { error: "Unauthorized" });
  }
  const ct = res.headers.get("content-type") ?? "";
  const body: unknown = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const err = (typeof body === "object" && body !== null) ? (body as ApiError) : { error: String(body) };
    throw new ApiResponseError(res.status, err);
  }
  return body as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const apiLogin = (email: string, password: string) =>
  request<{ token: string }>("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const apiGetSession = () =>
  request<{ user: { id: string; email: string; role: string } }>("/admin/session");

// ── Overview ───────────────────────────────────────────────────────────────
export const apiGetOverview = () =>
  request<OverviewStats>("/v1/admin/overview");

export const apiGetSystemStatus = () =>
  request<SystemStatus>("/v1/admin/system/status").catch(() => ({ db_ok: false, queue_ok: false, ai_ok: false, worker_ok: false, status: "down" as const }));

export const apiGetSystemEvents = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ events: SystemEvent[]; data?: SystemEvent[] }>(`/v1/admin/system/events?${qs}`).catch(() => ({ events: [] }));
};

export const apiGetOperationsHealth = () =>
  request<OperationsHealth>("/v1/admin/operations/health").catch(() => ({} as OperationsHealth));

// ── Customers ─────────────────────────────────────────────────────────────
export const apiListCustomers = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: Customer[]; total: number; page: number; limit: number }>(`/v1/admin/customers?${qs}`);
};

export const apiGetCustomer = (userId: string) =>
  request<CustomerDetail>(`/v1/admin/customers/${userId}`);

export const apiPatchCustomer = (userId: string, body: Record<string, unknown>) =>
  request<{ success: boolean }>(`/v1/admin/customers/${userId}`, { method: "PATCH", body: JSON.stringify(body) })
    .catch(() => ({ success: false }));

export const apiToggleUser = (userId: string) =>
  request<{ success: boolean; data: { is_active: number } }>(`/v1/admin/customers/${userId}/toggle`, { method: "POST" });

export const apiVerifyUser = (userId: string) =>
  request<{ success: boolean }>(`/v1/admin/customers/${userId}/verify`, { method: "POST" });

export const apiExtendTrial = (userId: string, days: number) =>
  request<{ success: boolean }>(`/v1/admin/customers/${userId}`, { method: "PATCH", body: JSON.stringify({ extend_trial_days: days }) })
    .catch(() => ({ success: false }));

// ── Support ────────────────────────────────────────────────────────────────
export const apiListSupportThreads = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ threads?: SupportThread[]; data?: SupportThread[] }>(`/v1/admin/support/threads?${qs}`);
};

export const apiListSupportRequests = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: SupportRequest[]; total?: number }>(`/v1/admin/support/requests?${qs}`);
};

export const apiUpdateSupportRequest = (id: string, body: Record<string, unknown>) =>
  request<{ success: boolean }>(`/v1/admin/support/requests/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const apiSendSupportMessage = (receiver_id: string, message: string) =>
  request<{ success: boolean }>("/v1/admin/support/message", { method: "POST", body: JSON.stringify({ receiver_id, message }) });

export const apiBroadcastMessage = (body: Record<string, unknown>) =>
  request<{ success: boolean }>("/v1/admin/support/broadcast", { method: "POST", body: JSON.stringify(body) });

// ── Billing ────────────────────────────────────────────────────────────────
export const apiGetBillingOverview = () =>
  request<BillingOverview>("/v1/admin/billing/overview");

export const apiGetMrrHistory = () =>
  request<{ history: MrrHistoryItem[] }>("/v1/admin/billing/mrr-history").catch(() => ({ history: [] }));

export const apiListPromotions = () =>
  request<{ promotions: Promotion[] }>("/v1/admin/promotions");

export const apiCreatePromotion = (body: Record<string, unknown>) =>
  request<{ id: string }>("/v1/admin/promotions", { method: "POST", body: JSON.stringify(body) });

export const apiIssueRefund = (subscription_id: string, amount: number, reason: string) =>
  request<{ success: boolean }>("/v1/admin/billing/refund", { method: "POST", body: JSON.stringify({ subscription_id, amount, reason }) })
    .catch(() => ({ success: false }));

export const apiGetCommsDelivery = () =>
  request<{ data: CommsDeliveryRow[] }>("/v1/admin/comms/delivery").catch(() => ({ data: [] }));

export const apiListDeletions = () =>
  request<{ data: ComplianceDeletion[]; total?: number }>("/v1/admin/compliance/deletions").catch(() => ({ data: [] }));

export const apiListExports = () =>
  request<{ data: ComplianceExport[]; total?: number }>("/v1/admin/compliance/exports").catch(() => ({ data: [] }));

export const apiGetComplianceAuditLog = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: AuditLogEntry[] }>(`/v1/admin/compliance/audit-log?${qs}`).catch(() => ({ data: [] }));
};

// ── Commercial ─────────────────────────────────────────────────────────────
export const apiListPlans = () =>
  request<{ plans: Plan[] }>("/v1/admin/commercial/plans");

export const apiCreatePlan = (body: Record<string, unknown>) =>
  request<{ id: string; slug?: string }>("/v1/admin/commercial/plans", { method: "POST", body: JSON.stringify(body) });

export const apiUpdatePlan = (planId: string, body: Record<string, unknown>) =>
  request<{ success: boolean }>(`/v1/admin/commercial/plans/${planId}`, { method: "PATCH", body: JSON.stringify(body) });

export const apiArchivePlan = (planId: string) =>
  request<{ success: boolean }>(`/v1/admin/commercial/plans/${planId}/archive`, { method: "POST" });

export const apiClonePlan = (planId: string) =>
  request<{ id: string }>(`/v1/admin/commercial/plans/${planId}/clone`, { method: "POST" });

export const apiGetPlanVersions = (planId: string) =>
  request<{ versions: PlanVersion[] }>(`/v1/admin/commercial/plans/${planId}/versions`);

export const apiListFeatures = () =>
  request<{ features: PlanFeature[] }>("/v1/admin/commercial/features");

export const apiCreateFeature = (body: Record<string, unknown>) =>
  request<{ key: string }>("/v1/admin/commercial/features", { method: "POST", body: JSON.stringify(body) });

export const apiUpdateFeature = (key: string, body: Record<string, unknown>) =>
  request<{ success: boolean }>(`/v1/admin/commercial/features/${key}`, { method: "PATCH", body: JSON.stringify(body) });

export const apiListEntitlements = (planId: string) =>
  request<{ entitlements: PlanEntitlement[] }>(`/v1/admin/commercial/entitlements/${planId}`);

export const apiUpdateEntitlement = (planId: string, featureKey: string, body: Record<string, unknown>) =>
  request<{ success: boolean }>(`/v1/admin/commercial/entitlements/${planId}/${featureKey}`, { method: "PATCH", body: JSON.stringify(body) });

export const apiGetCommercialMetrics = () =>
  request<CommercialMetrics>("/v1/admin/commercial/metrics");

// ── Platform Ops ──────────────────────────────────────────────────────────
export const apiGetDeliveryStats = () =>
  request<{ stats?: DeliveryStats[]; data?: DeliveryStats[] }>("/v1/admin/analytics/delivery").catch(() => ({ stats: [] }));

export const apiGetIntegrationsDiagnostics = () =>
  request<{ platforms?: IntegrationDiagnostic[]; data?: IntegrationDiagnostic[] }>("/v1/admin/integrations/diagnostics").catch(() => ({ platforms: [] }));

export const apiTriggerBackfill = (body: Record<string, unknown>) =>
  request<{ success: boolean }>("/v1/admin/integrations/backfill", { method: "POST", body: JSON.stringify(body) });

export const apiGetBackfillStatus = (brand_id?: string) => {
  const qs = brand_id ? `?brand_id=${brand_id}` : "";
  return request<{ runs: BackfillRun[] }>(`/v1/admin/integrations/backfill/status${qs}`).catch(() => ({ runs: [] }));
};

export const apiGetAttributionDiagnostics = () =>
  request<{ brands?: AttributionDiagnostic[]; data?: AttributionDiagnostic[] }>("/v1/admin/attribution/diagnostics").catch(() => ({ brands: [] }));

export const apiRunPlatformTest = (body: Record<string, unknown>) =>
  request<PlatformTestResult>("/v1/admin/platform-test", { method: "POST", body: JSON.stringify(body) });

export const apiListTestableConnections = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ connections?: unknown[]; data?: unknown[] }>(`/v1/admin/platform-test/connections?${qs}`).catch(() => ({ connections: [] }));
};

export const apiGetCertificationMatrix = (brand_id: string) =>
  request<CertificationMatrix>(`/v1/admin/certification/matrix?brand_id=${brand_id}`).catch(() => ({} as CertificationMatrix));

export const apiGetDeliveryHistory = (brand_id: string) =>
  request<{ history?: unknown[] }>(`/v1/admin/certification/delivery-history?brand_id=${brand_id}`).catch(() => ({ history: [] }));

export const apiGetRewards = () =>
  request<RewardsOverview>("/v1/admin/rewards").catch(() => ({} as RewardsOverview));

// ── Content ────────────────────────────────────────────────────────────────
export const apiListBlogPosts = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ posts?: BlogPost[]; data?: BlogPost[] }>(`/v1/admin/blog?${qs}`);
};

export const apiCreateBlogPost = (body: BlogPost) =>
  request<{ id: string }>("/v1/admin/blog", { method: "POST", body: JSON.stringify(body) });

export const apiUpdateBlogPost = (id: string, body: Partial<BlogPost>) =>
  request<{ success: boolean }>(`/v1/admin/blog/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const apiDeleteBlogPost = (id: string) =>
  request<{ success: boolean }>(`/v1/admin/blog/${id}`, { method: "DELETE" });

export const apiListApprovals = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ approvals: ContentApproval[]; status?: string }>(`/v1/admin/approvals?${qs}`);
};

export const apiUpdateApproval = (id: string, status: string) =>
  request<{ success: boolean }>(`/v1/admin/approvals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const apiListCampaigns = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ campaigns: Campaign[] }>(`/v1/admin/campaigns?${qs}`).catch(() => ({ campaigns: [] }));
};

export const apiListEmailCampaigns = () =>
  request<{ campaigns?: EmailCampaign[]; data?: EmailCampaign[] }>("/v1/admin/emails/campaigns").catch(() => ({ campaigns: [] }));

// ── Config ─────────────────────────────────────────────────────────────────
export const apiListKillSwitches = () =>
  request<{ controls?: KillSwitch[]; switches?: KillSwitch[] }>("/v1/admin/controls");

export const apiUpdateKillSwitch = (key: string, enabled: boolean, reason?: string) =>
  request<{ success: boolean }>(`/v1/admin/controls/${key}`, { method: "PATCH", body: JSON.stringify({ enabled, reason }) });

export const apiListAuditLog = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data?: AuditLogEntry[]; entries?: AuditLogEntry[] }>(`/v1/admin/audit-log?${qs}`);
};

export const apiListMemoryEvents = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<{ data: MemoryEvent[] }>(`/v1/admin/memory/events?${qs}`).catch(() => ({ data: [] }));
};

export const apiListMemoryFeatures = (brand_id?: string) => {
  const qs = brand_id ? `?brand_id=${brand_id}` : "";
  return request<{ data: MemoryFeature[] }>(`/v1/admin/memory/features${qs}`).catch(() => ({ data: [] }));
};

export const apiListBrandMemory = (brand_id?: string) => {
  const qs = brand_id ? `?brand_id=${brand_id}` : "";
  return request<{ data: import("@/types").BrandMemory[] }>(`/v1/admin/memory/brands${qs}`).catch(() => ({ data: [] }));
};
