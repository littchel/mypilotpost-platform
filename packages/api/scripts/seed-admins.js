/**
 * myPilotPost — Admin Seed Script
 * Generates production-safe SQL INSERT statements for admin accounts.
 * Run: node scripts/seed-admins.js
 * Then execute the output SQL against your D1 database.
 *
 * A unique secure password is generated per run and printed to stdout.
 * Store it immediately — it is not persisted anywhere else.
 */

import { randomBytes, createHash } from "crypto";
import { webcrypto } from "crypto";

const { subtle } = webcrypto;

function generateSecurePassword(length = 24) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map(b => charset[b % charset.length])
    .join("");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await subtle.importKey(
    "raw",
    Buffer.from(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256
  );
  const hash = Buffer.from(bits).toString("hex");
  return `${salt.toString("hex")}:${hash}`;
}

async function generateSeed() {
  const superAdminPassword = generateSecurePassword();
  const opsPassword = generateSecurePassword();
  const supportPassword = generateSecurePassword();

  const accounts = [
    { email: "admin@mypilotpost.com", role: "super_admin", password: superAdminPassword },
    { email: "ops@mypilotpost.com", role: "ops", password: opsPassword },
    { email: "support@mypilotpost.com", role: "support", password: supportPassword }
  ];

  console.log("-- ============================================");
  console.log("-- myPilotPost Admin Seed SQL");
  console.log("-- Generated:", new Date().toISOString());
  console.log("-- IMPORTANT: Store these passwords securely.");
  console.log("-- ============================================");
  console.log();

  for (const account of accounts) {
    const id = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(account.password);
    console.log(`-- ${account.role}: ${account.email}`);
    console.log(`-- Password: ${account.password}`);
    console.log(
      `INSERT OR IGNORE INTO users (id, email, password_hash, role, is_active, verified_at, country, region, created_at) ` +
      `VALUES ('${id}', '${account.email}', '${passwordHash}', '${account.role}', 1, datetime('now'), 'ZA', 'south-africa', datetime('now'));`
    );
    console.log();
  }

  console.log("-- ============================================");
  console.log("-- Run this SQL against your D1 database:");
  console.log("-- wrangler d1 execute mypilotpost --remote --command \"<paste SQL above>\"");
  console.log("-- ============================================");
}

generateSeed().catch(console.error);
