/**
 * myPilotPost — Role Permission Matrix
 * No custom RBAC. Predefined roles only.
 */

const PERMS = {
  owner:         { invite: true,  remove_member: true,  approve: true,  schedule: true,  publish: true,  share_report: true,  view_activity: true,  manage_clients: true,  billing: true },
  admin:         { invite: true,  remove_member: true,  approve: true,  schedule: true,  publish: true,  share_report: true,  view_activity: true,  manage_clients: true,  billing: false },
  brand_manager: { invite: false, remove_member: false, approve: true,  schedule: true,  publish: false, share_report: true,  view_activity: true,  manage_clients: true,  billing: false },
  creator:       { invite: false, remove_member: false, approve: false, schedule: true,  publish: false, share_report: false, view_activity: false, manage_clients: false, billing: false },
  approver:      { invite: false, remove_member: false, approve: true,  schedule: false, publish: false, share_report: false, view_activity: false, manage_clients: false, billing: false },
  viewer:        { invite: false, remove_member: false, approve: false, schedule: false, publish: false, share_report: false, view_activity: false, manage_clients: false, billing: false },
  // Legacy DB roles
  team:          { invite: false, remove_member: false, approve: false, schedule: true,  publish: false, share_report: false, view_activity: false, manage_clients: false, billing: false },
  client:        { invite: false, remove_member: false, approve: true,  schedule: false, publish: false, share_report: false, view_activity: false, manage_clients: false, billing: false },
};

export function can(role, permission) {
  return Boolean(PERMS[role]?.[permission]);
}

export function requirePerm(role, permission) {
  if (!can(role, permission)) throw Object.assign(new Error('Insufficient permissions'), { status: 403 });
}

export const ROLES = Object.keys(PERMS);
export const ASSIGNABLE_ROLES = ['admin', 'brand_manager', 'creator', 'approver', 'viewer'];
