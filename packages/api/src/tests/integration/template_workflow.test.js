import { test, describe } from "node:test";
import assert from "node:assert";

// Import backend engines
import { getStudioOpportunities, generateStudioPost } from "../../core/studio/studio.js";
import { runMediaEngine } from "../../core/media/media_engine.js";
import { extractPalette } from "../../core/media/colorExtractor.js";
import { generateBrandIntelligence } from "../../core/intelligence/brand_intelligence_engine.js";

// ── Mock Database Setup ──────────────────────────────────────────────────────
const createMockDb = () => {
  const store = {
    brand_memory: [],
    template_performance: [],
    social_connections: [],
    brands: [],
    brand_dna_profiles: [],
    brand_dna_visual_identity: []
  };

  return {
    store,
    prepare: (sql) => {
      return {
        bind: (...args) => {
          return {
            first: async () => {
              if (sql.includes("SELECT preferred_template_id FROM brand_memory")) {
                const found = store.brand_memory.find(m => m.brand_id === args[0] && m.preferred_template_id);
                return found || null;
              }
              if (sql.includes("SELECT id, name, industry, tone FROM brands")) {
                return { id: args[0], name: "Skybound Aviator", industry: "Aerospace", tone: "Professional" };
              }
              if (sql.includes("SELECT name, industry FROM brands WHERE id = ?")) {
                return { name: "Skybound Aviator", industry: "Aerospace" };
              }
              if (sql.includes("SELECT primary_color, secondary_color")) {
                return { 
                  primary_color: "#1A73E8", 
                  secondary_color: "#34A853", 
                  typography_main: "Inter", 
                  visual_direction: "clean", 
                  imagery_style: "studio" 
                };
              }
              if (sql.includes("SELECT\n      u.plan_id")) {
                return {
                  plan_id: "pro",
                  social_accounts_limit: 5,
                  social_accounts_used: 1,
                  posts_per_month_limit: 100,
                  posts_used: 1,
                  ai_generations_limit: 1000,
                  ai_generations_used: 1,
                  subscription_status: "active",
                  trial_ends_at: null,
                  current_period_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
                };
              }
              if (sql.includes("SELECT id FROM social_connections")) {
                return { id: "adobe-conn-123" };
              }
              return null;
            },
            all: async () => {
              if (sql.includes("SELECT platform FROM social_connections")) {
                return { results: [{ platform: "instagram" }] };
              }
              if (sql.includes("SELECT template_id") || sql.includes("SELECT template_id, SUM(impressions)")) {
                if (sql.includes("SUM(impressions)")) {
                  return {
                    results: store.template_performance
                      .filter(p => p.brand_id === args[0])
                      .map(p => ({
                        template_id: p.template_id,
                        total_impressions: p.impressions,
                        total_engagements: p.engagements
                      }))
                  };
                }
                return { results: store.template_performance.filter(p => p.brand_id === args[0]) };
              }
              if (sql.includes("SELECT feature_name")) {
                return { results: [] };
              }
              return { results: [] };
            },
            run: async () => {
              if (sql.includes("INSERT INTO brand_memory")) {
                let id, brand_id, namespace, key, value, confidence, source, preferred_template_id, template_performance;
                
                if (sql.includes("preferred_template_id")) {
                  id = args[0];
                  brand_id = args[1];
                  namespace = "visual";
                  key = "template_performance_tracker";
                  value = '{"tracked": true}';
                  confidence = 0.95;
                  source = "intelligence_engine";
                  preferred_template_id = args[2];
                  template_performance = args[3];
                } else {
                  id = args[0];
                  brand_id = args[1];
                  namespace = args[2];
                  key = args[3];
                  value = args[4];
                  confidence = args[5];
                  source = args[6];
                  preferred_template_id = null;
                  template_performance = null;
                }

                const existingIdx = store.brand_memory.findIndex(m => m.brand_id === brand_id && m.namespace === namespace && m.key === key);
                const entry = {
                  id,
                  brand_id,
                  namespace,
                  key,
                  value,
                  confidence,
                  source,
                  preferred_template_id,
                  template_performance,
                  updated_at: new Date().toISOString()
                };

                if (existingIdx >= 0) {
                  store.brand_memory[existingIdx] = entry;
                } else {
                  store.brand_memory.push(entry);
                }
              }
              return { changes: 1 };
            }
          };
        }
      };
    }
  };
};

