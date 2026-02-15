export async function publishScheduledBlogPosts(env) {
  await env.DB.prepare(`
    UPDATE content_blog_posts
    SET status = 'published',
        published_at = publish_at
    WHERE status = 'draft'
      AND publish_at IS NOT NULL
      AND publish_at <= CURRENT_TIMESTAMP
  `).run();
}
