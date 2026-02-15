/**
 * Brand Memory Writer
 * Milestone: 5 — Brand Intelligence Engine
 *
 * CURRENT ROLE (SAFE STUB):
 * - Accept memory write requests
 * - Validate shape
 * - Return deterministic response
 *
 * FUTURE ROLE:
 * - Persist brand_memory_events
 * - Power recommendations & ML
 *
 * IMPORTANT:
 * This file MUST exist and MUST NOT throw.
 */

export async function writeBrandMemoryEvent(_db, event) {
  // Defensive shape validation (non-fatal)
  if (!event || typeof event !== "object") {
    return {
      id: null,
      status: "ignored",
      reason: "invalid_event_shape"
    };
  }

  /*
    Expected event shape (future-proofed):

    {
      brandId,
      eventType,
      sourceEngine,
      entityType,
      entityId,
      snapshot
    }
  */

  return {
    id: crypto.randomUUID(),
    status: "accepted",     // accepted ≠ persisted (yet)
    persisted: false,       // explicit: no DB writes in this milestone
    milestone: 5,
    received_at: new Date().toISOString()
  };
}
