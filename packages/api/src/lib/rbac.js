// packages/api/src/lib/rbac.js

/**
 * RBAC matrix for customer-facing APIs
 * Canonical source of truth for role × engine × action
 *
 * DO NOT infer permissions.
 * DO NOT override at handler level.
 */

const RBAC_MATRIX = {
  content: {
    owner: ["read", "create", "update", "delete", "publish"],
    editor: ["read", "create", "update", "publish"],
    viewer: ["read"],
  },

  seo: {
    owner: ["read", "configure"],
    editor: ["read"],
    viewer: ["read"],
  },

  campaign: {
    owner: ["read", "create", "update", "delete"],
    editor: ["read", "create", "update"],
    viewer: ["read"],
  },

  distribution: {
    owner: ["read", "publish", "configure"],
    editor: ["read", "publish"],
    viewer: ["read"],
  },

  analytics: {
    owner: ["read"],
    editor: ["read"],
    viewer: ["read"],
  },

  intelligence: {
    owner: ["read", "configure"],
    editor: ["read"],
    viewer: ["read"],
  },

  ml: {
    owner: ["read"],
    editor: ["read"],
    viewer: [],
  },

  billing: {
    owner: ["billing_read"],
    editor: [],
    viewer: [],
  },

  account: {
    owner: ["read", "invite", "update", "delete"],
    editor: [],
    viewer: [],
  },
};

/**
 * Assert RBAC permission.
 *
 * @param {Object} customer - Injected by auth/customer.js
 * @param {string} customer.role
 * @param {string} engine
 * @param {string} action
 *
 * @throws {Response} 403 Forbidden
 */
export function requirePermission(customer, engine, action) {
  if (!customer || !customer.role) {
    throw forbidden("Missing customer context");
  }

  const engineRules = RBAC_MATRIX[engine];
  if (!engineRules) {
    throw forbidden(`Unknown engine: ${engine}`);
  }

  const allowedActions = engineRules[customer.role];
  if (!allowedActions || !allowedActions.includes(action)) {
    throw forbidden(
      `Permission denied: ${customer.role} cannot ${action} on ${engine}`
    );
  }
}

/**
 * Middleware-style guard for routes
 *
 * Usage:
 *   requireRBAC({ engine: "content", action: "create" })
 */
export function requireRBAC({ engine, action }) {
  return async (req) => {
    const customer = req.customer;
    requirePermission(customer, engine, action);
  };
}

/**
 * Standardized forbidden response
 */
function forbidden(message) {
  return new Response(
    JSON.stringify({
      error: "forbidden",
      message,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}