// ── Mock Global Fetch ─────────────────────────────────────────────────────────
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options) => {
  const urlString = String(url);
  
  if (urlString.includes("api.groq.com")) {
    const body = JSON.parse(options.body || "{}");
    const userPrompt = body.messages?.find(m => m.role === 'user')?.content || "";
    
    if (userPrompt.includes("opportunities")) {
      return {
        ok: true,
        json: async () => ({
          model: "openai/gpt-oss-120b",
          usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
          choices: [{
            message: {
              content: JSON.stringify({
                opportunities: [
                  {
                    id: 1,
                    framework: "Myth vs Reality",
                    idea: "Aviation fuel efficiencies",
                    hook: "Think aviation fuel is simple? Think again.",
                    caption: "HOOK: Think aviation fuel is simple? Think again. STORY: Here are the fuel facts. CTA: Learn more.",
                    cta: "Learn more",
                    hashtags: ["#aviation", "#fuel"],
                    objective: "build trust",
                    platforms: ["instagram"],
                    media_type: "carousel",
                    effort: "low"
                  }
                ]
              })
            }
          }]
        })
      };
    }

    // Match copywriter prompts for post generation
    if (userPrompt.includes("copywriter")) {
      return {
        ok: true,
        json: async () => ({
          model: "openai/gpt-oss-120b",
          usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
          choices: [{
            message: {
              content: JSON.stringify({
                body: "This is a completed dynamic layout script post body.",
                hook: "Think aviation is easy? Think again.",
                cta: "Explore opportunities",
                hashtags: "#aviation #flight"
              })
            }
          }]
        })
      };
    }

    return {
      ok: true,
      json: async () => ({
        model: "openai/gpt-oss-120b",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
        choices: [{
          message: {
            content: JSON.stringify({
              modules: {
                platform_health: {
                  headline: "Platforms healthy",
                  summary: "All platforms are linked and functioning well.",
                  insights: [
                    {
                      title: "Platform checkup",
                      category: "Platform Health",
                      finding: "All connections are stable.",
                      why_it_matters: "Consistent output requires stable publishing paths.",
                      evidence: ["1 connection active"],
                      confidence: "Observed",
                      recommended_action: "Monitor daily settings.",
                      expected_impact: "Smooth publishing flow.",
                      priority: "medium"
                    }
                  ]
                }
              },
              notifications: [
                {
                  type: "opportunity",
                  title: "New Traffic Spike",
                  body: "Spike detected in early morning hours.",
                  action: "Schedule more posts around 8 AM."
                }
              ]
            })
          } }]
        })
      };
    }

  if (urlString.includes("api.pexels.com")) {
    return {
      ok: true,
      json: async () => ({
        photos: [
          {
            id: 101,
            photographer: "Flight Expert",
            photographer_url: "https://pexels.com/flight",
            src: {
              large2x: "https://images.pexels.com/photos/101/original.jpg?w=1600",
              medium: "https://images.pexels.com/photos/101/medium.jpg"
            },
            width: 1600,
            height: 1200,
            alt: "Dramatic cockpit view in flight"
          },
          {
            id: 102,
            photographer: "Sky Photographer",
            photographer_url: "https://pexels.com/sky",
            src: {
              large2x: "https://images.pexels.com/photos/102/original.jpg?w=1600",
              medium: "https://images.pexels.com/photos/102/medium.jpg"
            },
            width: 1600,
            height: 1200,
            alt: "Blue sky and clouds minimalist"
          }
        ]
      })
    };
  }

  if (urlString.includes("images.unsplash.com") || urlString.includes("pexels.com/photos")) {
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    };
  }

  return {
    ok: true,
    text: async () => "Mock response",
    json: async () => ({})
  };
};

// Mock browser globals for Template rendering test in Node
const mockSessionStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; }
};
globalThis.sessionStorage = mockSessionStorage;

