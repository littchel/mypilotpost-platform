/**
 * Provider Adapter Index
 */

import * as linkedin from "./linkedin.js";
import * as meta from "./facebook.js";
import * as instagram from "./instagram.js";
import * as google from "./google.js";
import * as x from "./x.js";
import * as tiktok from "./tiktok.js";
import * as pinterest from "./pinterest.js";
import * as wordpress from "./wordpress.js";
import * as google_drive from "./google_drive.js";
import * as dropbox from "./dropbox.js";
import * as canva from "./canva.js";
import * as threads from "./threads.js";

export const ADAPTERS = {
  linkedin,
  meta,                     // Facebook Pages adapter (backward compat)
  facebook: meta,           // Facebook Pages — Page token + /me/accounts
  instagram,                // Instagram Business — IG account discovery via connected Page
  google,
  youtube: google,                  // alias — routes through Google OAuth adapter
  google_analytics: google,         // alias — routes through Google OAuth adapter
  google_business: google,          // alias — routes through Google OAuth adapter
  google_search_console: google,    // alias — routes through Google OAuth adapter
  google_drive,
  x,
  tiktok,
  pinterest,
  wordpress,
  dropbox,
  canva,
  threads,
};

export function getAdapter(provider) {
  return ADAPTERS[provider] || null;
}
