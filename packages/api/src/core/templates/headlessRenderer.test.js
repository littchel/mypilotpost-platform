import { test, describe } from 'node:test';
import assert from 'node:assert';
import { renderOpportunityCard, closeHeadlessRenderer } from './headlessRenderer.js';

describe('Puppeteer Headless Renderer Suite', () => {
  
  test('1. Launches Puppeteer and renders opportunity card to WebP buffer', async () => {
    const templateSchema = {
      template_id: 'tpl_feed_test',
      dimensions: { width: 400, height: 400 },
      slides: [
        {
          slot_id: 'slide_1',
          slot_type: 'hero',
          components: [
            { type: 'background', position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 } },
            { type: 'headline', position: { x: 10, y: 20, width: 80, height: 30, z_index: 2 } }
          ]
        }
      ]
    };

    const slotData = {
      slide_1: {
        text: 'Hello from Headless Puppeteer Renderer!',
        image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=640&q=80',
        palette: {
          background: '#1A73E8',
          text_contrast: '#FFFFFF'
        }
      }
    };

    const brandVariables = {
      primary_color: '#1A73E8',
      secondary_color: '#34A853',
      font_stack: 'Inter, sans-serif'
    };

    const startTime = Date.now();
    const buffer = await renderOpportunityCard(templateSchema, slotData, brandVariables);
    const duration = Date.now() - startTime;
    
    console.log(`[PERFORMANCE] First render duration: ${duration}ms`);
    
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 500); // Verify it contains screenshot bytes
    
    // Test warm cache hit speed
    const cacheStartTime = Date.now();
    const cachedBuffer = await renderOpportunityCard(templateSchema, slotData, brandVariables);
    const cacheDuration = Date.now() - cacheStartTime;
    
    console.log(`[PERFORMANCE] Cached render duration: ${cacheDuration}ms`);
    assert.ok(cacheDuration < 5); // Cache hits should be instant (< 5ms)
    assert.equal(buffer.toString('binary'), cachedBuffer.toString('binary'));
    
    await closeHeadlessRenderer();
  });
});
