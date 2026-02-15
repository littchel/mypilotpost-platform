/**
 * dates.js
 *
 * Canonical date & time helpers
 * Scope: ALL milestones
 *
 * Rules:
 * - UTC only for storage & transport
 * - ISO 8601 only
 * - No locale formatting side effects
 * - Pure functions only
 */

/**
 * Current Unix timestamp (seconds)
 */
export function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Current ISO timestamp (UTC)
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Convert Date or timestamp to ISO (UTC)
 */
export function toISO(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  throw new Error("Invalid date value");
}

/**
 * Add seconds to a Unix timestamp
 */
export function addSeconds(unix, seconds) {
  return unix + seconds;
}

/**
 * Start of current UTC day (Unix seconds)
 */
export function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * End of current UTC day (Unix seconds)
 */
export function endOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Convert UTC ISO timestamp → local ISO-like time
 *
 * IMPORTANT:
 * - Used ONLY for display (Phase 2 calendar)
 * - Does NOT mutate, store, or replace UTC values
 * - Output format: YYYY-MM-DDTHH:mm
 */
export function toLocalTime(utcISO, timezone) {
  if (!utcISO || !timezone) return null;

  try {
    const date = new Date(utcISO);

    // Use Intl for timezone-safe conversion without locale strings
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);

    const map = {};
    for (const p of parts) {
      if (p.type !== "literal") {
        map[p.type] = p.value;
      }
    }

    // ISO-like local string (no seconds, no Z)
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return null;
  }
}
