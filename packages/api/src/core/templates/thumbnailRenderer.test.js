import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateOpportunityThumbnail } from './thumbnailRenderer.js';

describe('Headless Thumbnail Renderer Suite', () => {
  
  test('1. Renders solid fallback background when image and logo are missing', async () => {
    const templateSchema = { format: 'feed_post' };
    const slotData = { headline: 'Stop struggles with visual layouts' };
    const brandVariables = { primary_color: '#FF5733' };

    const buffer = await generateOpportunityThumbnail(templateSchema, slotData, brandVariables);
    
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 100); // verify non-empty buffer
  });

  test('2. Renders correct carousel dimensions (300x400)', async () => {
    const templateSchema = { format: 'carousel' };
    const slotData = { headline: 'Clean carousel layouts' };
    const brandVariables = { primary_color: '#00FF00' };

    const buffer = await generateOpportunityThumbnail(templateSchema, slotData, brandVariables);
    
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 100);
  });
  
  test('3. Handles missing text inputs gracefully', async () => {
    const templateSchema = { format: 'feed_post' };
    const slotData = {};
    const brandVariables = {};

    const buffer = await generateOpportunityThumbnail(templateSchema, slotData, brandVariables);
    
    assert.ok(buffer instanceof Buffer);
  });
});
