/**
 * myPilotPost — Validation Utilities
 */

export function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
}

export function isValidEnum(value, allowed) {
  return allowed.includes(value);
}

export function isValidISO8601(dateString) {
  if (typeof dateString !== 'string') return false;
  const d = new Date(dateString);
  return !isNaN(d.getTime()) && dateString.includes('T');
}

export function validatePagination(limit, offset) {
  const l = parseInt(limit);
  const o = parseInt(offset);
  return {
    limit: !isNaN(l) && l > 0 && l <= 100 ? l : 10,
    offset: !isNaN(o) && o >= 0 ? o : 0
  };
}
