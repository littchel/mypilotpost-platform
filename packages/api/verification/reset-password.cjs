const crypto = require('crypto');

const email = 'pilot_final_v2@test.com';
const password = 'Password123!';

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// PBKDF2 parameters from packages/api/src/auth/customer.js
const iterations = 100000;
const hash = 'sha256';
const keylen = 32; // 256 bits

const salt = crypto.randomBytes(16);
const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, hash);

const saltHex = bytesToHex(salt);
const hashHex = bytesToHex(derivedKey);
const finalHash = `${saltHex}:${hashHex}`;

console.log(`UPDATE users SET password_hash = '${finalHash}' WHERE email = '${email}';`);
