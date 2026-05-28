// packages/api/src/core/onboarding/onboarding_v2.js
import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/customer/onboarding
 * Returns progress + signup_source so the frontend can route the correct onboarding path.
 */
export async function getOnboarding(request, env, auth) {
  const db = getDB(env);
  try {
    const [progress, user] = await Promise.all([
      db.prepare("SELECT * FROM onboarding_progress WHERE user_id = ?").bind(auth.user_id).first(),
      db.prepare("SELECT signup_source, company_name, audit_website FROM users WHERE id = ?").bind(auth.user_id).first()
    ]);

    const signupSource = user?.signup_source || 'direct';

    if (progress) {
      return json({ progress, signup_source: signupSource });
    }

    // No progress row yet — build minimal initial state from user table
    const initialData = {
      brandName: user?.company_name || "",
      websiteURL: user?.audit_website || ""
    };

    return json({
      progress: { current_step: 1, data: JSON.stringify(initialData) },
      signup_source: signupSource
    });
  } catch (err) {
    return error("Failed to fetch onboarding progress", "SERVER_ERROR", String(err), 500);
  }
}

/**
 * POST /api/customer/onboarding/step
 * Update current step and generic data blob
 */
export async function updateOnboardingStep(request, env, auth) {
  const db = getDB(env);
  try {
    const body = await request.json();
    const { step, data } = body;

    if (typeof step !== 'number') return error("Invalid step", "BAD_REQUEST", null, 400);

    await db
      .prepare(`
        INSERT INTO onboarding_progress (user_id, current_step, data, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          current_step = excluded.current_step,
          data = COALESCE(excluded.data, onboarding_progress.data),
          updated_at = datetime('now')
      `)
      .bind(auth.user_id, step, data ? JSON.stringify(data) : null)
      .run();

    return json({ success: true, step });
  } catch (err) {
    return error("Failed to update onboarding step", "SERVER_ERROR", String(err), 500);
  }
}

/**
 * POST /api/customer/onboarding/market
 * Save market context (Step 3)
 */
export async function saveMarketContext(request, env, auth) {
  const db = getDB(env);
  try {
    const body = await request.json();
    const { brand_id, country, language, industry } = body;

    if (!brand_id) return error("Brand ID is required", "BAD_REQUEST", null, 400);

    await db
      .prepare(`
        INSERT INTO brand_market_context (brand_id, country, language, industry, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(brand_id) DO UPDATE SET
          country = excluded.country,
          language = excluded.language,
          industry = excluded.industry,
          updated_at = datetime('now')
      `)
      .bind(brand_id, country || 'ZW', language || 'en', industry || null)
      .run();

    return json({ success: true });
  } catch (err) {
    return error("Failed to save market context", "SERVER_ERROR", String(err), 500);
  }
}

/**
 * POST /api/customer/onboarding/complete
 * Marks onboarding finished. For audit-source users, runs hydration to link audit intelligence to brand.
 */
export async function completeOnboarding(request, env, auth) {
  const db = getDB(env);
  try {
    await db
      .prepare(`
        INSERT INTO onboarding_progress (user_id, current_step, completed_at, updated_at)
        VALUES (?, 9, datetime('now'), datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          completed_at = datetime('now'),
          updated_at = datetime('now')
      `)
      .bind(auth.user_id)
      .run();

    return json({ success: true });
  } catch (err) {
    return error("Failed to complete onboarding", "SERVER_ERROR", String(err), 500);
  }
}
