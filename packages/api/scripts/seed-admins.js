import crypto from 'crypto';

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return Buffer.from(bits).toString('hex');
}

async function generateSeed() {
  const password = "password123";
  const users = [
    { id: crypto.randomUUID(), email: "admin@mypilotpost.com", role: "super_admin" },
    { id: crypto.randomUUID(), email: "ops@mypilotpost.com", role: "operations" },
    { id: crypto.randomUUID(), email: "support@mypilotpost.com", role: "support" }
  ];

  console.log("-- Seed Admins SQL");
  for (const user of users) {
    const salt = crypto.randomBytes(16);
    const hash = await hashPassword(password, salt);
    const passwordHash = `${salt.toString('hex')}:${hash}`;
    
    console.log(`INSERT OR IGNORE INTO users (id, email, password_hash, role, verified_at, country, region) VALUES ('${user.id}', '${user.email}', '${passwordHash}', '${user.role}', datetime('now'), 'ZA', 'south-africa');`);
  }
}

generateSeed();
