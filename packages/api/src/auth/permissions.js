/**
 * myPilotPost — Admin Permissions Map
 * AUTHORITATIVE • GRANULAR • RBAC
 */

export const PERMISSIONS = {
  super_admin: ["*"],

  // legacy alias — treated as super_admin for backward compat
  admin: ["*"],

  // ops: customers, growth, content, integrations, notifications, reports, health — NO permission changes
  ops: [
    "users:read", "users:write",
    "audits:read",
    "analytics:read",
    "billing:read",
    "blog:write", "blog:read",
    "support:read", "support:write",
    "pricing:read",
    "messaging:write",
    "operations:read"
  ],

  // operations: DB-stored alias for ops — same permissions
  operations: [
    "users:read", "users:write",
    "audits:read",
    "analytics:read",
    "billing:read",
    "blog:write", "blog:read",
    "support:read", "support:write",
    "pricing:read",
    "messaging:write",
    "operations:read"
  ],

  // support: tickets, customers, notifications, activity, reports — NO billing, NO system, NO roles
  support: [
    "users:read",
    "audits:read",
    "usage:read",
    "support:read", "support:write",
    "reports:read",
    "connections:read",
    "messaging:write"
  ],

  user: []
};

export function hasPermission(role, permission) {
  const rolePermissions = PERMISSIONS[role] || [];
  if (rolePermissions.includes("*")) return true;
  return rolePermissions.includes(permission);
}
