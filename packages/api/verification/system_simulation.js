/**
 * myPilotPost — Growth Engine V2 Simulation & Audit
 * Purpose: Verify production-level behavior across all event flows.
 */

import { handleGrowthEvent, evaluateNudges, applyReward } from "../src/core/growth/engine.js";
import { getDB } from "../src/lib/db.js";
import { emitEvent } from "../src/lib/bus.js";

async function runAudit(env) {
  const db = getDB(env);
  const user1 = "audit-user-A-" + Date.now();
  const brand1 = "audit-brand-A-" + Date.now();
  const user2 = "audit-user-B-" + Date.now();
  const brand2 = "audit-brand-B-" + Date.now();

  console.log("Starting Production Audit for Growth Engine V2...");

  // ---------------------------------------------------------
  // PHASE 1: EVENT FLOW VALIDATION
  // ---------------------------------------------------------
  
  // 1. Daily Login (Auth Flow)
  console.log("\n[1] Testing Auth Flow (Daily Login)");
  await emitEvent(env, 'daily_login', { user_id: user1, brand_id: brand1 });
  
  const p1 = await db.prepare("SELECT * FROM growth_profiles WHERE user_id = ?").bind(user1).first();
  if (p1 && p1.points === 5 && p1.streak_days === 1) {
    console.log("✅ Daily Login: SUCCESS (Points: 5, Streak: 1)");
  } else {
    console.log("❌ Daily Login: FAILED", p1);
  }

  // Duplicate Login (Should not increment streak)
  await emitEvent(env, 'daily_login', { user_id: user1, brand_id: brand1 });
  const p1_dup = await db.prepare("SELECT * FROM growth_profiles WHERE user_id = ?").bind(user1).first();
  if (p1_dup.streak_days === 1) {
    console.log("✅ Daily Login Duplication: PROTECTED");
  } else {
    console.log("❌ Daily Login Duplication: FAILED (Streak incremented twice)");
  }

  // 2. Approval Flow
  console.log("\n[2] Testing Approval Flow");
  await emitEvent(env, 'content_approved', { user_id: user1, brand_id: brand1, content_id: 'post-123' });
  const p2 = await db.prepare("SELECT points FROM growth_profiles WHERE user_id = ?").bind(user1).first();
  if (p2.points === 20) { // 5 (login) + 15 (approval)
    console.log("✅ Approval Flow: SUCCESS (Total Points: 20)");
  } else {
    console.log("❌ Approval Flow: FAILED", p2.points);
  }

  // 3. Publishing Flow
  console.log("\n[3] Testing Publishing Flow");
  await emitEvent(env, 'content_published', { user_id: user1, brand_id: brand1, content_id: 'post-123' });
  const p3 = await db.prepare("SELECT points FROM growth_profiles WHERE user_id = ?").bind(user1).first();
  if (p3.points === 40) { // 20 + 20 (publish)
    console.log("✅ Publishing Flow: SUCCESS (Total Points: 40)");
  } else {
    console.log("❌ Publishing Flow: FAILED", p3.points);
  }

  // 4. Reporting Flow
  console.log("\n[4] Testing Reporting Flow");
  await emitEvent(env, 'report_shared_client', { user_id: user1, brand_id: brand1, metadata: { report_id: 'rep-456' } });
  const p4 = await db.prepare("SELECT points FROM growth_profiles WHERE user_id = ?").bind(user1).first();
  if (p4.points === 70) { // 40 + 30 (report)
    console.log("✅ Reporting Flow: SUCCESS (Total Points: 70)");
  } else {
    console.log("❌ Reporting Flow: FAILED", p4.points);
  }

  // 5. Manual Actions (API Simulator)
  console.log("\n[5] Testing Manual Growth Actions");
  await emitEvent(env, 'content_shared_whatsapp', { user_id: user1, brand_id: brand1 });
  const p5 = await db.prepare("SELECT points FROM growth_profiles WHERE user_id = ?").bind(user1).first();
  if (p5.points === 95) { // 70 + 25
    console.log("✅ WhatsApp Sharing: SUCCESS (Total Points: 95)");
  }

  // ---------------------------------------------------------
  // PHASE 2: NUDGE SYSTEM VALIDATION
  // ---------------------------------------------------------
  console.log("\n[6] Testing Nudge System (Intelligence & Cooldown)");
  await evaluateNudges(db, user1, brand1);
  await evaluateNudges(db, user1, brand1); // Should be blocked by cooldown
  
  const nudges = await db.prepare("SELECT * FROM growth_notifications WHERE user_id = ? AND type = 'nudge'").bind(user1).all();
  if (nudges.results.length === 1) {
    console.log("✅ Nudge System: SUCCESS (Cooldown enforced, 1 nudge created)");
  } else {
    console.log("❌ Nudge System: FAILED (Count: " + nudges.results.length + ")");
  }

  // ---------------------------------------------------------
  // PHASE 3: DATABASE INTEGRITY & ISOLATION
  // ---------------------------------------------------------
  console.log("\n[7] Testing Multi-tenant Isolation");
  await emitEvent(env, 'daily_login', { user_id: user2, brand_id: brand2 });
  const leakCheck = await db.prepare("SELECT points FROM growth_profiles WHERE user_id = ?").bind(user2).first();
  if (leakCheck.points === 5) {
    console.log("✅ Isolation: SUCCESS (No leakage between Brand A and Brand B)");
  } else {
    console.log("❌ Isolation: FAILED (Leaked points!)");
  }

  // ---------------------------------------------------------
  // PHASE 4: NOTIFICATION SYNC
  // ---------------------------------------------------------
  console.log("\n[8] Testing Notification Sync");
  const growthNotifs = await db.prepare("SELECT COUNT(*) as count FROM growth_notifications WHERE user_id = ?").bind(user1).first();
  const systemNotifs = await db.prepare("SELECT COUNT(*) as count FROM notifications WHERE brand_id = ?").bind(brand1).first();
  console.log(`- Growth Notifications: ${growthNotifs.count}`);
  console.log(`- System Notifications: ${systemNotifs.count}`);
  if (growthNotifs.count > 0 && systemNotifs.count > 0) {
    console.log("✅ Notification Sync: SUCCESS (Both systems firing)");
  }

  // ---------------------------------------------------------
  // PHASE 5: FAILURE TESTING
  // ---------------------------------------------------------
  console.log("\n[9] Testing Failure Handling");
  try {
    await handleGrowthEvent({ env, eventType: 'daily_login', payload: {} });
    console.log("✅ Empty Payload: HANDLED (No crash)");
  } catch (e) {
    console.log("❌ Empty Payload: CRASHED", e.message);
  }

  console.log("\n--- Audit Complete ---");
}

export { runAudit };
