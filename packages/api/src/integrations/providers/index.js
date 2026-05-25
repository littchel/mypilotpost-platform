/**
 * Provider Adapter Index
 */

import * as linkedin from "./linkedin.js";
import * as meta from "./facebook.js"; // Map Meta to the hardened facebook.js adapter
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
  meta,
  facebook: meta,           // alias — routes through unified Meta adapter
  instagram: meta,          // alias — routes through unified Meta adapter
  google,
  youtube: google,          // alias — routes through Google OAuth adapter
  google_analytics: google, // alias — routes through Google OAuth adapter
  google_business: google,  // alias — routes through Google OAuth adapter
  x,
  tiktok,
  pinterest,
  wordpress,
  google_drive,
  dropbox,
  canva,
  threads,
};

export function getAdapter(provider) {
  return ADAPTERS[provider] || null;
}
