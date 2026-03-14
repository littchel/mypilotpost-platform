/* ======================================================
   myPilotPost Marketing Blog Engine
   Enterprise Static Frontend
   Uses: blog-data.json (NO WORKERS)
====================================================== */

(function () {
  "use strict";

  let ALL_POSTS = [];
  let CURRENT_PAGE = 1;
  const POSTS_PER_PAGE = 6;

  /* ======================================================
     INIT
  ====================================================== */

  document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
    initSearch();
    renderCategories();
    renderPosts();
  });

  async function loadData() {
    const res = await fetch("/blog/blog-data.json");
    const data = await res.json();
    ALL_POSTS = data.posts
      .filter(p => p.status === "published")
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  }

  /* ======================================================
     SEARCH
  ====================================================== */

  function initSearch() {
    const input = document.getElementById("blog-search");
    if (!input) return;

    input.addEventListener("input", e => {
      const value = e.target.value.toLowerCase();
      const filtered = ALL_POSTS.filter(post =>
        post.title.toLowerCase().includes(value) ||
        (post.excerpt || "").toLowerCase().includes(value)
      );
      CURRENT_PAGE = 1;
      renderPosts(filtered);
    });
  }

  /* ======================================================
     CATEGORY ACCORDION
  ====================================================== */

  function renderCategories() {
    const container = document.getElementById("category-tabs");
    if (!container) return;

    const categories = [
      "All",
      ...new Set(ALL_POSTS.map(p => p.category).filter(Boolean))
    ].slice(0, 6);

    container.innerHTML = "";

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "category-btn";
      btn.textContent = cat;

      btn.onclick = () => {
        CURRENT_PAGE = 1;
        if (cat === "All") renderPosts();
        else renderPosts(ALL_POSTS.filter(p => p.category === cat));
      };

      container.appendChild(btn);
    });
  }

  /* ======================================================
     PAGINATION
  ====================================================== */

  function renderPosts(posts = ALL_POSTS) {
    const container = document.getElementById("blog-list");
    const pagination = document.getElementById("pagination");
    if (!container) return;

    const start = (CURRENT_PAGE - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginated = posts.slice(start, end);

    container.innerHTML = paginated.map(post => `
      <article class="blog-card">
        <a href="/blog/post.html?slug=${post.slug}">
          <div class="blog-card__image">
            <img 
              src="${post.featured_image || '/images/placeholder.jpg'}"
              alt="${post.title}"
              loading="lazy"
            />
          </div>
          <div class="blog-card__content">
            <p class="blog-card__meta">
              ${formatDate(post.published_at)} · ${calculateReadingTime(post.content_html)} min read
            </p>
            <h4>${post.title}</h4>
            <p>${post.excerpt || ""}</p>
          </div>
        </a>
      </article>
    `).join("");

    renderPagination(posts.length);
  }

  function renderPagination(total) {
    const container = document.getElementById("pagination");
    if (!container) return;

    const totalPages = Math.ceil(total / POSTS_PER_PAGE);
    container.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === CURRENT_PAGE ? "active" : "";
      btn.onclick = () => {
        CURRENT_PAGE = i;
        renderPosts();
      };
      container.appendChild(btn);
    }
  }

  /* ======================================================
     SINGLE POST PAGE
  ====================================================== */

  window.loadSinglePost = async function () {
    await loadData();
    const slug = new URLSearchParams(window.location.search).get("slug");
    const post = ALL_POSTS.find(p => p.slug === slug);
    if (!post) return;

    document.title = `${post.title} | myPilotPost`;

    document.getElementById("title").textContent = post.title;
    document.getElementById("date").textContent = formatDate(post.published_at);
    document.getElementById("reading-time").textContent =
      calculateReadingTime(post.content_html) + " min read";

    document.getElementById("content").innerHTML = post.content_html;

    injectSEO(post);
    injectJSONLD(post);
  };

  /* ======================================================
     SEO
  ====================================================== */

  function injectSEO(post) {
    updateMeta("description", post.excerpt || "");
    updateMetaProperty("og:title", post.title);
    updateMetaProperty("og:description", post.excerpt || "");
    updateMetaProperty("og:type", "article");
    updateMetaProperty("og:image", post.featured_image || "");
  }

  function injectJSONLD(post) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "datePublished": post.published_at,
      "dateModified": post.updated_at || post.published_at,
      "author": {
        "@type": "Organization",
        "name": "myPilotPost"
      },
      "image": post.featured_image || "",
      "description": post.excerpt || ""
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  /* ======================================================
     HELPERS
  ====================================================== */

  function calculateReadingTime(html) {
    const text = html.replace(/<[^>]*>?/gm, "");
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200);
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function updateMeta(name, content) {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", name);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }

  function updateMetaProperty(property, content) {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("property", property);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }

})();
