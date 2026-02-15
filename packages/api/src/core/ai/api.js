import { generateContent } from "./generator.js";

export async function generateAIContent(request, env, session) {
  const body = await request.json();
  const { brand_id, content_type, platform, context } = body;

  if (!brand_id || !content_type || !context) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400 }
    );
  }

  const result = await generateContent(env, {
    brandId: brand_id,
    contentType: content_type,
    platform,
    context,
  });

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
