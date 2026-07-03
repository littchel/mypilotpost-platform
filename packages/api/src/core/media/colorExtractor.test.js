import test from 'node:test';
import assert from 'node:assert';
import { getLuminance, getContrastColor, extractPalette } from './colorExtractor.js';

test('Color Extractor - getLuminance calculations', () => {
  // Pure white luminance should be 1
  assert.strictEqual(getLuminance('#ffffff'), 1);
  assert.strictEqual(getLuminance('#FFFFFF'), 1);

  // Pure black luminance should be 0
  assert.strictEqual(getLuminance('#000000'), 0);
  assert.strictEqual(getLuminance('#000'), 0);

  // Intermediate color checks
  const grayLuminance = getLuminance('#808080');
  assert.ok(grayLuminance > 0 && grayLuminance < 1);
});

test('Color Extractor - getContrastColor rules', () => {
  // Contrast text color for white background should be black
  assert.strictEqual(getContrastColor('#ffffff'), '#000000');
  
  // Contrast text color for black background should be white
  assert.strictEqual(getContrastColor('#000000'), '#FFFFFF');

  // Contrast text color for a very dark background should be white
  assert.strictEqual(getContrastColor('#1A2A3A'), '#FFFFFF');

  // Contrast text color for a very light background should be black
  assert.strictEqual(getContrastColor('#F0F2F5'), '#000000');
});

test('Color Extractor - extractPalette cache & fallback checks', async () => {
  // Test fallback to default brand overrides
  const brandDefaults = { primary_color: '#FF0000', secondary_color: '#00FF00' };
  const palette = await extractPalette(null, 2, brandDefaults, {});

  assert.strictEqual(palette.dominant, '#FF0000');
  assert.strictEqual(palette.accent, '#00FF00');
  assert.strictEqual(palette.background, '#F4F4F9');
  assert.strictEqual(palette.text_contrast, '#000000');

  // Test deterministic palette lookup based on image URL hash when live extraction fails
  const paletteFromUrl = await extractPalette('https://images.unsplash.com/photo-12345', 2, {}, {});
  assert.ok(paletteFromUrl.dominant.startsWith('#'));
  assert.ok(paletteFromUrl.accent.startsWith('#'));
  assert.ok(paletteFromUrl.background.startsWith('#'));
  assert.strictEqual(typeof paletteFromUrl.text_contrast, 'string');

  // Test Redis caching flow (mocking Redis environment client)
  const redisCache = {};
  const mockEnv = {
    REDIS_CLIENT: {
      get: async (key) => redisCache[key] || null,
      setEx: async (key, ttl, value) => {
        redisCache[key] = value;
        return 'OK';
      }
    }
  };

  const url = 'https://images.pexels.com/photos/12345';
  
  // Run first extraction to write to mock Redis cache
  const firstExtract = await extractPalette(url, 2, {}, mockEnv);
  const cacheKey = `palette:${url}`;
  
  assert.ok(redisCache[cacheKey], 'Palette should be stored in Redis cache');
  const cachedData = JSON.parse(redisCache[cacheKey]);
  assert.strictEqual(cachedData.dominant, firstExtract.dominant);

  // Run second extraction to fetch from cache
  const secondExtract = await extractPalette(url, 2, {}, mockEnv);
  assert.deepStrictEqual(secondExtract, firstExtract, 'Subsequent extract should return cached palette');
});
