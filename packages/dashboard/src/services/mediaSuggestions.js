/**
 * myPilotPost — Media Suggestions Service v2
 * Calls /api/customer/media/suggestions with full context.
 * Returns images grouped into the 5 editor tabs.
 * Tracks: image_shown, image_selected, image_attached.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function authHeaders() {
  const token = localStorage.getItem('mpp_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function trackEvent(action, metadata = {}) {
  const token = localStorage.getItem('mpp_token');
  if (!token) return;
  fetch(`${API_BASE}/api/customer/growth/action`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, metadata }),
  }).catch(() => {});
}

/**
 * Fetch images with full context. Returns tab-ready groups.
 * @param {{
 *   platform?,   contentType?,  format?,
 *   text?,       title?,        brand?,
 *   industry?,   goal?
 * }} ctx
 * @returns {{ agencyPicks, trending, humanStories, professional, minimal, all, meta }}
 */
export async function fetchMediaSuggestions({
  platform    = 'instagram',
  contentType = 'social',
  format,
  text        = '',
  title       = '',
  brand       = '',
  industry    = '',
  goal        = '',
  batch       = null,
} = {}) {
  const res = await fetch(`${API_BASE}/api/customer/media/suggestions`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ platform, contentType, format, text, title, brand, industry, goal, batch }),
  });

  if (!res.ok) throw new Error(`Media suggestions failed: ${res.status}`);

  const data = await res.json();

  const featured    = data.featured    || [];
  const recommended = data.recommended || [];
  const more        = data.more        || [];
  const byCategory  = data.byCategory  || {};
  const meta        = data.meta        || {};

  const agencyPicks  = featured;
  const trending     = recommended;
  const humanStories = byCategory.human        || [];
  const professional = byCategory.professional || [];
  const minimal      = byCategory.minimal      || [];
  const all          = [...featured, ...recommended, ...more];

  trackEvent('image_shown', { count: all.length, platform, contentType, format, confidence: meta.confidence });

  return { agencyPicks, trending, humanStories, professional, minimal, all, meta };
}

/** Call when user clicks an image in the picker */
export function trackImageSelected(img) {
  trackEvent('image_selected', { provider: img?.provider, external_id: img?.external_id });
}

/** Call after image is attached to a draft */
export function trackImageAttached(img) {
  trackEvent('image_attached', { provider: img?.provider, external_id: img?.external_id });
}

/** Call after image is imported from a card into a composer */
export function trackImageImported(img) {
  trackEvent('image_imported', { provider: img?.provider, external_id: img?.external_id });
}
