import { logEvent } from "../../lib/events.js";

/**
 * Static localization map
 * Source of truth for UI + AI + analytics
 */
export const LOCALIZATION_MAP = {
  africa: [
    { country: "South Africa", domain: "google.co.za" },
    { country: "Nigeria", domain: "google.com.ng" },
    { country: "Kenya", domain: "google.co.ke" },
    { country: "Egypt", domain: "google.com.eg" },
    { country: "Ghana", domain: "google.com.gh" },
    { country: "Morocco", domain: "google.co.ma" },
    { country: "Ethiopia", domain: "google.com.et" },
    { country: "Tanzania", domain: "google.co.tz" },
    { country: "Uganda", domain: "google.co.ug" },
    { country: "Rwanda", domain: "google.rw" },
    { country: "Zambia", domain: "google.co.zm" },
    { country: "Zimbabwe", domain: "google.co.zw" },
    { country: "Botswana", domain: "google.co.bw" },
    { country: "Namibia", domain: "google.com.na" },
    { country: "Mozambique", domain: "google.co.mz" },
    { country: "Senegal", domain: "google.sn" },
    { country: "Ivory Coast", domain: "google.ci" },
    { country: "Cameroon", domain: "google.cm" },
    { country: "Algeria", domain: "google.dz" },
    { country: "Tunisia", domain: "google.tn" },
    { country: "Libya", domain: "google.com.ly" },
    { country: "Sudan", domain: "google.com.sd" },
    { country: "Angola", domain: "google.co.ao" },
    { country: "DR Congo", domain: "google.cd" },
    { country: "Madagascar", domain: "google.mg" },
    { country: "Mauritius", domain: "google.mu" },
    { country: "Seychelles", domain: "google.sc" },
    { country: "Malawi", domain: "google.mw" },
    { country: "Lesotho", domain: "google.co.ls" },
    { country: "Eswatini", domain: "google.co.sz" }
  ],

  europe: [
    { country: "United Kingdom", domain: "google.co.uk" },
    { country: "Germany", domain: "google.de" },
    { country: "France", domain: "google.fr" },
    { country: "Italy", domain: "google.it" },
    { country: "Spain", domain: "google.es" },
    { country: "Netherlands", domain: "google.nl" },
    { country: "Belgium", domain: "google.be" },
    { country: "Sweden", domain: "google.se" },
    { country: "Norway", domain: "google.no" },
    { country: "Denmark", domain: "google.dk" },
    { country: "Finland", domain: "google.fi" },
    { country: "Poland", domain: "google.pl" },
    { country: "Portugal", domain: "google.pt" },
    { country: "Ireland", domain: "google.ie" },
    { country: "Switzerland", domain: "google.ch" }
  ],

  americas: [
    { country: "United States", domain: "google.com" },
    { country: "Canada", domain: "google.ca" },
    { country: "Brazil", domain: "google.com.br" },
    { country: "Mexico", domain: "google.com.mx" }
  ]
};

/* ======================================================
   HELPERS
====================================================== */

/**
 * Resolve localization by domain or country
 * Used by AI generators & validators
 */
export function resolveLocalization({ country, domain }) {
  for (const [region, entries] of Object.entries(LOCALIZATION_MAP)) {
    for (const entry of entries) {
      if (
        (country && entry.country === country) ||
        (domain && entry.domain === domain)
      ) {
        return {
          region,
          country: entry.country,
          domain: entry.domain
        };
      }
    }
  }
  return null;
}

/**
 * Log localization selection (non-blocking)
 * Call this when user confirms localization choice
 */
export async function logLocalizationSelected(env, auth, {
  country,
  domain,
  content_id = null
}) {
  const resolved = resolveLocalization({ country, domain });
  if (!resolved || !auth?.brand_id) return;

  try {
    await logEvent(env, {
      event_type: "localization_selected",
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      content_id,
      metadata: {
        region: resolved.region,
        country: resolved.country,
        google_domain: resolved.domain
      }
    });
  } catch (err) {
    // Never block user flow on analytics
    console.error("[localization:event]", err?.message || err);
  }
}
