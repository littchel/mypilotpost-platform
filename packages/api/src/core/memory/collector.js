/**
 * myPilotPost — Memory Collector
 * Translates platform bus events (emitEvent) into memory events (emit).
 * Registered as a handler in lib/bus.js.
 *
 * Maps existing event bus event types to memory layer events + tools.
 */

import { emit, TOOLS, EVENTS } from '../events/emit.js';

// Bus eventType → { tool, event, extract(payload) → { value, metadata } }
const BUS_TO_MEMORY = {
  content_saved:          { tool: TOOLS.CREATE_POST,  event: EVENTS.CONTENT_SAVED,      extract: p => ({ metadata: { content_type: p.metadata?.content_type, platform: p.metadata?.platform } }) },
  content_published:      { tool: TOOLS.SCHEDULER,    event: EVENTS.CONTENT_PUBLISHED,  extract: p => ({ metadata: { platform: p.metadata?.platform, content_type: p.metadata?.content_type } }) },
  post_scheduled:         { tool: TOOLS.SCHEDULER,    event: EVENTS.CONTENT_SCHEDULED,  extract: () => ({}) },
  approval_requested:     { tool: TOOLS.APPROVAL,     event: EVENTS.APPROVAL_REQUESTED, extract: () => ({}) },
  content_approved:       { tool: TOOLS.APPROVAL,     event: EVENTS.CONTENT_APPROVED,   extract: () => ({}) },
  content_rejected:       { tool: TOOLS.APPROVAL,     event: EVENTS.APPROVAL_COMPLETED, extract: () => ({}) },
  report_shared_client:   { tool: TOOLS.REPORTS,      event: EVENTS.REPORT_OPENED,      extract: () => ({}) },
  invite_accepted:        { tool: TOOLS.TEAMS,        event: EVENTS.TEAM_MEMBER_ADDED,  extract: () => ({}) },
  first_post_generated:   { tool: TOOLS.AI_STUDIO,    event: EVENTS.CONTENT_CREATED,    extract: () => ({}) },
  first_post_scheduled:   { tool: TOOLS.SCHEDULER,    event: EVENTS.SCHEDULE_PUBLISHED, extract: () => ({}) },
};

export function handleMemoryEvent({ env, eventType, payload = {} }) {
  const mapping = BUS_TO_MEMORY[eventType];
  if (!mapping) return Promise.resolve();

  const { brand_id, user_id } = payload;
  if (!brand_id) return Promise.resolve();

  const { value, metadata } = mapping.extract(payload);
  emit(env, {
    tool:     mapping.tool,
    event:    mapping.event,
    brandId:  brand_id,
    userId:   user_id,
    value:    value ?? undefined,
    metadata: metadata || undefined,
  });

  return Promise.resolve(); // fire-and-forget, always resolves
}
