export async function saveTaxonomies(request, env, auth, postId) {
  const { categories = [], tags = [] } = await request.json();

  await env.DB.prepare(`
    DELETE FROM blog_post_taxonomies WHERE post_id = ?
  `).bind(postId).run();

  for (const name of [...categories, ...tags]) {
    const type = categories.includes(name) ? "category" : "tag";
    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const taxonomy =
      await env.DB.prepare(`
        INSERT OR IGNORE INTO blog_taxonomies (id, type, name, slug)
        VALUES (lower(hex(randomblob(16))), ?, ?, ?)
      `).bind(type, name, slug).run();

    const row =
      await env.DB.prepare(`SELECT id FROM blog_taxonomies WHERE slug = ?`)
        .bind(slug)
        .first();

    await env.DB.prepare(`
      INSERT INTO blog_post_taxonomies (post_id, taxonomy_id)
      VALUES (?, ?)
    `).bind(postId, row.id).run();
  }

  return new Response(JSON.stringify({ ok: true }));
}
