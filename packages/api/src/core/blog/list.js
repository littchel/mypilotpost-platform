export async function listPosts(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT
      id,
      title,
      slug,
      excerpt,
      featured_image,
      author_name,
      published_at
    FROM content_blog_posts
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT 20
  `).all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
