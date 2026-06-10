// ── Auth ─────────────────────────────────────────────────────────────────────

export type AdminRole =
  | "super_admin"
  | "admin"
  | "ops"
  | "operations"
  | "support"
  | "finance"
  | "commercial"
  | "content";

export interface AdminSession {
  user_id: string;
  email: string;
  role: AdminRole;
  is_admin: boolean;
  iat: number;
  exp: number;
}

// ── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  email: string;
  name?: string;
  plan_id: string;
  subscription_status: string;
  trial_ends_at?: string;
  created_at: string;
  verified_at?: string;
  is_active: number;
  last_login_at?: string;
  brands_count?: number;
  posts_count?: number;
}

export interface CustomerDetail extends Customer {
  brands?: Brand[];
  usage?: UsageStats;
  subscription?: Subscription;
  integrations?: Integration[];
  support_history?: SupportThread[];
  health_score?: HealthScore;
}

export interface Brand {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  logo_url?: string;
  industry?: string;
}

export interface UsageStats {
  posts_used: number;
  ai_generations_used: number;
  social_accounts_used: number;
  posts_per_month_limit: number;
  ai_generations_limit: number;
  social_accounts_limit: number;
  period_start?: string;
  period_end?: string;
}

export interface Subscription {
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  price_monthly?: number;
}

export interface Integration {
  platform: string;
  connected: boolean;
  account_name?: string;
  expires_at?: string;
  last_used_at?: string;
}

export interface HealthScore {
  score: number;
  tier: "healthy" | "warning" | "at_risk" | "critical";
  signals: Record<string, number>;
  computed_at: string;
}

// ── Support ──────────────────────────────────────────────────────────────────

export interface SupportThread {
  id: string;
  user_id: string;
  email?: string;
  subject?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  last_message_at?: string;
  created_at: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  thread_id?: string;
  sender_id: string;
  sender_email?: string;
  message: string;
  created_at: string;
  is_admin?: boolean;
}

export interface SupportRequest {
  id: string;
  user_id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

// ── Billing ──────────────────────────────────────────────────────────────────

export interface BillingOverview {
  mrr: number;
  arr: number;
  active_subscribers: number;
  trial_users: number;
  churned_this_month: number;
  conversion_rate: number;
  past_due: number;
}

export interface MrrHistoryPoint {
  date: string;
  mrr: number;
  subscribers: number;
}

export interface Promotion {
  id?: string;
  code: string;
  discount_type: "percent" | "fixed" | "trial_days";
  discount_value: number;
  max_uses?: number;
  uses_count?: number;
  expires_at?: string;
  is_active: number;
}

// ── Commercial ───────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_cents: number;
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
  entitlements?: Record<string, PlanEntitlement>;
}

export interface PlanFeature {
  key: string;
  name: string;
  description?: string;
  category: string;
  visible: number;
}

export interface PlanEntitlement {
  key: string;
  name: string;
  category?: string;
  enabled: number;
  limit_value?: number | null;
  limit_type: "boolean" | "monthly" | "unlimited" | "count";
}

export interface CommercialMetrics {
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    ltv: number;
    currency: string;
  };
  subscribers: {
    active: number;
    trial: number;
    trial_expired: number;
    past_due: number;
    cancelled: number;
    total: number;
  };
  growth: {
    new_this_month: number;
    churned_this_month: number;
    conversion_rate: number;
  };
  plans: PlanBreakdown[];
}

export interface PlanBreakdown {
  id: string;
  name: string;
  users?: number;
  active_subscribers?: number;
  trial_subscribers?: number;
  plan_mrr?: number;
  mrr?: number;
  conversion_rate?: number;
  churn_rate?: number;
}

// ── Operations ───────────────────────────────────────────────────────────────

export interface OperationsHealth {
  jobs_queued?: number;
  jobs_failed_24h?: number;
  jobs_success_24h?: number;
  delivery_rate?: number;
  platforms?: Record<string, PlatformHealth>;
  alerts?: OperationAlert[];
}

export interface PlatformHealth {
  platform: string;
  connected?: number;
  failed?: number;
  published_24h?: number;
  retries?: number;
  rate_limited?: boolean;
  status: "ok" | "warn" | "error";
}

export interface OperationAlert {
  id: string;
  type: string;
  message: string;
  severity: "info" | "warn" | "error";
  created_at: string;
}

export interface DeliveryStats {
  date: string;
  success: number;
  failed: number;
  pending: number;
  rate: number;
}

// ── Content ──────────────────────────────────────────────────────────────────

export interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: "draft" | "published" | "archived";
  featured_image?: string;
  seo_title?: string;
  seo_description?: string;
  author_id?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject?: string;
  status: string;
  recipient_count?: number;
  sent_at?: string;
  created_at: string;
}

export interface ContentApproval {
  id: string;
  brand_id: string;
  post_id?: string;
  title?: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  requester_id?: string;
  reviewer_id?: string;
  created_at: string;
  updated_at?: string;
  share_token?: string;
}

// ── Platform Config ───────────────────────────────────────────────────────────

export interface KillSwitch {
  key: string;
  label?: string;
  description?: string;
  enabled: number;
  updated_at?: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id?: string;
  admin_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  created_at: string;
}

// ── SAAS OS ──────────────────────────────────────────────────────────────────

export interface TokenOpsDay {
  date: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
  cost_usd: number;
  brand_id?: string;
  feature?: string;
}

export interface TokenOpsSummary {
  today: { tokens: number; cost_usd: number };
  week:  { tokens: number; cost_usd: number };
  month: { tokens: number; cost_usd: number };
  by_feature: Record<string, { tokens: number; cost_usd: number }>;
  top_brands: { brand_id: string; brand_name?: string; tokens: number; cost_usd: number }[];
  forecast_month_usd: number;
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

export interface SocialPlatformHealth {
  platform: string;
  display_name: string;
  connected: number;
  failed: number;
  oauth_errors: number;
  published_today: number;
  retries_today: number;
  rate_limited: boolean;
  status: "ok" | "warn" | "error";
}

export interface ExecutionItem {
  type: "customer_issue" | "revenue_event" | "platform_alert" | "approval";
  severity: "high" | "medium" | "low";
  title: string;
  description?: string;
  href: string;
  created_at: string;
  action_label?: string;
}

// ── Overview ──────────────────────────────────────────────────────────────────

export interface AdminOverview {
  users: number;
  brands: number;
  active_users?: number;
  trial_users?: number;
  new_7d?: number;
  published_24h?: number;
  failed_24h?: number;
  integrations?: number;
  alerts?: number;
  delivery_rate?: number;
  conversion_rate?: number;
  mrr?: number;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  per_page?: number;
  has_more?: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
