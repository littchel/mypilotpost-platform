// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiError { error: string; code?: string; detail?: string }

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export type AdminRole =
  | "super_admin" | "admin" | "ops" | "operations" | "support" | "commercial"
  | "content" | "developer" | "analyst" | "viewer";

export interface AdminSession {
  user_id: string;
  email: string;
  role: AdminRole;
  is_admin: boolean;
  iat: number;
  exp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview / Today
// ─────────────────────────────────────────────────────────────────────────────

export interface OverviewStats {
  total_users?: number;
  active_subscriptions?: number;
  trial_subscriptions?: number;
  mrr?: number;
  currency?: string;
  posts_today?: number;
  ai_calls_today?: number;
  open_support?: number;
  failed_jobs?: number;
  [key: string]: unknown;
}

export interface SystemEvent {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  message: string;
  metadata?: string;
  created_at: string;
}

export interface SystemStatus {
  db_ok: boolean;
  queue_ok: boolean;
  ai_ok: boolean;
  worker_ok: boolean;
  status: "healthy" | "degraded" | "down";
  checks?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface OperationsHealth {
  queue_depth?: number;
  jobs_24h?: number;
  success_rate?: number;
  failed_24h?: number;
  avg_latency_ms?: number;
  platforms?: PlatformHealthItem[];
  [key: string]: unknown;
}

export interface PlatformHealthItem {
  platform: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  success_rate?: number;
  last_error?: string;
  last_checked?: string;
}

export interface ExecutionItem {
  id: string;
  type: string;
  status: "queued" | "running" | "completed" | "failed";
  brand_id?: string;
  brand_name?: string;
  created_at: string;
  scheduled_at?: string;
  error?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  email: string;
  role: string;
  plan_id?: string;
  plan_name?: string;
  price_monthly?: number;
  subscription_status?: string;
  is_active: number;
  created_at: string;
  brand_count?: number;
  verified_at?: string | null;
  trial_extended_until?: string | null;
}

export interface CustomerBrand {
  id: string;
  name: string;
  industry?: string;
  logo_url?: string;
}

export interface CustomerDetail extends Customer {
  brands: CustomerBrand[];
  ai_generations: number;
  support_messages: number;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Support
// ─────────────────────────────────────────────────────────────────────────────

export interface SupportThread {
  id: string;
  subject?: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "urgent";
  user_id?: string;
  user_email?: string;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
  message_count?: number;
  last_message?: string;
  category?: string;
}

export interface SupportRequest {
  id: string;
  user_id: string;
  user_email?: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "normal" | "high" | "urgent";
  assigned_to?: string;
  resolution?: string;
  created_at: string;
  updated_at?: string;
}

export interface SupportMessage {
  id: string;
  thread_id?: string;
  sender_id: string;
  sender_email?: string;
  content: string;
  is_admin?: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────────────────────────

export interface BillingOverview {
  total_customers: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  mrr: number;
  currency: string;
  distribution?: { name: string; count: number }[];
  conversion_rate?: string;
}

export interface MrrHistoryItem {
  month: string;
  mrr: number;
  customers: number;
  currency: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  email?: string;
  plan_id?: string;
  plan_name?: string;
  status: string;
  trial_extended_until?: string;
  created_at: string;
  mrr?: number;
}

export interface Promotion {
  id: string;
  code: string;
  type: "percent" | "fixed" | "trial_days";
  value: number;
  max_uses?: number;
  used_count?: number;
  expires_at?: string;
  is_active: number;
  created_at: string;
}

export interface CommsDeliveryRow {
  channel: string;
  status: string;
  count: number;
}

export interface ComplianceDeletion {
  id: string;
  user_id: string;
  email?: string;
  requested_at: string;
  scheduled_for?: string;
  completed_at?: string;
  status: string;
}

export interface ComplianceExport {
  id: string;
  user_id: string;
  email?: string;
  requested_at: string;
  completed_at?: string;
  status: string;
  file_url?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commercial
// ─────────────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_cents: number;
  price_yearly?: number;
  billing_interval?: string;
  currency?: string;
  trial_days: number;
  badge?: string;
  sort_order?: number;
  visible: number;
  status: "active" | "archived" | "draft";
  is_active: number;
  features_json?: string;
  social_accounts_limit?: number;
  posts_per_month_limit?: number;
  ai_generations_limit?: number;
  brand_limit?: number;
  user_limit?: number;
  entitlements?: Record<string, PlanEntitlement>;
  created_at?: string;
  updated_at?: string;
}

export interface PlanFeature {
  key: string;
  name: string;
  description?: string;
  category: string;
  visible: number;
  icon?: string;
  created_at?: string;
}

export interface PlanEntitlement {
  key: string;
  feature_key?: string;
  plan_id?: string;
  enabled: number;
  limit_value?: number | null;
  limit_type?: string;
  feature_name?: string;
  feature_category?: string;
}

export interface PlanVersion {
  id: string;
  plan_id: string;
  snapshot_json: string;
  changed_by?: string;
  note?: string;
  created_at: string;
}

export interface CommercialMetrics {
  total_plans?: number;
  active_plans?: number;
  total_features?: number;
  plans?: { id: string; name: string; user_count: number; mrr: number }[];
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Ops
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryStats {
  date?: string;
  platform?: string;
  channel?: string;
  status?: string;
  scheduled?: number;
  delivered?: number;
  failed?: number;
  count?: number;
}

export interface IntegrationDiagnostic {
  platform: string;
  brand_id?: string;
  brand_name?: string;
  status: "connected" | "expired" | "error" | "missing";
  scopes?: string[];
  last_used?: string;
  error?: string;
}

export interface AttributionDiagnostic {
  brand_id: string;
  brand_name?: string;
  post_count?: number;
  attribution_count?: number;
  coverage?: number;
  issues?: string[];
}

export interface BackfillRun {
  id?: string;
  brand_id?: string;
  platform?: string;
  status: string;
  created_at: string;
  completed_at?: string;
  records_processed?: number;
  error?: string;
}

export interface PlatformTestResult {
  success: boolean;
  platform?: string;
  brand_id?: string;
  tests?: { name: string; passed: boolean; error?: string }[];
  duration_ms?: number;
}

export interface CertificationMatrix {
  [engine: string]: {
    status: "pass" | "fail" | "skip";
    checks: number;
    passed: number;
    issues?: string[];
  };
}

export interface SocialPlatformHealth {
  platform: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  connected_accounts?: number;
  success_rate?: number;
  error?: string;
}

export interface RewardsOverview {
  total_points_issued?: number;
  active_users?: number;
  top_earners?: { user_id: string; email?: string; points: number }[];
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id?: string;
  slug?: string;
  title: string;
  content?: string;
  excerpt?: string;
  cover_image?: string;
  featured_image?: string;
  category_id?: string;
  category_name?: string;
  category?: string;
  author?: string;
  status: "draft" | "published" | "archived";
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentApproval {
  id: string;
  brand_id: string;
  brand_name?: string;
  content_id: string;
  content_title?: string;
  content_type?: string;
  type?: string;
  status: "pending" | "review" | "approved" | "rejected" | "changes_requested";
  expires_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Campaign {
  id: string;
  brand_id: string;
  brand_name?: string;
  name: string;
  objective?: string;
  channel?: string;
  status: string;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject?: string;
  status: string;
  sent_count?: number;
  open_rate?: number;
  click_rate?: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config / Ops
// ─────────────────────────────────────────────────────────────────────────────

export interface KillSwitch {
  key: string;
  enabled: number;
  reason?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface AuditLogEntry {
  id?: string;
  admin_id?: string;
  admin_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  meta?: string;
  ip?: string | null;
  created_at: string;
}

export interface TokenOpsSummary {
  today: { tokens: number; cost_usd: number };
  week: { tokens: number; cost_usd: number };
  month: { tokens: number; cost_usd: number };
  by_feature: Record<string, { tokens: number; cost_usd: number }>;
  top_brands: { brand_id: string; brand_name?: string; tokens: number; cost_usd: number }[];
  forecast_month_usd: number;
}

export interface MemoryEvent {
  id: string;
  brand_id?: string;
  user_id?: string;
  tool?: string;
  event: string;
  value?: string;
  metadata?: string;
  created_at: string;
}

export interface MemoryFeature {
  brand_id: string;
  feature: string;
  value?: string;
  window?: string;
  computed_at: string;
}

export interface BrandMemory {
  brand_id: string;
  namespace: string;
  key: string;
  value?: string;
  confidence?: number;
  source?: string;
  updated_at: string;
}

export interface FeatureAdoptionRow {
  feature_key: string;
  feature_name: string;
  viewed: number;
  used: number;
  completed: number;
  retained: number;
  converted: number;
  activation_rate: number;
  conversion_rate: number;
  retention_rate: number;
}
