async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

/* -------- BLOG HOME -------- */
async function loadBlogHome() {
  const posts = await fetchJSON("/api/blog/posts");
  const container = document.getElementById("post-list");

  posts.forEach(p => {
    const el = document.createElement("div");
    el.className = "post-card";
    el.innerHTML = `
      <h2><a href="/blog/post.html?slug=${p.slug}">${p.title}</a></h2>
      <p>${p.excerpt || ""}</p>
    `;
    container.appendChild(el);
  });
}

/* -------- SINGLE POST -------- */
async function loadSinglePost() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const post = await fetchJSON(`/api/blog/posts/${slug}`);

  document.getElementById("page-title").textContent = post.title;
  document.getElementById("title").textContent = post.title;
  document.getElementById("author").textContent = post.author_name || "myPilotPost";
  document.getElementById("date").textContent =
    new Date(post.published_at).toDateString();

  if (post.featured_image) {
    document.getElementById("featured-image").src = post.featured_image;
  }

  document.getElementById("content").innerHTML = post.content_html;
}

/* -------- CATEGORY -------- */
async function loadCategory() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  document.getElementById("heading").textContent = `Category: ${slug}`;

  const posts = await fetchJSON(`/api/blog/category/${slug}`);
  renderList(posts);
}

/* -------- TAG -------- */
async function loadTag() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  document.getElementById("heading").textContent = `Tag: ${slug}`;

  const posts = await fetchJSON(`/api/blog/tag/${slug}`);
  renderList(posts);
}

function renderList(posts) {
  const container = document.getElementById("post-list");
  posts.forEach(p => {
    const el = document.createElement("div");
    el.className = "post-card";
    el.innerHTML = `
      <h2><a href="/blog/post.html?slug=${p.slug}">${p.title}</a></h2>
      <p>${p.excerpt || ""}</p>
    `;
    container.appendChild(el);
  });
}
