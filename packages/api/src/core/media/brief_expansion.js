import { trackedRunLLM } from "../ai/ai_client.js";

/**
 * Expand a batch of post captions/ideas into structured visual briefs.
 * Accepts: { batch, brand, env, brand_id }
 * Returns: Array of briefs: [{ postId, search_queries: [...], visual_description, mood_tags: [...] }]
 */
export async function expandVisualBriefs({ batch, brand, env, brand_id }) {
  if (!batch || !batch.length) return [];

  const prompt = `You are a visual content director. Convert the following social media post titles/ideas into structured visual briefs.

POSTS BATCH:
${batch.map((p, i) => `[Post ID: ${i}]
Title/Idea: ${p.title}
Caption: ${p.caption}`).join('\n\n')}

For each post, output:
1. "search_queries": Array of 3 distinct stock-photo search queries. 
   - 1st: Broad/Direct (e.g., "modern office workspace")
   - 2nd: Emotional/Metaphorical (e.g., "ambitious worker looking out window")
   - 3rd: Minimal/Environmental (e.g., "minimal design desk flatlay")
   Note: Keep search terms simple (2-4 words) so stock libraries find matches. Do not use quotes or punctuation.
2. "visual_description": A 12-to-18 word highly detailed visual description of the ideal matching scene, lighting, and composition.
3. "mood_tags": Array of 3 mood keywords (e.g., ["focus", "clean", "professional"]).

Return ONLY this JSON object:
{
  "briefs": [
    {
      "postId": 0,
      "search_queries": ["query1", "query2", "query3"],
      "visual_description": "visual scene description narrative",
      "mood_tags": ["mood1", "mood2", "mood3"]
    }
  ]
}

Respond with valid JSON only. No markdown.`;

  try {
    const res = await trackedRunLLM(env, {
      brand: brand || {},
      prompt,
      brand_id,
      user_id: null,
      content_type: "studio_brief_expansion",
      options: { mode: 'deep', systemPromptType: 'social', model: 'openai/gpt-oss-120b' }
    });

    return res?.briefs || [];
  } catch (err) {
    console.error('[BRIEF EXPANSION ERROR]', err?.message);
    return [];
  }
}
