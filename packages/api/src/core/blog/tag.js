export async function getPostsByTag(request, env, slug) {
  const { results } = await env.DB.prepare(`
    SELECT
      p.id,
      p.title,
      p.slug,
      p.excerpt,
      p.featured_image,
      p.published_at
    FROM content_blog_posts p
    JOIN blog_post_taxonomies pt ON pt.post_id = p.id
    JOIN blog_taxonomies t ON t.id = pt.taxonomy_id
    WHERE
      t.type = 'tag'
      AND t.slug = ?
      AND p.status = 'published'
    ORDER BY p.published_at DESC
  `).bind(slug).all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
