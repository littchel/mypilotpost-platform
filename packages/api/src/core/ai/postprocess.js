/**
 * AI POST-PROCESSOR — v1
 * Enforces platform & content correctness AFTER AI generation
 * AUTHORITATIVE • SIDE-EFFECT FREE
 */

import { SOCIAL_RULES, BLOG_RULES } from "./rules.js";

/* ===========================
   SOCIAL POST HARDENING
=========================== */
export function postProcessSocial({
  platform,
  content,
  hashtags = [],
  allow_emojis = true
}) {
  const rules = SOCIAL_RULES[platform];
  if (!rules) return { content, hashtags };

  let finalContent = content.trim();

  /* --- CHARACTER LIMIT --- */
  if (finalContent.length > rules.max_chars) {
    finalContent = finalContent.slice(0, rules.max_chars - 3) + "...";
  }

  /* --- EMOJI ENFORCEMENT --- */
  if (!rules.emojis.allowed) {
    finalContent = finalContent.replace(
      /([\u231A-\uD83E\uDDFF])/g,
      ""
    );
  }

  /* --- HASHTAG LIMIT --- */
  let finalHashtags = [];
  if (rules.hashtags.allowed && hashtags.length) {
    finalHashtags = hashtags.slice(0, rules.hashtags.max);
  }

  /* --- LINK REMOVAL --- */
  if (!rules.links.allowed) {
    finalContent = finalContent.replace(/https?:\/\/\S+/g, "");
  }

  return {
    content: finalContent.trim(),
    hashtags: finalHashtags
  };
}

/* ===========================
   BLOG ARTICLE HARDENING
=========================== */
export function postProcessBlog({
  title,
  body,
  primary_keyword
}) {
  let finalTitle = title.trim();
  let finalBody = body.trim();

  /* --- TITLE LENGTH --- */
  if (finalTitle.length > BLOG_RULES.seo.title_max) {
    finalTitle =
      finalTitle.slice(0, BLOG_RULES.seo.title_max - 3) + "...";
  }

  /* --- KEYWORD STUFFING GUARD --- */
  const keywordRegex = new RegExp(primary_keyword, "gi");
  const matches = finalBody.match(keywordRegex) || [];
  const density = (matches.length / finalBody.split(" ").length) * 100;

  if (density > BLOG_RULES.seo.keyword_density_max) {
    finalBody = finalBody.replace(
      keywordRegex,
      (match, offset) => (offset % 2 === 0 ? match : "")
    );
  }

  /* --- H2 SAFETY --- */
  if (BLOG_RULES.headings.require_h2 && !finalBody.includes("## ")) {
    finalBody = `## Overview\n\n${finalBody}`;
  }

  return {
    title: finalTitle,
    body: finalBody
  };
}
