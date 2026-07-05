import { z } from "zod";

// ==========================================
// 1. Core Enums and Schemas
// ==========================================

export const FormatEnum = z.enum(["feed_post", "carousel", "story", "reel"]);

export const SlotTypeEnum = z.enum([
  "hero",
  "body",
  "cta",
  "background_texture",
  "product_showcase",
  "human_element"
]);

export const ComponentTypeEnum = z.enum([
  "background",
  "image",
  "headline",
  "subtitle",
  "body",
  "cta_button",
  "logo",
  "hashtags"
]);

export const AnimationPresetEnum = z.enum([
  "fade_slide",
  "slide_up",
  "bounce",
  "pulse",
  "typewriter",
  "reveal"
]);

// ==========================================
// 2. Dimension Schema
// ==========================================
export const DimensionSchema = z
  .object({
    width: z.number().int().positive("Width must be a positive integer"),
    height: z.number().int().positive("Height must be a positive integer")
  })
  .strict();

// ==========================================
// 3. Component Schema
// ==========================================
export const ComponentPositionSchema = z
  .object({
    x: z.number().min(0).max(100, "Position X must be between 0 and 100 percent"),
    y: z.number().min(0).max(100, "Position Y must be between 0 and 100 percent"),
    width: z.number().min(0).max(100, "Component width must be between 0 and 100 percent"),
    height: z.number().min(0).max(100, "Component height must be between 0 and 100 percent"),
    z_index: z.number().int().optional()
  })
  .strict();

export const ComponentSchema = z
  .object({
    type: ComponentTypeEnum,
    position: ComponentPositionSchema,
    max_chars: z.number().int().positive().optional(),
    required_aspect_ratio: z.string().regex(/^\d+:\d+$/, "Aspect ratio must be in format 'W:H'").optional(),
    min_width: z.number().int().positive().optional(),
    min_height: z.number().int().positive().optional(),
    overlay: z.boolean().default(false)
  })
  .strict();

// ==========================================
// 4. Slide Schema
// ==========================================
export const SlideSchema = z
  .object({
    slot_id: z.string().min(1, "Slot ID is required"),
    slot_type: SlotTypeEnum,
    layout: z.string().min(1, "Layout description is required"),
    components: z.array(ComponentSchema).min(1, "Slide must contain at least one component")
  })
  .strict();

// ==========================================
// 5. Template Schema
// ==========================================
export const TemplateSchema = z
  .object({
    template_id: z.string().min(1, "Template ID is required"),
    name: z.string().min(1, "Template name is required"),
    format: FormatEnum,
    intent: z.array(z.string()).min(1, "At least one intent is required"),
    pillars: z.array(z.string()).default([]),
    platforms: z.array(z.string()).min(1, "At least one target platform is required"),
    dimensions: DimensionSchema,
    slides: z.array(SlideSchema).min(1, "At least one slide is required"),
    animation_preset: AnimationPresetEnum.optional()
  })
  .passthrough();

// ==========================================
// 6. Complete 5-Slide Carousel Example & Validation
// ==========================================

