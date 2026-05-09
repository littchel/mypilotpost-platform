/**
 * myPilotPost — Permissions Map
 * AUTHORITATIVE • GRANULAR • RBAC
 */

export const PERMISSIONS = {
  super_admin: ["*"],
  operations: [
    "users:read",
    "audits:read",
    "analytics:read",
    "billing:read",
    "blog:write",
    "blog:read"
  ],
  support: [
    "users:read",
    "audits:read",
    "usage:read",
    "support:read",
    "support:write",
    "reports:read",
    "connections:read"
  ],
  admin: ["*"], // Legacy compatibility
  user: [] // Standard users have no admin/system permissions
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission) {
  const rolePermissions = PERMISSIONS[role] || [];
  
  if (rolePermissions.includes("*")) return true;
  if (rolePermissions.includes(permission)) return true;
  
  return false;
}
