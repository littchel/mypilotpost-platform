const fs = require("fs");

const SITE_URL = "https://www.mypilotpost.com";

const posts = JSON.parse(
  fs.readFileSync("../blog-data.json", "utf-8")
);

const rssItems = posts
  .filter(p => p.status === "published")
  .map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/blog/${post.slug}.html</link>
      <guid>${SITE_URL}/blog/${post.slug}.html</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt || ""}]]></description>
    </item>
  `)
  .join("");

const rss = `
<rss version="2.0">
  <channel>
    <title>myPilotPost Blog</title>
    <link>${SITE_URL}</link>
    <description>Marketing insights from myPilotPost</description>
    ${rssItems}
  </channel>
</rss>
`;

fs.writeFileSync("../rss.xml", rss);

console.log("✅ RSS feed generated.");
