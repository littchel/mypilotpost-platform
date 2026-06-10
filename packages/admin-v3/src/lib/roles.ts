import type { AdminRole } from "@/types";

export type WorkspaceId =
  | "today"
  | "customers"
  | "support"
  | "billing"
  | "commercial"
  | "operations"
  | "content"
  | "config";

export interface WorkspaceConfig {
  id: WorkspaceId;
  label: string;
  icon: string;
  href: string;
  description: string;
}

const ALL_WORKSPACES: WorkspaceConfig[] = [
  { id: "today",      label: "Today",           icon: "LayoutDashboard", href: "/",             description: "Execution dashboard" },
  { id: "customers",  label: "Customer 360",    icon: "Users",           href: "/customers/",   description: "Accounts, health, lifecycle" },
  { id: "support",    label: "Support Center",  icon: "MessageSquare",   href: "/support/",     description: "Tickets, inbox, history" },
  { id: "billing",    label: "Billing Ops",     icon: "CreditCard",      href: "/billing/",     description: "Revenue, subscriptions, refunds" },
  { id: "commercial", label: "Commercial",      icon: "Package",         href: "/commercial/",  description: "Plans, features, entitlements" },
  { id: "operations", label: "Platform Ops",    icon: "Activity",        href: "/operations/",  description: "Jobs, delivery, integrations" },
  { id: "content",    label: "Content Ops",     icon: "FileText",        href: "/content/",     description: "Blog, emails, approvals" },
  { id: "config",     label: "Platform Config", icon: "Settings",        href: "/config/",      description: "Kill switches, audit log, tokens" },
];

const ROLE_WORKSPACES: Record<AdminRole, WorkspaceId[]> = {
  super_admin:  ["today", "customers", "support", "billing", "commercial", "operations", "content", "config"],
  admin:        ["today", "customers", "support", "billing", "commercial", "operations", "content", "config"],
  ops:          ["today", "customers", "support", "operations"],
  operations:   ["today", "customers", "support", "operations"],
  support:      ["today", "customers", "support"],
  finance:      ["today", "billing", "commercial"],
  commercial:   ["today", "commercial"],
  content:      ["today", "content"],
};

export function getWorkspacesForRole(role: AdminRole): WorkspaceConfig[] {
  const allowed = ROLE_WORKSPACES[role] ?? [];
  return ALL_WORKSPACES.filter((w) => allowed.includes(w.id));
}

export function canAccessWorkspace(role: AdminRole, workspaceId: WorkspaceId): boolean {
  const allowed = ROLE_WORKSPACES[role] ?? [];
  return allowed.includes(workspaceId);
}

export function isAdminRole(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canWrite(role: AdminRole): boolean {
  return role !== "support";
}

export function canManageCommercial(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "commercial" || role === "finance";
}

export function canManageBilling(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "finance";
}

export function canViewConfig(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin";
}
