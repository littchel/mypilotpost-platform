export async function getPost(request, env, slug) {
  const post = await env.DB.prepare(`
    SELECT
      id,
      title,
      slug,
      excerpt,
      content_html,
      featured_image,
      author_name,
      published_at
    FROM content_blog_posts
    WHERE slug = ?
      AND status = 'published'
    LIMIT 1
  `).bind(slug).first();

  if (!post) {
    return new Response(
      JSON.stringify({ error: "Post not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(post), {
    headers: { "Content-Type": "application/json" }
  });
}
