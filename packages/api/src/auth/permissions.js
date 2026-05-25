/**
 * myPilotPost — Admin Permissions Map
 * AUTHORITATIVE • GRANULAR • RBAC
 */

export const PERMISSIONS = {
  super_admin: ["*"],

  admin: [
    "users:read", "users:write",
    "audits:read",
    "analytics:read",
    "billing:read",
    "blog:write", "blog:read",
    "support:read", "support:write",
    "pricing:write", "pricing:read",
    "promotions:write", "promotions:read",
    "messaging:write",
    "operations:read"
  ],

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

  support: [
    "users:read",
    "audits:read",
    "usage:read",
    "support:read", "support:write",
    "reports:read",
    "connections:read",
    "blog:read",
    "messaging:write"
  ],

  user: []
};

export function hasPermission(role, permission) {
  const rolePermissions = PERMISSIONS[role] || [];
  if (rolePermissions.includes("*")) return true;
  return rolePermissions.includes(permission);
}
