// packages/api/src/core/realtime/sseHub.js
/**
 * myPilotPost — SSE Hub
 * Handles real-time event distribution for Support Chat
 */

class SSEHub {
  constructor() {
    this.clients = new Map(); // userId -> Set of controller objects
  }

  /**
   * Register a new SSE connection
   */
  register(userId, callback) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(callback);
    
    console.log(`[SSE] User ${userId} connected. Total clients for user: ${this.clients.get(userId).size}`);
  }

  /**
   * Unregister a connection
   */
  unregister(userId, callback) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      userClients.delete(callback);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
      console.log(`[SSE] User ${userId} disconnected.`);
    }
  }

  async send(userId, payload) {
    console.log(`[SSE] Attempting to send to ${userId}. Clients in memory:`, Array.from(this.clients.keys()));
    if (this.clients.has(userId)) {
      for (const callback of this.clients.get(userId)) {
        try {
          await callback(payload);
          console.log(`[SSE] Successfully called callback for user ${userId}`);
        } catch (err) {
          console.error(`[SSE] Failed to call callback for user ${userId}:`, err);
          this.unregister(userId, callback);
        }
      }
    } else {
      console.log(`[SSE] No active clients found for user ${userId}`);
    }
  }

  /**
   * Broadcast to multiple users (e.g., all admins or all participants in a thread)
   */
  async broadcast(userIds, payload) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    console.log(`[SSE] Broadcasting to: ${ids.join(', ')}`);
    await Promise.all(ids.map(id => this.send(id, payload)));
  }
}

// Global instance for the worker environment
// Note: In Cloudflare Workers, global state is per-isolate.
// For true global sync, Durable Objects would be needed, but SSE Hub works for session-level live updates.
export const sseHub = new SSEHub();
