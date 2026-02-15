// myPilotPost v1 — Campaigns & Emails API CRUD Stubs
// Cloudflare Workers + D1 compatible
// Canon: storage + wiring only (no automation, no sending)

import { nanoid } from 'nanoid';

export async function handleCampaigns(req, env) {
  const url = new URL(req.url);
  const brandId = req.headers.get('X-Brand-Id');
  if (!brandId) return json({ error: 'missing brand' }, 400);

  if (req.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM campaigns WHERE brand_id = ? ORDER BY created_at DESC`
    ).bind(brandId).all();
    return json({ campaigns: results });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const id = nanoid();
    await env.DB.prepare(`
      INSERT INTO campaigns (id, brand_id, name, objective, channel, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `).bind(id, brandId, body.name, body.objective, body.channel).run();
    return json({ id });
  }

  return json({ error: 'method not allowed' }, 405);
}

export async function handleCampaignContent(req, env, campaignId) {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const body = await req.json();
  const id = nanoid();

  await env.DB.prepare(`
    INSERT INTO campaign_content (id, campaign_id, content_id, content_type)
    VALUES (?, ?, ?, ?)
  `).bind(id, campaignId, body.content_id, body.content_type).run();

  return json({ id });
}

// ---------------- EMAILS ----------------

export async function handleEmailCampaigns(req, env) {
  const url = new URL(req.url);
  const brandId = req.headers.get('X-Brand-Id');
  if (!brandId) return json({ error: 'missing brand' }, 400);

  if (req.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM email_campaigns WHERE brand_id = ? ORDER BY created_at DESC`
    ).bind(brandId).all();
    return json({ campaigns: results });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const id = nanoid();
    await env.DB.prepare(`
      INSERT INTO email_campaigns (id, brand_id, campaign_id, name, objective)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, brandId, body.campaign_id ?? null, body.name, body.objective).run();
    return json({ id });
  }

  return json({ error: 'method not allowed' }, 405);
}

export async function handleEmailMessages(req, env) {
  const brandId = req.headers.get('X-Brand-Id');
  if (!brandId) return json({ error: 'missing brand' }, 400);

  if (req.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM email_messages WHERE brand_id = ? ORDER BY created_at DESC`
    ).bind(brandId).all();
    return json({ messages: results });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const id = nanoid();
    await env.DB.prepare(`
      INSERT INTO email_messages (id, brand_id, campaign_id, template_id, subject, html, text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      brandId,
      body.campaign_id ?? null,
      body.template_id ?? null,
      body.subject,
      body.html,
      body.text
    ).run();
    return json({ id });
  }

  return json({ error: 'method not allowed' }, 405);
}

export async function handleEmailTemplates(req, env) {
  const brandId = req.headers.get('X-Brand-Id');
  if (!brandId) return json({ error: 'missing brand' }, 400);

  if (req.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM email_templates WHERE brand_id = ? ORDER BY created_at DESC`
    ).bind(brandId).all();
    return json({ templates: results });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const id = nanoid();
    await env.DB.prepare(`
      INSERT INTO email_templates (id, brand_id, name, subject, html, text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, brandId, body.name, body.subject, body.html, body.text).run();
    return json({ id });
  }

  return json({ error: 'method not allowed' }, 405);
}

// ---------------- HELPERS ----------------
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
