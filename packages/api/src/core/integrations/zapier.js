export async function postToZapier(env, job) {
  const webhook = env.ZAPIER_WEBHOOK_URL;
  if (!webhook) throw new Error("Zapier webhook not configured");

  const payload = {
    job_id: job.id,
    platform: job.platform,
    brand_id: job.brand_id,
    content_type: job.content_type,
    content: job.payload,
    scheduled_at: job.scheduled_at,
  };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zapier error: ${text}`);
  }
}