export const exampleCarouselTemplate = {
  template_id: "tpl_carousel_premium_brand_story",
  name: "Premium Brand Story Journey",
  format: "carousel",
  intent: ["awareness", "authority"],
  pillars: ["brand_dna", "company_values"],
  platforms: ["instagram", "linkedin"],
  dimensions: {
    width: 1080,
    height: 1350
  },
  animation_preset: "fade_slide",
  slides: [
    // Slide 1: Cover (Hero)
    {
      slot_id: "slide_1_cover",
      slot_type: "hero",
      layout: "split_left_image",
      components: [
        {
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
          overlay: false
        },
        {
          type: "image",
          position: { x: 50, y: 0, width: 50, height: 100, z_index: 2 },
          required_aspect_ratio: "4:5",
          min_width: 540,
          min_height: 1350,
          overlay: false
        },
        {
          type: "headline",
          position: { x: 5, y: 20, width: 40, height: 25, z_index: 3 },
          max_chars: 40,
          overlay: true
        },
        {
          type: "subtitle",
          position: { x: 5, y: 48, width: 40, height: 15, z_index: 3 },
          max_chars: 60,
          overlay: true
        },
        {
          type: "logo",
          position: { x: 5, y: 5, width: 15, height: 5, z_index: 3 },
          overlay: true
        }
      ]
    },
    // Slide 2: Problem statement (Body)
    {
      slot_id: "slide_2_problem",
      slot_type: "body",
      layout: "centered_text_bg_texture",
      components: [
        {
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
          overlay: false
        },
        {
          type: "headline",
          position: { x: 10, y: 15, width: 80, height: 15, z_index: 2 },
          max_chars: 50,
          overlay: false
        },
        {
          type: "body",
          position: { x: 10, y: 35, width: 80, height: 45, z_index: 2 },
          max_chars: 200,
          overlay: false
        },
        {
          type: "logo",
          position: { x: 5, y: 5, width: 15, height: 5, z_index: 2 },
          overlay: true
        }
      ]
    },
    // Slide 3: Solution (Body)
    {
      slot_id: "slide_3_solution",
      slot_type: "body",
      layout: "top_headline_bottom_image",
      components: [
        {
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
          overlay: false
        },
        {
          type: "headline",
          position: { x: 10, y: 10, width: 80, height: 15, z_index: 2 },
          max_chars: 60,
          overlay: false
        },
        {
          type: "image",
          position: { x: 10, y: 30, width: 80, height: 60, z_index: 2 },
          required_aspect_ratio: "16:9",
          min_width: 864,
          min_height: 486,
          overlay: false
        },
        {
          type: "logo",
          position: { x: 5, y: 5, width: 15, height: 5, z_index: 2 },
          overlay: true
        }
      ]
    },
    // Slide 4: Real-world Proof (Human element / Customer story)
    {
      slot_id: "slide_4_proof",
      slot_type: "human_element",
      layout: "asymmetric_split_quote",
      components: [
        {
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
          overlay: false
        },
        {
          type: "image",
          position: { x: 5, y: 15, width: 35, height: 70, z_index: 2 },
          required_aspect_ratio: "1:1",
          min_width: 378,
          min_height: 378,
          overlay: false
        },
        {
          type: "headline",
          position: { x: 45, y: 20, width: 50, height: 15, z_index: 2 },
          max_chars: 40,
          overlay: false
        },
        {
          type: "body",
          position: { x: 45, y: 40, width: 50, height: 40, z_index: 2 },
          max_chars: 180,
          overlay: false
        },
        {
          type: "logo",
          position: { x: 5, y: 5, width: 15, height: 5, z_index: 2 },
          overlay: true
        }
      ]
    },
    // Slide 5: Call to Action (CTA)
    {
      slot_id: "slide_5_cta",
      slot_type: "cta",
      layout: "centered_cta_minimal",
      components: [
        {
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
          overlay: false
        },
        {
          type: "headline",
          position: { x: 10, y: 20, width: 80, height: 20, z_index: 2 },
          max_chars: 50,
          overlay: false
        },
        {
          type: "subtitle",
          position: { x: 15, y: 45, width: 70, height: 15, z_index: 2 },
          max_chars: 80,
          overlay: false
        },
        {
          type: "cta_button",
          position: { x: 35, y: 65, width: 30, height: 10, z_index: 2 },
          max_chars: 20,
          overlay: false
        },
        {
          type: "logo",
          position: { x: 42.5, y: 5, width: 15, height: 5, z_index: 2 },
          overlay: true
        },
        {
          type: "hashtags",
          position: { x: 10, y: 85, width: 80, height: 10, z_index: 2 },
          max_chars: 100,
          overlay: false
        }
      ]
    }
  ]
};

/**
 * Validates a template object against the Zod schema.
 * @param {any} data
 * @returns {{success: boolean, data?: any, error?: z.ZodError}}
 */
