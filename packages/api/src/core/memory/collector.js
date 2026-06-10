/**
 * myPilotPost — Memory Collector
 * Translates platform bus events (emitEvent) into memory events (emit).
 * Registered as a handler in lib/bus.js.
 *
 * Only maps events that are actually emitted somewhere in the codebase.
 * Dead mappings have been removed to avoid misleading coverage.
 */

import { emit, TOOLS, EVENTS } from '../events/emit.js';

// Bus eventType → { tool, event, extract(payload) → { value, metadata } }
// Only entries where emitEvent(env, eventType) is called in the codebase.
const BUS_TO_MEMORY = {
  content_published:    { tool: TOOLS.SCHEDULER,    event: EVENTS.CONTENT_PUBLISHED,  extract: p => ({ metadata: { platform: p.metadata?.platform, content_type: p.metadata?.content_type } }) },
  content_approved:     { tool: TOOLS.APPROVAL,     event: EVENTS.CONTENT_APPROVED,   extract: () => ({}) },
  content_rejected:     { tool: TOOLS.APPROVAL,     event: EVENTS.APPROVAL_COMPLETED, extract: () => ({}) },
  approval_requested:   { tool: TOOLS.APPROVAL,     event: EVENTS.APPROVAL_REQUESTED, extract: () => ({}) },
  report_shared_client: { tool: TOOLS.REPORTS,      event: EVENTS.REPORT_OPENED,      extract: () => ({}) },
  report_exported:      { tool: TOOLS.REPORTS,      event: EVENTS.REPORT_EXPORTED,    extract: () => ({}) },
  invite_accepted:      { tool: TOOLS.TEAMS,        event: EVENTS.TEAM_MEMBER_ADDED,  extract: () => ({}) },
  audit_generated:      { tool: TOOLS.AUDIT,        event: EVENTS.AUDIT_GENERATED,    extract: () => ({}) },
  schedule_created:     { tool: TOOLS.SCHEDULER,    event: EVENTS.SCHEDULE_CREATED,   extract: () => ({}) },
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