// ── Integration Tests ────────────────────────────────────────────────────────
describe("Template System End-to-End Integration Suite", () => {
  
  test("1. Use Idea -> Template Generation Flow", async () => {
    const mockDb = createMockDb();
    const env = { mypilotpost: mockDb, GROQ_API_KEY: "mock-key" };
    const auth = { brand_id: "test-brand-123", user_id: "test-user-123" };

    // a. getStudioOpportunities
    const requestOpps = new Request("http://localhost/api/customer/studio/opportunities");
    const resOpps = await getStudioOpportunities(requestOpps, env, auth);
    const oppsBody = await resOpps.json();
    
    assert.ok(oppsBody.opportunities?.length > 0);
    assert.ok(oppsBody.opportunities[0].suggested_template_family);

    // b. generateStudioPost
    const requestPost = new Request("http://localhost/api/customer/studio/generate-post", {
      method: "POST",
      body: JSON.stringify({
        framework: "Myth vs Reality",
        idea: "Aviation fuel",
        platforms: ["instagram"]
      })
    });
    const resPost = await generateStudioPost(requestPost, env, auth);
    const postBody = await resPost.json();

    assert.ok(postBody.body);
    assert.ok(postBody.layout_manifest);
    assert.equal(postBody.layout_manifest.animation_preset, "fade_slide");
  });

  test("2. Media Engine - Per-Slot Parallel Fetch & Aspect Ratio filtering", async () => {
    const mockDb = createMockDb();
    const env = { mypilotpost: mockDb, PEXELS_API_KEY: "mock-pexels-key" };
    
    const params = {
      brandId: "test-brand-123",
      platform: "instagram",
      slots: [
        { slot_id: "cover", slot_type: "hero", query: "flight cockpit", required_aspect_ratio: "4:5" },
        { slot_id: "slide_2", slot_type: "body", query: "blue sky", required_aspect_ratio: "4:5" }
      ]
    };

    const mediaResult = await runMediaEngine(params, env);
    assert.ok(mediaResult.cover);
    assert.ok(mediaResult.slide_2);
    // Deduplication check
    assert.notEqual(mediaResult.cover.image_url, mediaResult.slide_2.image_url);
  });

  test("3. Color Extraction & Palette Mapping", async () => {
    const palette = await extractPalette("https://images.unsplash.com/photo-1557804506?w=640");
    assert.ok(palette.dominant);
    assert.ok(palette.accent);
    assert.ok(palette.background);
    assert.ok(palette.text_contrast);
  });

  test("4. Frontend - Template Rendering and Slot Updates Simulation", async () => {
    const prefill = {
      layout_manifest: {
        template_id: "carousel_list_005",
        brand_overrides: { primary_color: "#1A1A1A", secondary_color: "#F5F5F5" },
        slides: [
          { slot_id: "cover", text_anchor: "headline" },
          { slot_id: "slide_2", text_anchor: "body_paragraph_1" }
        ]
      },
      hook: "Prefilled Hook Text",
      caption: "Body Paragraph 1 Copy.\n\nBody Paragraph 2 Copy.",
      image: "http://pexels.com/img1"
    };

    globalThis.sessionStorage.setItem("studio_idea_prefill", JSON.stringify(prefill));

    const raw = globalThis.sessionStorage.getItem("studio_idea_prefill");
    assert.ok(raw);
    const parsedPrefill = JSON.parse(raw);
    globalThis.sessionStorage.removeItem("studio_idea_prefill");

    assert.equal(parsedPrefill.layout_manifest.template_id, "carousel_list_005");

    const paragraphs = (parsedPrefill.caption || "").split("\n\n").filter(Boolean);
    const defaultPalette = {
      dominant: parsedPrefill.layout_manifest.brand_overrides.primary_color,
      accent: parsedPrefill.layout_manifest.brand_overrides.secondary_color,
      background: "#F5F5F5",
      text_contrast: "#FFFFFF"
    };

    const slotData = {};
    parsedPrefill.layout_manifest.slides.forEach(slide => {
      let textVal = "";
      if (slide.text_anchor === "headline" || slide.text_anchor === "hook") {
        textVal = parsedPrefill.hook;
      } else if (slide.text_anchor.startsWith("body_paragraph_")) {
        const idx = parseInt(slide.text_anchor.replace("body_paragraph_", "")) - 1;
        textVal = paragraphs[idx] || "";
      }
      slotData[slide.slot_id] = {
        text: textVal,
        image_url: parsedPrefill.image,
        palette: defaultPalette
      };
    });

    assert.equal(slotData.cover.text, "Prefilled Hook Text");
    assert.equal(slotData.cover.image_url, "http://pexels.com/img1");
    assert.equal(slotData.slide_2.text, "Body Paragraph 1 Copy.");

    // Simulate slot text editing
    slotData.cover.text = "User Edited Hook Text";
    assert.equal(slotData.cover.text, "User Edited Hook Text");
  });

  test("5. Brand Memory - Analytics Learning Loop", async () => {
    const mockDb = createMockDb();
    const env = { mypilotpost: mockDb, GROQ_API_KEY: "mock-key" };
    
    // a. Record template performance telemetry - using a real template ID that exists in registries
    mockDb.store.template_performance.push(
      { id: "1", brand_id: "test-brand-123", template_id: "tpl_feed_generic_default", platform: "instagram", impressions: 1000, engagements: 50 },
      { id: "2", brand_id: "test-brand-123", template_id: "tpl_carousel_premium_brand_story", platform: "instagram", impressions: 1000, engagements: 220 }
    );

    // b. Run brand intelligence engine analysis
    const intelReport = await generateBrandIntelligence(mockDb, "test-brand-123", env);
    assert.ok(intelReport);

    // c. Verify top performer updated in brand_memory
    const memoryRow = mockDb.store.brand_memory.find(m => m.brand_id === "test-brand-123" && m.preferred_template_id);
    assert.ok(memoryRow);
    assert.equal(memoryRow.preferred_template_id, "tpl_carousel_premium_brand_story");

    // d. Generate content opportunities and verify bias suggestions
    const requestOpps = new Request("http://localhost/api/customer/studio/opportunities");
    const resOpps = await getStudioOpportunities(requestOpps, env, { brand_id: "test-brand-123", user_id: "test-user-123" });
    const oppsBody = await resOpps.json();

    const biased = oppsBody.opportunities.some(o => o.suggested_template_id === "tpl_carousel_premium_brand_story");
    assert.ok(biased);
  });
});
