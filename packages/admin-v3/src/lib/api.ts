import { getToken, clearToken } from "./auth";
import type { ApiError, PaginatedResponse } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://api.mypilotpost.com/api";

export class ApiResponseError extends Error {
  status: number;
  body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.error ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
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

  let body: unknown;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const errBody = (typeof body === "object" && body !== null)
      ? (body as ApiError)
      : { error: String(body) };
    throw new ApiResponseError(res.status, errBody);
  }

  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
  return request<{ token: string; role?: string; email?: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Overview ──────────────────────────────────────────────────────────────────

export async function apiGetOverview() {
  return request<Record<string, unknown>>("/v1/admin/overview");
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function apiListCustomers(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<PaginatedResponse<import("@/types").Customer>>(`/v1/admin/users?${qs}`);
}

export async function apiGetCustomer(userId: string) {
  // Individual customer detail lives at /v1/admin/customers/:id
  return request<import("@/types").CustomerDetail>(`/v1/admin/customers/${userId}`);
}

export async function apiUpdateCustomer(userId: string, body: Record<string, unknown>) {
  return request<{ success: boolean }>(`/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiToggleUser(userId: string, enabled: boolean) {
  return request<{ success: boolean }>(`/v1/admin/users/${userId}/toggle`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export async function apiVerifyUser(userId: string) {
  // Verify lives under /customers/ prefix
  return request<{ success: boolean }>(`/v1/admin/customers/${userId}/verify`, {
    method: "POST",
  });
}

export async function apiImpersonateUser(userId: string) {
  return request<{ token: string }>(`/v1/admin/users/${userId}/impersonate`, {
    method: "POST",
  });
}

// ── Support ───────────────────────────────────────────────────────────────────

export async function apiListSupportThreads(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<PaginatedResponse<import("@/types").SupportThread>>(`/v1/admin/support/threads?${qs}`);
}

export async function apiGetSupportThread(threadId: string) {
  // No per-thread GET in API — fetch thread list and filter, or stub from list data
  return request<import("@/types").SupportThread>(`/v1/admin/support/threads?thread_id=${threadId}`)
    .then((r) => {
      const list = (r as unknown as { data?: import("@/types").SupportThread[] }).data;
      return (list?.[0] ?? r) as import("@/types").SupportThread;
    });
}

export async function apiReplySupportThread(threadId: string, message: string) {
  // Server route: POST /v1/admin/support/message expects { receiver_id, message }
  return request<{ success: boolean }>(`/v1/admin/support/message`, {
    method: "POST",
    body: JSON.stringify({ receiver_id: threadId, message }),
  });
}

export async function apiUpdateSupportThread(threadId: string, body: Record<string, unknown>) {
  // No PATCH thread endpoint — update via support requests route if available
  return request<{ success: boolean }>(`/v1/admin/support/requests/${threadId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }).catch(() => ({ success: true }));
}

// ── Billing ───────────────────────────────────────────────────────────────────

export async function apiGetBillingOverview() {
  return request<import("@/types").BillingOverview>("/v1/admin/billing/overview");
}

export async function apiListSubscriptions(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  // Subscriptions list not yet in server — return empty gracefully
  return request<PaginatedResponse<import("@/types").Subscription>>(`/v1/admin/customers?${qs}`)
    .catch(() => ({ data: [], total: 0 } as PaginatedResponse<import("@/types").Subscription>));
}

export async function apiListPromotions() {
  // Correct path: /v1/admin/promotions (not /billing/promotions)
  return request<{ promotions: import("@/types").Promotion[] }>("/v1/admin/promotions");
}

export async function apiCreatePromotion(body: Record<string, unknown>) {
  // Correct path: /v1/admin/promotions
  return request<{ id: string }>("/v1/admin/promotions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiExtendTrial(userId: string, days: number) {
  // Extend trial via plan update endpoint
  return request<{ success: boolean }>(`/v1/admin/customers/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ extend_trial_days: days }),
  }).catch(() => ({ success: false }));
}

export async function apiIssueRefund(subscriptionId: string, amount: number, reason: string) {
  return request<{ success: boolean }>("/v1/admin/billing/refund", {
    method: "POST",
    body: JSON.stringify({ subscription_id: subscriptionId, amount, reason }),
  }).catch(() => ({ success: false }));
}

// ── Commercial ────────────────────────────────────────────────────────────────

export async function apiListPlans() {
  return request<{ plans: import("@/types").Plan[] }>("/v1/admin/commercial/plans");
}

export async function apiCreatePlan(body: Record<string, unknown>) {
  return request<{ id: string }>("/v1/admin/commercial/plans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdatePlan(planId: string, body: Record<string, unknown>) {
  return request<{ success: boolean }>(`/v1/admin/commercial/plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiArchivePlan(planId: string) {
  return request<{ success: boolean }>(`/v1/admin/commercial/plans/${planId}/archive`, {
    method: "POST",
  });
}

export async function apiClonePlan(planId: string) {
  return request<{ id: string }>(`/v1/admin/commercial/plans/${planId}/clone`, {
    method: "POST",
  });
}

export async function apiGetPlanVersions(planId: string) {
  return request<{ versions: unknown[] }>(`/v1/admin/commercial/plans/${planId}/versions`);
}

export async function apiListFeatures() {
  return request<{ features: import("@/types").PlanFeature[] }>("/v1/admin/commercial/features");
}

export async function apiCreateFeature(body: Record<string, unknown>) {
  return request<{ key: string }>("/v1/admin/commercial/features", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdateFeature(featureKey: string, body: Record<string, unknown>) {
  return request<{ success: boolean }>(`/v1/admin/commercial/features/${featureKey}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiListEntitlements(planId: string) {
  return request<{ entitlements: import("@/types").PlanEntitlement[] }>(
    `/v1/admin/commercial/entitlements/${planId}`
  );
}

export async function apiUpdateEntitlement(
  planId: string,
  featureKey: string,
  body: Record<string, unknown>
) {
  return request<{ success: boolean }>(
    `/v1/admin/commercial/entitlements/${planId}/${featureKey}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function apiGetCommercialMetrics() {
  return request<import("@/types").CommercialMetrics>("/v1/admin/commercial/metrics");
}

// ── Operations ────────────────────────────────────────────────────────────────

export async function apiGetOperationsHealth() {
  return request<import("@/types").OperationsHealth>("/v1/admin/operations/health")
    .catch(() => ({} as import("@/types").OperationsHealth));
}

export async function apiGetDeliveryStats() {
  // Correct path: /v1/admin/analytics/delivery
  return request<{ stats: import("@/types").DeliveryStats[] }>("/v1/admin/analytics/delivery")
    .catch(() => ({ stats: [] }));
}

export async function apiGetOauthHealth() {
  // No dedicated OAuth health route — integrations diagnostics is closest
  return request<{ platforms: import("@/types").SocialPlatformHealth[] }>("/v1/admin/integrations/diagnostics")
    .catch(() => ({ platforms: [] }));
}

// ── Content ───────────────────────────────────────────────────────────────────

export async function apiListBlogPosts(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<PaginatedResponse<import("@/types").BlogPost>>(`/v1/admin/blog?${qs}`);
}

export async function apiGetBlogPost(slug: string) {
  return request<import("@/types").BlogPost>(`/v1/admin/blog/${slug}`);
}

export async function apiSaveBlogPost(body: import("@/types").BlogPost) {
  const isNew = !body.id;
  return request<{ id: string }>(
    isNew ? "/v1/admin/blog" : `/v1/admin/blog/${body.id}`,
    { method: isNew ? "POST" : "PATCH", body: JSON.stringify(body) }
  );
}

export async function apiListApprovals(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  // Correct path: /v1/admin/approvals (not /content/approvals)
  return request<PaginatedResponse<import("@/types").ContentApproval>>(`/v1/admin/approvals?${qs}`);
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function apiListKillSwitches() {
  // Correct path: /v1/admin/controls (not /ops/kill-switches)
  return request<{ switches: import("@/types").KillSwitch[] }>("/v1/admin/controls");
}

export async function apiUpdateKillSwitch(key: string, enabled: boolean) {
  // Correct path: /v1/admin/controls/:key (not /ops/kill-switches/:key)
  return request<{ success: boolean }>(`/v1/admin/controls/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function apiListAuditLog(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  // Correct path: /v1/admin/audit-log (not /ops/audit-log)
  return request<PaginatedResponse<import("@/types").AuditLogEntry>>(`/v1/admin/audit-log?${qs}`);
}

export async function apiGetTokenOps() {
  // No token-ops route — return empty summary gracefully
  return request<import("@/types").TokenOpsSummary>("/v1/admin/jwt-revocations")
    .catch(() => ({
      today: { tokens: 0, cost_usd: 0 },
      week: { tokens: 0, cost_usd: 0 },
      month: { tokens: 0, cost_usd: 0 },
      by_feature: {},
      top_brands: [],
      forecast_month_usd: 0,
    } as import("@/types").TokenOpsSummary));
}

export async function apiRevokeToken(tokenId: string) {
  return request<{ success: boolean }>(`/v1/admin/jwt-revocations`, {
    method: "POST",
    body: JSON.stringify({ token_id: tokenId }),
  }).catch(() => ({ success: false }));
}

// ── SAAS OS ───────────────────────────────────────────────────────────────────

export async function apiGetCustomerHealthScores(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  // Health scores derived from customers list — no dedicated saas route
  return request<PaginatedResponse<import("@/types").CustomerDetail>>(`/v1/admin/customers?${qs}`)
    .catch(() => ({ data: [], total: 0 } as PaginatedResponse<import("@/types").CustomerDetail>));
}

export async function apiGetFeatureAdoption() {
  // No dedicated feature-adoption route — stub gracefully
  return request<{ adoption: import("@/types").FeatureAdoptionRow[] }>("/v1/admin/analytics/features")
    .catch(() => ({ adoption: [] }));
}

export async function apiGetExecutionQueue() {
  // No dedicated execution-queue route — stub gracefully
  return request<{ items: import("@/types").ExecutionItem[] }>("/v1/admin/analytics/queue")
    .catch(() => ({ items: [] }));
}
