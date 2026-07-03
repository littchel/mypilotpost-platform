export default {
  template_id: "tpl_feed_generic_default",
  name: "Generic Clean Feed Post",
  format: "feed_post",
  intent: ["awareness", "general"],
  pillars: ["general"],
  platforms: ["instagram", "facebook", "linkedin", "twitter"],
  dimensions: {
    width: 1080,
    height: 1080
  },
  slides: [
    {
      slot_id: "slide_1",
      slot_type: "hero",
      layout: "centered_hero",
      components: [
        {
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100, z_index: 1 },
          overlay: false
        },
        {
          type: "headline",
          position: { x: 10, y: 15, width: 80, height: 20, z_index: 2 },
          max_chars: 80,
          overlay: false
        },
        {
          type: "body",
          position: { x: 10, y: 40, width: 80, height: 40, z_index: 2 },
          max_chars: 300,
          overlay: false
        },
        {
          type: "logo",
          position: { x: 5, y: 5, width: 15, height: 5, z_index: 2 },
          overlay: true
        }
      ]
    }
  ]
};
