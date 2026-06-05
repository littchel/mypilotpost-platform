/**
 * myPilotPost — Memory Event Emitter
 * Single entry point for all platform events destined for the memory layer.
 * Fire-and-forget: never blocks the calling request.
 *
 * Usage:
 *   emit(env, { tool, event, brandId, userId, value, metadata })
 */

import { getDB } from '../../lib/db.js';

export const TOOLS = {
  AI_STUDIO:    'ai_studio',
  CREATE_POST:  'create_post',
  CREATE_ARTICLE: 'create_article',
  SCHEDULER:    'scheduler',
  REPORTS:      'reports',
  APPROVAL:     'approval',
  TEAMS:        'teams',
  CLIENTS:      'clients',
  MEDIA:        'media',
  AUDIT:        'brand_audit',
  NOTIFICATIONS:'notifications',
};

export const EVENTS = {
  CONTENT_CREATED:      'content_created',
  CONTENT_SAVED:        'content_saved',
  CONTENT_SHARED:       'content_shared',
  CONTENT_APPROVED:     'content_approved',
  CONTENT_SCHEDULED:    'content_scheduled',
  CONTENT_PUBLISHED:    'content_published',
  REPORT_OPENED:        'report_opened',
  REPORT_EXPORTED:      'report_exported',
  PLAYBOOK_STARTED:     'playbook_started',
  PLAYBOOK_COMPLETED:   'playbook_completed',
  MEDIA_SELECTED:       'media_selected',
  APPROVAL_REQUESTED:   'approval_requested',
  APPROVAL_COMPLETED:   'approval_completed',
  CLIENT_ADDED:         'client_added',
  EMAIL_OPENED:         'email_opened',
  WHATSAPP_OPENED:      'whatsapp_opened',
  AUDIT_GENERATED:      'audit_generated',
  TEAM_MEMBER_ADDED:    'team_member_added',
  SCHEDULE_CREATED:     'schedule_created',
  SCHEDULE_PUBLISHED:   'schedule_published',
};

/**
 * Emit a memory event. Always async — never awaited by callers.
 * @param {object} env   — Worker env
 * @param {object} opts
 * @param {string} opts.tool     — from TOOLS
 * @param {string} opts.event    — from EVENTS
 * @param {string} opts.brandId
 * @param {string} [opts.userId]
 * @param {number} [opts.value]
 * @param {object} [opts.metadata]
 */
export function emit(env, { tool, event, brandId, userId, value, metadata } = {}) {
  if (!tool || !event || !brandId) return;

  Promise.resolve().then(async () => {
    try {
      const db  = getDB(env);
      const id  = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO memory_events (id, brand_id, user_id, tool, event, value, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, brandId, userId || null, tool, event, value ?? null,
              metadata ? JSON.stringify(metadata) : null).run();

      // Async consume — trigger feature updates
      const { consume } = await import('./consume.js');
      await consume(env, { id, brandId, userId, tool, event, value, metadata });
    } catch (e) {
      console.error('[MEMORY EMIT]', e.message);
    }
  });
}
