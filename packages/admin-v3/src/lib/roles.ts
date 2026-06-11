import type { AdminRole } from "@/types";

export type WorkspaceId =
  | "today"
  | "customers"
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
  { id: "today",      label: "Today",         icon: "LayoutDashboard", href: "/",             description: "Company status" },
  { id: "customers",  label: "Customers",     icon: "Users",           href: "/customers/",   description: "Accounts, support, lifecycle" },
  { id: "billing",    label: "Billing",       icon: "CreditCard",      href: "/billing/",     description: "Revenue, subscriptions, refunds" },
  { id: "commercial", label: "Commercial",    icon: "Package",         href: "/commercial/",  description: "Plans, features, entitlements" },
  { id: "content",    label: "Content",       icon: "FileText",        href: "/content/",     description: "Blog, approvals" },
  { id: "operations", label: "Platform Ops",  icon: "Activity",        href: "/operations/",  description: "Health, diagnostics, tests" },
  { id: "config",     label: "Config",        icon: "Settings",        href: "/config/",      description: "Audit, events, roles, kill switches" },
];

const ROLE_WORKSPACES: Partial<Record<AdminRole, WorkspaceId[]>> = {
  super_admin:  ["today", "customers", "billing", "commercial", "content", "operations", "config"],
  admin:        ["today", "customers", "billing", "commercial", "content", "operations", "config"],
  support:      ["today", "customers"],
  commercial:   ["today", "billing", "commercial"],
  content:      ["today", "content"],
  developer:    ["today", "operations", "config"],
  analyst:      ["today", "customers", "billing", "operations"],
  viewer:       ["today"],
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
  return role !== "viewer";
}

export function canManageCommercial(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "commercial";
}

export function canManageBilling(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "commercial";
}

export function canViewConfig(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin";
}
