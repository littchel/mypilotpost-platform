/**
 * myPilotPost — Central Event Bus
 * AUTHORITATIVE • SYSTEM CORE
 */

import { logEvent } from "./events.js";

// Import system handlers (They will register themselves or we import them here)
import { handleGrowthEvent } from "../core/growth/engine.js";
import { handleNotificationEvent } from "../core/notifications/notifications.js";
import { handleIntelligenceEvent } from "../core/intelligence/engine.js";
import { handleMemoryEvent } from "../core/memory/collector.js";

/**
 * Emit a system-wide event.
 * Triggers side effects across Growth, Notifications, and Intelligence.
 */
export async function emitEvent(env, eventType, payload = {}) {
  const { brand_id, user_id, content_id, metadata = {} } = payload;

  console.log(`[EVENT] ${eventType} for brand ${brand_id}`);

  // 1. Persistent Audit Log
  try {
    await logEvent(env, {
      event_type: eventType,
      brand_id,
      user_id,
      content_id,
      metadata
    });
  } catch (e) {
    console.error(`[EVENT ERROR] Failed to log event ${eventType}:`, e);
  }

  // 2. Dispatch to Sub-Systems (Sequential for Data Integrity in MVP)
  // In a high-scale env, these would be queued jobs.
  const eventContext = { env, eventType, payload };

  await Promise.allSettled([
    handleGrowthEvent(eventContext),
    handleNotificationEvent(eventContext),
    handleIntelligenceEvent(eventContext),
    handleMemoryEvent(eventContext),
  ]);
}
