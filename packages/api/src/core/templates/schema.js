import { z } from "zod";

const SlotBase = {
  id: z.string().min(1),
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  zIndex: z.number().int().default(1),
};

export const TextSlotSchema = z.object({
  ...SlotBase,
  type: z.enum(["text", "cta"]),
  role: z.enum(["headline", "body", "label", "quote", "cta", "meta"]),
  contentKey: z.string().min(1),
  align: z.enum(["left", "center", "right"]),
  fontRole: z.enum(["heading", "body"]),
  fontWeight: z.union([z.literal(400), z.literal(600), z.literal(700)]),
  minFontSize: z.number().positive(),
  maxFontSize: z.number().positive(),
  lineHeight: z.number().positive(),
  maxLines: z.number().int().positive(),
  preferredLines: z.number().int().positive(),
  maxCharacters: z.number().int().positive(),
  colorToken: z.enum(["onPrimary", "onSecondary", "onSurface", "onAccent", "primary", "accent"]),
}).strict();

export const MediaSlotSchema = z.object({
  ...SlotBase,
  type: z.literal("media"),
  role: z.enum(["hero", "supporting"]),
  contentKey: z.string().min(1),
  aspectRatio: z.string().regex(/^\d+:\d+$/),
  fit: z.enum(["cover", "contain"]),
  focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict(),
  textSafeZones: z.array(z.object({
    x: z.number(), y: z.number(), width: z.number(), height: z.number(),
  }).strict()),
  subject: z.string().min(1),
  negativeSpace: z.enum(["left", "right", "top", "bottom", "none"]),
  collide: z.boolean().default(true),
  required: z.boolean().default(false),
}).strict();

export const BrandSlotSchema = z.object({
  ...SlotBase,
  type: z.enum(["logo", "shape"]),
  token: z.enum(["primary", "secondary", "accent", "surface", "logo"]).optional(),
  collide: z.boolean().default(false),
  radius: z.number().nonnegative().default(0),
}).strict();

export const SlotSchema = z.union([TextSlotSchema, MediaSlotSchema, BrandSlotSchema]);

export const SlideSchema = z.object({
  id: z.string().min(1),
  slots: z.array(SlotSchema).min(1),
}).strict();

export const TemplateSchema = z.object({
  id: z.string().regex(/^mpp\.[a-z0-9_.]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  contentType: z.enum(["feed", "carousel", "story", "promotional"]),
  format: z.enum(["feed_post", "carousel", "story", "promotional"]),
  supportedFormats: z.array(z.enum(["feed_post", "carousel", "story", "promotional"])).min(1),
  status: z.enum(["candidate", "certified"]),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    aspectRatio: z.string(),
    orientation: z.enum(["square", "portrait", "landscape"]),
    safeArea: z.object({
      top: z.number().nonnegative(),
      right: z.number().nonnegative(),
      bottom: z.number().nonnegative(),
      left: z.number().nonnegative(),
    }).strict(),
  }).strict(),
  grid: z.object({
    margin: z.number().positive(),
    gutter: z.number().nonnegative(),
    columns: z.number().int().positive(),
  }).strict(),
  slides: z.array(SlideSchema).min(1),
  renderer: z.object({
    id: z.literal("canonical-satori"),
    version: z.literal(1),
    outputs: z.array(z.literal("png")).min(1),
  }).strict(),
  referenceImage: z.null(),
}).strict();

export function parseTemplate(template) {
  return TemplateSchema.safeParse(template);
}
