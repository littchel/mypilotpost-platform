/**
 * myPilotPost — Growth Engine V2 Validation Script
 * Tests points, streaks, referrals, and nudges.
 */

import { handleGrowthEvent, evaluateNudges } from "../src/core/growth/engine.js";
import { getDB } from "../src/lib/db.js";

async function validateGrowthSystem(env) {
  const db = getDB(env);
  const user_id = "test-user-" + Date.now();
  const brand_id = "test-brand-" + Date.now();

  console.log("🚀 Starting Growth Engine Validation...");

  // 1. Daily Login
  console.log("Scenario 1: Daily Login");
  await handleGrowthEvent({
    env,
    eventType: 'daily_login',
    payload: { user_id, brand_id }
  });
  
  const profile = await db.prepare("SELECT * FROM growth_profiles WHERE user_id = ?").bind(user_id).first();
  console.log(`- Points: ${profile.points} (Expected: 5)`);
  console.log(`- Streak: ${profile.streak_days} (Expected: 1)`);

  // 2. Publish Content
  console.log("Scenario 2: Publish Content");
  await handleGrowthEvent({
    env,
    eventType: 'content_published',
    payload: { user_id, brand_id, meta: { content_id: "post-1" } }
  });
  
  const profile2 = await db.prepare("SELECT * FROM growth_profiles WHERE user_id = ?").bind(user_id).first();
  console.log(`- Points: ${profile2.points} (Expected: 25)`);

  // 3. Sharing Action (WhatsApp)
  console.log("Scenario 3: WhatsApp Share");
  await handleGrowthEvent({
    env,
    eventType: 'content_shared_whatsapp',
    payload: { user_id, brand_id, meta: { content_id: "post-1" } }
  });
  
  const profile3 = await db.prepare("SELECT * FROM growth_profiles WHERE user_id = ?").bind(user_id).first();
  console.log(`- Points: ${profile3.points} (Expected: 50)`);

  // 4. Nudge Generation
  console.log("Scenario 4: Nudge Cooldown");
  await evaluateNudges(db, user_id, brand_id);
  const nudges = await db.prepare("SELECT * FROM growth_notifications WHERE user_id = ? AND type = 'nudge'").bind(user_id).all();
  console.log(`- Nudges: ${nudges.results.length} (Expected: 1)`);

  // 5. Referral Flow
  console.log("Scenario 5: Referral Signup");
  const referrer_id = user_id;
  const referred_id = "referred-user-" + Date.now();
  
  // Register referral
  const ref_id = crypto.randomUUID();
  await db.prepare("INSERT INTO referrals (id, referrer_user_id, referred_user_id, status) VALUES (?, ?, ?, 'pending')")
    .bind(ref_id, referrer_id, referred_id).run();

  // Activate referral
  await handleGrowthEvent({
    env,
    eventType: 'content_published',
    payload: { user_id: referred_id, brand_id: "other-brand", meta: { content_id: "post-2" } }
  });

  const referrerProfile = await db.prepare("SELECT points FROM growth_profiles WHERE user_id = ?").bind(referrer_id).first();
  console.log(`- Referrer Points after activation: ${referrerProfile.points} (Expected: 50 + 60 = 110)`);

  console.log("✅ Validation Complete!");
}

export { validateGrowthSystem };