export function validateTemplate(data) {
  const result = TemplateSchema.safeParse(data);
  if (result.success) return result;

  if (data && typeof data === "object" && data.template_id) {
    const template_id = data.template_id;
    const name = data.template_name || data.name || template_id;
    
    let format = data.format || "";
    if (format.toLowerCase().includes("carousel")) {
      format = "carousel";
    } else if (format.toLowerCase().includes("story")) {
      format = "story";
    } else if (format.toLowerCase().includes("reel")) {
      format = "reel";
    } else {
      format = "feed_post";
    }

    const intent = data.intent || ["engagement"];
    const pillars = data.pillars || ["brand_dna"];
    const platforms = data.platforms || ["instagram", "facebook", "linkedin"];
    const dimensions = data.dimensions || (format === "story" || format === "reel" ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 });

    const parseVal = (val, maxDim) => {
      if (typeof val === "string") {
        if (val.endsWith("px")) {
          return Math.min(100, Math.max(0, (parseFloat(val) / maxDim) * 100));
        }
        if (val.endsWith("%")) {
          return Math.min(100, Math.max(0, parseFloat(val)));
        }
      }
      const num = parseFloat(val || 0);
      if (num > 100) {
        return Math.min(100, Math.max(0, (num / maxDim) * 100));
      }
      return Math.min(100, Math.max(0, num));
    };

    const slides = [];
    if (data.slides && Array.isArray(data.slides)) {
      const isStandard = data.slides.every(s => s.slot_id && s.components && Array.isArray(s.components));
      if (isStandard) {
        slides.push(...data.slides);
      } else {
        slides.push(...data.slides.map((s, idx) => {
          const slot_id = `slide_${s.slide_index || idx + 1}`;
          const slot_type = s.type === "cover_title" || s.type === "closing_cta" ? "hero" : "body";
          const layout = s.type || "carousel_slide";
          
          const components = [
            {
              type: "background",
              position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
              overlay: false
            }
          ];
          
          if (s.content?.circle_image_url || s.content?.capsule_image_url || s.background_image_url) {
            components.push({
              type: "image",
              position: { x: 10, y: 10, width: 80, height: 50, z_index: 2 },
              overlay: false
            });
          }
          
          if (s.content?.title || s.content?.section_header || s.components?.comparison_headers?.top_text) {
            components.push({
              type: "headline",
              position: { x: 10, y: 65, width: 80, height: 15, z_index: 3 },
              max_chars: 100,
              overlay: true
            });
          }
          
          if (s.content?.sub_header || s.content?.left_description || s.content?.right_description) {
            components.push({
              type: "body",
              position: { x: 10, y: 80, width: 80, height: 15, z_index: 3 },
              max_chars: 200,
              overlay: true
            });
          }
          
          if (s.components?.brand_seal || s.content?.brand_seal_large || s.content?.social_handle_pill) {
            components.push({
              type: "logo",
              position: { x: 5, y: 5, width: 15, height: 5, z_index: 3 },
              overlay: true
            });
          }

          return {
            slot_id,
            slot_type,
            layout,
            components
          };
        }));
      }
    } else if (data.slots && Array.isArray(data.slots)) {
      slides.push({
        slot_id: "slide_1",
        slot_type: "hero",
        layout: "custom_slots",
        components: data.slots.map(s => {
          let cType = "headline";
          if (s.type === "image" || s.slot_id === "media_background" || s.slot_id?.includes("image")) {
            cType = "image";
          } else if (s.slot_id?.includes("logo")) {
            cType = "logo";
          } else if (s.type === "container" || s.slot_id?.includes("background")) {
            cType = "background";
          }
          return {
            type: cType,
            position: {
              x: parseVal(s.x, dimensions.width),
              y: parseVal(s.y, dimensions.height),
              width: parseVal(s.width, dimensions.width),
              height: parseVal(s.height, dimensions.height),
              z_index: s.z_index || 3
            },
            max_chars: s.max_chars || 100,
            overlay: s.overlay ?? true
          };
        })
      });
    } else {
      slides.push({
        slot_id: "slide_1",
        slot_type: "hero",
        layout: "generic_fallback",
        components: [
          {
            type: "background",
            position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
            overlay: false
          },
          {
            type: "image",
            position: { x: 0, y: 0, width: 100, height: 100, z_index: 2 },
            overlay: false
          },
          {
            type: "headline",
            position: { x: 10, y: 30, width: 80, height: 40, z_index: 3 },
            max_chars: 100,
            overlay: true
          }
        ]
      });
    }

    const normalized = {
      ...data,
      template_id,
      name,
      format,
      intent,
      pillars,
      platforms,
      dimensions,
      slides
    };

    const finalResult = TemplateSchema.safeParse(normalized);
    if (finalResult.success) {
      return finalResult;
    } else {
      console.warn("[VALIDATION FAILED] Normalization failed for:", template_id, JSON.stringify(finalResult.error.format()));
    }
  }

  return result;
}
