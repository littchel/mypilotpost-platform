export async function getBlogAnalytics(request, env, auth, postId) {
  const { results } = await env.DB.prepare(`
    SELECT date, views
    FROM blog_post_analytics
    WHERE post_id = ?
    ORDER BY date ASC
  `).bind(postId).all();

  return new Response(JSON.stringify(results));
}
