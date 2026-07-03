export default {
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
