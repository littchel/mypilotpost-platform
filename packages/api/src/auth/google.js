/**
 * Google OAuth — AUTHORITATIVE
 * Schema-aligned • Production safe
 * Cloudflare Workers compatible
 */

import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { issueJWT } from "./jwt.js";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://www.googleapis.com/oauth2/v3/userinfo";

/* ======================================================
   START GOOGLE OAUTH
====================================================== */
export async function googleStart(_req, env) {
  if (!env.GOOGLE_CLIENT_ID) {
    console.error("[OAUTH] Missing GOOGLE_CLIENT_ID");
    return json({ error: "OAuth not configured" }, 500);
  }

  const redirectUri =
    "https://mypilotpost-api.littchel.workers.dev/api/customer/oauth/google/callback";

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "consent");

  return Response.redirect(url.toString(), 302);
}

/* ======================================================
   GOOGLE OAUTH CALLBACK — FINAL (LOCKED)
====================================================== */
export async function googleCallback(request, env) {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      console.error("[OAUTH] Missing Google env vars");
      return json({ error: "OAuth not configured" }, 500);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return json({ error: "Missing OAuth code" }, 400);
    }

    /* ============================
       1. Exchange code → token
    ============================ */
    const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri:
          "https://mypilotpost-api.littchel.workers.dev/api/customer/oauth/google/callback",
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[OAUTH] Token exchange failed:", await tokenRes.text());
      return json({ error: "Token exchange failed" }, 500);
    }

    const tokenData = await tokenRes.json();

    /* ============================
       2. Fetch Google profile
    ============================ */
    const profileRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileRes.ok) {
      console.error("[OAUTH] Profile fetch failed:", await profileRes.text());
      return json({ error: "Failed to fetch Google profile" }, 500);
    }

    const profile = await profileRes.json();
    const email = profile.email;
    const googleSub = profile.sub;

    if (!email || !googleSub) {
      return json({ error: "Incomplete Google profile" }, 500);
    }

    const db = getDB(env);

    /* ============================
       3. Find or create user
       users table:
       id | email | google_sub | plan
    ============================ */
    let user = await db
      .prepare(`SELECT id FROM users WHERE google_sub = ?`)
      .bind(googleSub)
      .first();

    if (!user) {
      const userId = crypto.randomUUID();

      await db
        .prepare(
          `
          INSERT INTO users (id, email, google_sub, plan)
          VALUES (?, ?, ?, 'free')
          `
        )
        .bind(userId, email.toLowerCase(), googleSub)
        .run();

      user = { id: userId };
    }

    /* ============================
       4. Find or create brand
       brands.user_id (AUTHORITATIVE)
    ============================ */
    let brand = await db
      .prepare(
        `
        SELECT id
        FROM brands
        WHERE user_id = ?
          AND deleted_at IS NULL
        `
      )
      .bind(user.id)
      .first();

    if (!brand) {
      const brandId = crypto.randomUUID();

      await db
        .prepare(
          `
          INSERT INTO brands (id, user_id, name, industry)
          VALUES (?, ?, ?, 'general')
          `
        )
        .bind(brandId, user.id, `${email}'s Brand`)
        .run();

      brand = { id: brandId };
    }

    /* ============================
       5. ISSUE JWT — ✅ FIXED
       (env passed, NOT env.JWT_SECRET)
    ============================ */
    const jwt = await issueJWT(
      {
        user_id: user.id,
        brand_id: brand.id,
        role: "customer",
        plan: "free",
      },
      env
    );

    /* ============================
       6. Return token
    ============================ */
    return json({ access_token: jwt });
  } catch (err) {
    console.error("[OAUTH CALLBACK CRASH]", err);
    return json({ error: "OAuth callback failed" }, 500);
  }
}
