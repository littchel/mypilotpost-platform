import { getDB } from "../../lib/db.js";
import { PLATFORM_RULES } from "./platform-rules.js";
import { getBrandRules } from "./brand-rules.js";
import { buildPrompt } from "./prompt-builder.js";
import { runLLM } from "./llm-client.js";
import { writeBrandMemoryEvent } from "../brand/memory-writer.js";

export async function generateContent(env, {
  brandId,
  contentType,
  platform = null,
  context,
}) {
  const db = getDB(env);

  const brandRules = await getBrandRules(env, brandId);
  const platformRules = platform ? PLATFORM_RULES[platform] : null;

  const prompt = buildPrompt({
    contentType,
    platform,
    context,
    brandRules,
    platformRules,
  });

  const result = await runLLM(env, prompt);

  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO ai_generations (
      id,
      brand_id,
      content_type,
      platform,
      input_prompt,
      output,
      model,
      tokens_used
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    id,
    brandId,
    contentType,
    platform,
    prompt,
    result.output,
    result.model,
    result.tokens
  )
  .run();

  await writeBrandMemoryEvent(db, {
    brandId,
    eventType: "ai_content_generated",
    sourceEngine: "ai",
    entityType: contentType,
    entityId: id,
    snapshot: { platform },
  });

  return {
    id,
    output: result.output,
  };
}
