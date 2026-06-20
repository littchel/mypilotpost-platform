/**
 * WordPress Platform Adapter
 * Standardized Contract V1
 */

export async function publish({ content, connection, env }) {
  const { text, title } = content;
  const { access_token, metadata } = connection;

  // 1. Resolve Blog URL
  const blogUrl = metadata?.blog_url || "https://your-wordpress-site.com";

  const authHeader = (access_token.startsWith("Basic ") || access_token.startsWith("Bearer "))
    ? access_token
    : `Bearer ${access_token}`;

  // 2. Publish via REST API
  const res = await fetch(`${blogUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: title || "New Post from myPilotPost",
      content: text,
      status: "publish"
    })
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`WORDPRESS_PUBLISH_FAILED: ${data.message || res.statusText}`);
  }

  return {
    success: true,
    external_id: data.id,
    url: data.link
  };
}
