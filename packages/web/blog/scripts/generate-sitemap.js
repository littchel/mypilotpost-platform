const fs = require("fs");

const SITE_URL = "https://www.mypilotpost.com";

const posts = JSON.parse(
  fs.readFileSync("../blog-data.json", "utf-8")
);

const urls = posts
  .filter(p => p.status === "published")
  .map(post => `
    <url>
      <loc>${SITE_URL}/blog/${post.slug}.html</loc>
      <lastmod>${post.updated_at || post.published_at}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
  `)
  .join("");

const sitemap = `
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/resources.html</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>
`;

fs.writeFileSync("../sitemap.xml", sitemap);

console.log("✅ Sitemap generated.");
