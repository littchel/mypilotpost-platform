/**
 * OAUTH-003: Token Encryption Hardening Unit Tests
 * AES-256-GCM, Versioned Envelope (v1:), Legacy Compatibility, and Bounded CryptoKey Cache
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import {
  encrypt,
  decrypt,
  _getCacheSize,
  _clearKeyCache
} from "../../lib/crypto.js";

const TEST_SECRET = "test-encryption-secret-32byteslong!";
const ALT_SECRET = "alternate-secret-for-key-isolation!";

describe("OAUTH-003: Token Encryption Hardening", () => {
  beforeEach(() => {
    _clearKeyCache();
  });

  describe("1. Encryption and Compatibility", () => {
    test("1.1 Standard plaintext round-trip produces original text", async () => {
      const plaintext = "my-oauth-access-token-xyz-12345";
      const encrypted = await encrypt(plaintext, TEST_SECRET);
      assert.ok(typeof encrypted === "string");
      assert.ok(encrypted.startsWith("v1:"), "New ciphertext must start with v1:");

      const decrypted = await decrypt(encrypted, TEST_SECRET);
      assert.strictEqual(decrypted, plaintext);
    });

    test("1.2 Unicode, multilingual, and emoji inputs round-trip successfully", async () => {
      const unicodeText = "Token: 🚀 日本語, Français (é, à, ç), Русский, العربية, 🔐";
      const encrypted = await encrypt(unicodeText, TEST_SECRET);
      const decrypted = await decrypt(encrypted, TEST_SECRET);
      assert.strictEqual(decrypted, unicodeText);
    });

    test("1.3 Repeated encryption of identical plaintext produces distinct ciphertexts (IV uniqueness)", async () => {
      const plaintext = "constant-plaintext-value";
      const enc1 = await encrypt(plaintext, TEST_SECRET);
      const enc2 = await encrypt(plaintext, TEST_SECRET);
      const enc3 = await encrypt(plaintext, TEST_SECRET);

      assert.notStrictEqual(enc1, enc2);
      assert.notStrictEqual(enc2, enc3);
      assert.notStrictEqual(enc1, enc3);

      assert.strictEqual(await decrypt(enc1, TEST_SECRET), plaintext);
      assert.strictEqual(await decrypt(enc2, TEST_SECRET), plaintext);
      assert.strictEqual(await decrypt(enc3, TEST_SECRET), plaintext);
    });

    test("1.4 Legacy unprefixed ciphertext remains fully decryptable (backward compatibility)", async () => {
      // Simulate legacy unprefixed ciphertext by stripping the v1: prefix
      const plaintext = "legacy-token-stored-in-db";
      const versioned = await encrypt(plaintext, TEST_SECRET);
      const legacy = versioned.slice(3); // Remove 'v1:'

      assert.ok(!legacy.startsWith("v1:"), "Legacy token has no v1: prefix");
      const decrypted = await decrypt(legacy, TEST_SECRET);
      assert.strictEqual(decrypted, plaintext, "Legacy unprefixed ciphertext must decrypt cleanly");
    });

    test("1.5 Double-encryption avoidance: passing valid v1 ciphertext does not wrap it", async () => {
      const plaintext = "original-secret-token";
      const encrypted = await encrypt(plaintext, TEST_SECRET);
      assert.ok(encrypted.startsWith("v1:"));

      const secondPass = await encrypt(encrypted, TEST_SECRET);
      assert.strictEqual(secondPass, encrypted, "Should return identical v1 ciphertext without re-encrypting");

      const decrypted = await decrypt(secondPass, TEST_SECRET);
      assert.strictEqual(decrypted, plaintext);
    });
  });

  describe("2. Authentication and Fail-Closed Validation", () => {
    test("2.1 Decryption with wrong secret fails closed", async () => {
      const plaintext = "classified-token";
      const encrypted = await encrypt(plaintext, TEST_SECRET);

      await assert.rejects(
        async () => {
          await decrypt(encrypted, "wrong-secret-that-does-not-match!");
        },
        (err) => {
          assert.ok(err);
          return true;
        },
        "Must fail closed on wrong key"
      );
    });

    test("2.2 Ciphertext payload tampering fails closed", async () => {
      const plaintext = "secure-data";
      const encrypted = await encrypt(plaintext, TEST_SECRET);
      const parts = encrypted.split(":");
      const rawPayload = parts[1];

      // Mutate a character in the ciphertext body
      const tamperedPayload = rawPayload.slice(0, 20) + (rawPayload[20] === "A" ? "B" : "A") + rawPayload.slice(21);
      const tamperedEncrypted = `v1:${tamperedPayload}`;

      await assert.rejects(
        async () => {
          await decrypt(tamperedEncrypted, TEST_SECRET);
        },
        (err) => {
          assert.ok(err);
          return true;
        },
        "Tampered ciphertext must fail closed"
      );
    });

    test("2.3 IV tampering fails closed", async () => {
      const plaintext = "sensitive-iv-test";
      const encrypted = await encrypt(plaintext, TEST_SECRET);
      const rawPayload = encrypted.slice(3);

      // Mutate the first character (part of the 12-byte IV)
      const tamperedPayload = (rawPayload[0] === "X" ? "Y" : "X") + rawPayload.slice(1);
      const tamperedEncrypted = `v1:${tamperedPayload}`;

      await assert.rejects(
        async () => {
          await decrypt(tamperedEncrypted, TEST_SECRET);
        },
        (err) => {
          assert.ok(err);
          return true;
        },
        "Tampered IV must fail closed"
      );
    });

    test("2.4 Unsupported version marker (e.g. v2:, v99:) is rejected", async () => {
      const plaintext = "future-proof-test";
      const encrypted = await encrypt(plaintext, TEST_SECRET);
      const payload = encrypted.slice(3);

      await assert.rejects(
        async () => {
          await decrypt(`v2:${payload}`, TEST_SECRET);
        },
        /Unsupported ciphertext version/,
        "Must reject unknown v2: version"
      );

      await assert.rejects(
        async () => {
          await decrypt(`v99:${payload}`, TEST_SECRET);
        },
        /Unsupported ciphertext version/,
        "Must reject unknown v99: version"
      );
    });

    test("2.5 Truncated or malformed ciphertext fails closed", async () => {
      // Shorter than 28 bytes (12 bytes IV + 16 bytes tag)
      await assert.rejects(
        async () => {
          await decrypt("v1:dGVzdA", TEST_SECRET);
        },
        /Truncated or malformed ciphertext/,
        "Sub-28 byte payload must throw truncated error"
      );
    });

    test("2.6 Invalid base64url characters fail safely", async () => {
      await assert.rejects(
        async () => {
          await decrypt("v1:invalid!!base64url^^chars", TEST_SECRET);
        },
        /Invalid base64url characters/,
        "Invalid characters must fail safely"
      );
    });

    test("2.7 Missing encryption secret fails closed", async () => {
      await assert.rejects(
        async () => {
          await encrypt("some-text", null);
        },
        /Encryption secret missing/
      );

      await assert.rejects(
        async () => {
          await encrypt("some-text", "");
        },
        /Encryption secret missing/
      );
    });

    test("2.8 Missing decryption secret fails closed", async () => {
      await assert.rejects(
        async () => {
          await decrypt("v1:sometoken", null);
        },
        /Decryption secret missing/
      );

      await assert.rejects(
        async () => {
          await decrypt("v1:sometoken", "");
        },
        /Decryption secret missing/
      );
    });

    test("2.9 Missing input values fail closed without plaintext fallback", async () => {
      await assert.rejects(
        async () => {
          await encrypt(null, TEST_SECRET);
        },
        /Encryption text missing/
      );

      await assert.rejects(
        async () => {
          await decrypt(null, TEST_SECRET);
        },
        /Decryption token missing/
      );
    });
  });

  describe("3. Bounded Isolate-Memory CryptoKey Cache", () => {
    test("3.1 Derived key reuse eliminates redundant PBKDF2 derivations", async () => {
      assert.strictEqual(_getCacheSize(), 0);

      // First encryption populates cache
      const start1 = performance.now();
      await encrypt("token-1", TEST_SECRET);
      const time1 = performance.now() - start1;

      assert.strictEqual(_getCacheSize(), 1, "Cache should have 1 entry");

      // Second encryption reuses cached key
      const start2 = performance.now();
      await encrypt("token-2", TEST_SECRET);
      const time2 = performance.now() - start2;

      assert.strictEqual(_getCacheSize(), 1, "Cache size should remain 1");
      // Cache hit should be significantly faster than initial PBKDF2 100k derivation
      assert.ok(time2 < time1, `Cached call (${time2.toFixed(2)}ms) should be faster than uncached (${time1.toFixed(2)}ms)`);
    });

    test("3.2 Cache key isolation ensures distinct secrets do not collide", async () => {
      await encrypt("text-a", TEST_SECRET);
      assert.strictEqual(_getCacheSize(), 1);

      await encrypt("text-b", ALT_SECRET);
      assert.strictEqual(_getCacheSize(), 2, "Cache should store separate keys for different secrets");

      // Verify both secrets decrypt their respective data accurately
      const encA = await encrypt("secret-a-data", TEST_SECRET);
      const encB = await encrypt("secret-b-data", ALT_SECRET);

      assert.strictEqual(await decrypt(encA, TEST_SECRET), "secret-a-data");
      assert.strictEqual(await decrypt(encB, ALT_SECRET), "secret-b-data");
    });

    test("3.3 Bounded cache enforces maximum size (10 entries) and LRU eviction", async () => {
      // Insert 12 distinct secrets
      for (let i = 1; i <= 12; i++) {
        await encrypt("sample", `test-secret-unique-number-${i}`);
      }

      assert.strictEqual(_getCacheSize(), 10, "Cache must never exceed 10 entries");
    });

    test("3.4 Safely re-derives key after LRU eviction", async () => {
      const secret1 = "eviction-test-secret-1";
      const enc = await encrypt("preserve-data", secret1);

      // Fill cache with 10 other secrets to evict secret1
      for (let i = 2; i <= 12; i++) {
        await encrypt("dummy", `eviction-test-secret-${i}`);
      }
      assert.strictEqual(_getCacheSize(), 10);

      // Secret 1 was evicted; decrypting should re-derive cleanly and succeed
      const decrypted = await decrypt(enc, secret1);
      assert.strictEqual(decrypted, "preserve-data", "Re-derivation after eviction must succeed");
    });
  });
});
