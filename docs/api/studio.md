# myPilotPost — Content Studio & Template System API Documentation

This document describes the API endpoints, request/response contracts, parameters, and payloads for the myPilotPost Template System and Content Studio.

---

## 1. GET /api/customer/studio/opportunities

Generates a daily content opportunity briefing tailored to the brand's DNA, active social channels, and target visual styling.

### Request
* **Method**: `GET`
* **Path**: `/api/customer/studio/opportunities`
* **Headers**:
  * `Authorization: Bearer <JWT>`

### Response
* **Content-Type**: `application/json`
* **Status**: `200 OK`
* **JSON Schema**:
  * `opportunities` (Array): List of tailored content items.
    * `suggested_template_family` (String): The visual layout family biased toward high performers (e.g. `carousel_comparison`, `quote_card`, `hero_headline`, `split_layout`, `story_fullscreen`).
    * `suggested_template_id` (String): Recommended template ID aligned with the content framework.

#### Example Response
```json
{
  "opportunities": [
    {
      "id": 1,
      "framework": "Myth vs Reality",
      "idea": "The biggest myth about visual styling",
      "hook": "Everyone believes visual context is optional. They are wrong.",
      "caption": "HOOK: Everyone believes visual context is optional. They are wrong. STORY: Consistent design creates trust. CTA: Learn more.",
      "cta": "Read visual context details",
      "hashtags": ["#marketing", "#visuals"],
      "objective": "Build authority",
      "platforms": ["instagram", "linkedin"],
      "media_type": "carousel",
      "effort": "low",
      "suggested_template_family": "carousel_comparison",
      "suggested_template_id": "tpl_carousel_premium_brand_story"
    }
  ]
}
```

---

## 2. POST /api/customer/studio/generate-post

Generates completed, ready-to-publish social copy and maps the copy layout slides anchors to template slots.

### Request
* **Method**: `POST`
* **Path**: `/api/customer/studio/generate-post`
* **Headers**:
  * `Authorization: Bearer <JWT>`
  * `Content-Type: application/json`
* **Body Parameters**:
  * `framework` (String, Required): e.g., `"Myth vs Reality"`
  * `idea` (String, Optional): Concept description
  * `hook` (String, Optional): Custom hook line
  * `platforms` (Array of Strings, Optional): e.g., `["instagram"]`
  * `template_id` (String, Optional): Force rendering using a specific template ID. If omitted, the engine auto-selects a recommended template.

#### Example Request
```json
{
  "framework": "Myth vs Reality",
  "idea": "Aviation fuel efficiencies",
  "platforms": ["instagram"],
  "template_id": "tpl_carousel_premium_brand_story"
}
```

### Response
* **Content-Type**: `application/json`
* **Status**: `200 OK`
* **JSON Schema**:
  * `body` (String): Main generated text
  * `hook` (String): Refined scroll-stopping line
  * `cta` (String): Call to action
  * `hashtags` (String): Hashtag stack
  * `layout_manifest` (Object): Renders the canvas layouts.
    * `template_id` (String): The template selected.
    * `brand_overrides` (Object): Primary/secondary colors, fonts pairings, and logo asset URL.
    * `slides` (Array): Slide list mapping slot IDs to text anchors.
    * `animation_preset` (String): e.g., `fade_slide` or `fade_scale`.

#### Example Response
```json
{
  "body": "This is a completed dynamic layout script post body.",
  "hook": "Think aviation is easy? Think again.",
  "cta": "Explore opportunities",
  "hashtags": "#aviation #flight",
  "platform_variants": {},
  "layout_manifest": {
    "template_id": "tpl_carousel_premium_brand_story",
    "brand_overrides": {
      "primary_color": "#1A73E8",
      "secondary_color": "#34A853",
      "font_stack": "Inter, sans-serif",
      "logo_url": "https://mypilotpost.com/assets/logo.png"
    },
    "slides": [
      { "slot_id": "cover", "text_anchor": "headline" },
      { "slot_id": "slide_2", "text_anchor": "body_paragraph_1" }
    ],
    "animation_preset": "fade_slide"
  }
}
```

---

## 3. POST /api/customer/studio/campaign

Generates a multi-post content funnel (Awareness, Consideration, Conversion, Social Proof).

### Request
* **Method**: `POST`
* **Path**: `/api/customer/studio/campaign`
* **Headers**:
  * `Authorization: Bearer <JWT>`
  * `Content-Type: application/json`

### Response
* **Content-Type**: `application/json`
* **Status**: `200 OK`
* **JSON Schema**: Each generated card contains its corresponding `layout_manifest`.

#### Example Response
```json
{
  "campaign_name": "Summer Launch",
  "campaign_summary": "Launch campaign focusing on new platform features...",
  "cards": [
    {
      "id": "camp_0",
      "title": "Summer Launch — Awareness 1",
      "content_type": "social",
      "platform": "instagram",
      "caption": "HOOK: ... STORY: ... CTA: ...",
      "hook": "Awareness Hook...",
      "cta": "Sign up today",
      "hashtags": ["#launch"],
      "format": "single_image",
      "post_type": "awareness",
      "layout_manifest": {
        "template_id": "tpl_feed_generic_default",
        "brand_overrides": {
          "primary_color": "#1A73E8",
          "secondary_color": "#34A853",
          "font_stack": "Inter",
          "logo_url": "https://mypilotpost.com/assets/logo.png"
        },
        "slides": [
          { "slot_id": "slide_1", "text_anchor": "headline" }
        ],
        "animation_preset": "fade_slide"
      }
    }
  ]
}
```

---

## 4. GET /api/customer/media/suggestions (Extended)

