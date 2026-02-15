export async function listRevisions(request, env, auth, postId) {
  const { results } = await env.DB.prepare(`
    SELECT
      id,
      created_at,
      created_by
    FROM blog_post_revisions
    WHERE post_id = ?
    ORDER BY created_at DESC
  `).bind(postId).all();

  return new Response(JSON.stringify(results));
}

export async function restoreRevision(request, env, auth, revisionId) {
  await env.DB.prepare(`
    UPDATE content_blog_posts
    SET
      title = r.title,
      excerpt = r.excerpt,
      content_html = r.content_html,
      meta_title = r.meta_title,
      meta_description = r.meta_description,
      updated_at = CURRENT_TIMESTAMP
    FROM blog_post_revisions r
    WHERE r.id = ?
      AND content_blog_posts.id = r.post_id
  `).bind(revisionId).run();

  return new Response(JSON.stringify({ ok: true }));
}
