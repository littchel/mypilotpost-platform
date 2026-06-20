/**
 * WordPress eCommerce (WooCommerce) Platform Adapter
 * Standardized Contract V1
 */

export async function publish({ content, connection, env }) {
  const { text, title, media } = content;
  const { access_token, metadata } = connection;

  // Resolve Store URL
  const storeUrl = metadata?.store_url || "https://your-wordpress-site.com";

  // Auth Header preparation
  const authHeader = (access_token.startsWith("Basic ") || access_token.startsWith("Bearer "))
    ? access_token
    : `Basic ${access_token}`;

  // Map post media links to WooCommerce format
  const images = (media || [])
    .filter(m => m.preview_url)
    .map(m => ({ src: m.preview_url }));

  console.log(`[WOOCOMMERCE_PUBLISH] Creating product on ${storeUrl}`);

  // Create product in WooCommerce via REST API v3
  const res = await fetch(`${storeUrl}/wp-json/wc/v3/products`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "User-Agent": "myPilotPost/1.0"
    },
    body: JSON.stringify({
      name: title || "New Product",
      type: "simple",
      status: "publish",
      description: text || "",
      regular_price: "0", // Default regular price
      images: images
    })
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.error(`[WOOCOMMERCE_PUBLISH_FAILED] status=${res.status} body=${JSON.stringify(data)}`);
    throw new Error(`WOOCOMMERCE_PUBLISH_FAILED: ${data.message || res.statusText}`);
  }

  return {
    success: true,
    external_id: data.id.toString(),
    url: data.permalink || `${storeUrl}/?post_type=product&p=${data.id}`
  };
}