Queries the visual intelligence providers (Pexels, Unsplash, Pixabay) to suggest media matching multiple templates slots requirements in parallel, applying industry keyword guardrails and aspect ratio filtering.

### Request
* **Method**: `GET`
* **Path**: `/api/customer/media/suggestions`
* **Headers**:
  * `Authorization: Bearer <JWT>`
  * `Content-Type: application/json`
* **Query Parameters / Request Body**:
  * `slots` (Array of Objects, Required):
    * `slot_id` (String): ID of the slot
    * `slot_type` (String): e.g. `hero`, `body`, `cta`, `background_texture`, `product_showcase`, `human_element`, `cover`, `icon_support`
    * `query` (String): Sourcing keyword query
    * `required_aspect_ratio` (String): Target aspect ratio (e.g. `"4:5"`, `"16:9"`, `"1:1"`, `"9:16"`)
    * `min_width` (Integer): Quality floor width constraint
    * `min_height` (Integer): Quality floor height constraint

#### Example Request Payload
```json
{
  "slots": [
    {
      "slot_id": "cover",
      "slot_type": "hero",
      "query": "flight cockpit",
      "required_aspect_ratio": "4:5",
      "min_width": 1080,
      "min_height": 1350
    },
    {
      "slot_id": "slide_2",
      "slot_type": "body",
      "query": "minimalist abstract background",
      "required_aspect_ratio": "4:5",
      "min_width": 1080,
      "min_height": 1350
    }
  ]
}
```

### Response
* **Content-Type**: `application/json`
* **Status**: `200 OK`
* **JSON Schema**: Returns a dictionary mapping each `slot_id` to its assigned, aspect-ratio-compliant, and color-calibrated image data.
  * `image_url` (String): Image asset source URL
  * `author` (String): Original photographer
  * `dimensions` (Object): Width and height of source
  * `palette` (Object): Chroma-contrast verified color kit
    * `dominant` (String): Primary layout tint HEX
    * `accent` (String): Contrasting helper HEX
    * `background` (String): Recommended canvas background
    * `text_contrast` (String): Foreground copy contrast tint (`#FFFFFF` or `#000000`)

#### Example Response
```json
{
  "cover": {
    "image_url": "https://images.pexels.com/photos/101/original.jpg?w=1600",
    "author": "Flight Expert",
    "dimensions": {
      "width": 1600,
      "height": 1200
    },
    "palette": {
      "dominant": "#2A3B4C",
      "accent": "#F4A261",
      "background": "#1A2A3A",
      "text_contrast": "#FFFFFF"
    }
  },
  "slide_2": {
    "image_url": "https://images.pexels.com/photos/102/original.jpg?w=1600",
    "author": "Sky Photographer",
    "dimensions": {
      "width": 1600,
      "height": 1200
    },
    "palette": {
      "dominant": "#1E2A38",
      "accent": "#E0A96D",
      "background": "#121A24",
      "text_contrast": "#FFFFFF"
    }
  }
}
```

---

## 5. GET /api/customer/templates (NEW)

Lists all registered visual templates in the repository.

### Request
* **Method**: `GET`
* **Path**: `/api/customer/templates`
* **Headers**:
  * `Authorization: Bearer <JWT>`
* **Query Filters**:
  * `format` (String, Optional): e.g., `feed_post`, `carousel`, `story`
  * `intent` (String, Optional): e.g., `awareness`, `education`, `authority`
  * `platform` (String, Optional): e.g., `instagram`, `linkedin`, `facebook`

### Response
* **Content-Type**: `application/json`
* **Status**: `200 OK`
* **JSON Schema**: Array of available template metadata objects.

#### Example Response
```json
[
  {
    "template_id": "tpl_feed_generic_default",
    "name": "Standard Single Post Layout",
    "format": "feed_post",
    "platforms": ["instagram", "facebook", "linkedin"],
    "intent": ["awareness", "general"],
    "pillars": ["general"],
    "preview_url": "https://mypilotpost.com/assets/previews/feed_generic_default.png"
  },
  {
    "template_id": "tpl_carousel_premium_brand_story",
    "name": "Premium Narrative Carousel",
    "format": "carousel",
    "platforms": ["instagram", "linkedin"],
    "intent": ["authority", "education"],
    "pillars": ["educational", "guides"],
    "preview_url": "https://mypilotpost.com/assets/previews/carousel_premium_brand_story.png"
  }
]
```

---

## 6. GET /api/customer/templates/:id (NEW)

Retrieves the complete JSON template schema structure (slides, components coordinates, constraints) by template ID.

### Request
* **Method**: `GET`
* **Path**: `/api/customer/templates/:template_id`
* **Headers**:
  * `Authorization: Bearer <JWT>`

### Response
* **Content-Type**: `application/json`
* **Status**: `200 OK`
* **JSON Schema**: The full layout configuration object.

#### Example Response
```json
{
  "template_id": "tpl_carousel_premium_brand_story",
  "name": "Premium Narrative Carousel",
  "format": "carousel",
  "platforms": ["instagram", "linkedin"],
  "intent": ["authority", "education"],
  "pillars": ["educational", "guides"],
  "animation_preset": "fade_slide",
  "slides": [
    {
      "slot_id": "cover",
      "slot_type": "hero",
      "required_aspect_ratio": "4:5",
      "min_width": 1080,
      "min_height": 1350,
      "components": [
        {
          "type": "image",
          "position": { "x": 0, "y": 0, "width": 1080, "height": 1350 }
        },
        {
          "type": "text",
          "max_chars": 80,
          "font_size": 48,
          "position": { "x": 100, "y": 200, "width": 880, "height": 300 }
        }
      ]
    }
  ]
}
```
