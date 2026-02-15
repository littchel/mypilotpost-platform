export async function runLLM(env, prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq LLM failed: ${text}`);
  }

  const data = await res.json();

  return {
    output: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || null,
    model: data.model,
  };
}
