// packages/api/src/core/ai/quality.js
// myPilotPost — AI Quality Scoring v1
// AUTHORITATIVE • DETERMINISTIC • INTERNAL

import { SOCIAL_RULES, BLOG_RULES } from "./rules.js";

/* ===========================
   HELPERS
=========================== */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function wordCount(text) {
  return text.trim().split(/\s+/).length;
}

function hashtagCount(text) {
  return (text.match(/#[\w]+/g) || []).length;
}

function emojiCount(text) {
  return (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
}

/* ===========================
   SOCIAL QUALITY SCORE
=========================== */

export function scoreSocialPost({
  platform,
  content,
  hashtags = [],
  cta_present = false
}) {
  const rules = SOCIAL_RULES[platform];
  if (!rules) {
    return {
      score: 0,
      grade: "F",
      breakdown: { error: "Unsupported platform" }
    };
  }

  let score = 100;
  const breakdown = {};

  /* --- Length --- */
  if (content.length > rules.max_chars) {
    score -= 25;
    breakdown.length = "over_limit";
  } else {
    breakdown.length = "ok";
  }

  /* --- Hashtags --- */
  const hashCount = hashtags.length || hashtagCount(content);
  if (rules.hashtags.allowed) {
    if (hashCount > rules.hashtags.max) {
      score -= 10;
      breakdown.hashtags = "too_many";
    } else if (hashCount === 0) {
      score -= 5;
      breakdown.hashtags = "missing";
    } else {
      breakdown.hashtags = "ok";
    }
  }

  /* --- Emojis --- */
  if (!rules.emojis.allowed && emojiCount(content) > 0) {
    score -= 10;
    breakdown.emojis = "not_allowed";
  } else {
    breakdown.emojis = "ok";
  }

  /* --- CTA --- */
  if (!cta_present) {
    score -= 10;
    breakdown.cta = "missing";
  } else {
    breakdown.cta = "ok";
  }

  score = clamp(score, 0, 100);

  return {
    score,
    grade: scoreToGrade(score),
    breakdown
  };
}

/* ===========================
   BLOG QUALITY SCORE
=========================== */

export function scoreBlogArticle({
  title,
  body,
  primary_keyword
}) {
  let score = 100;
  const breakdown = {};

  const words = wordCount(body);

  /* --- Word Count --- */
  if (words < 500) {
    score -= 20;
    breakdown.length = "too_short";
  } else {
    breakdown.length = "ok";
  }

  /* --- Keyword Presence --- */
  const keywordRegex = new RegExp(primary_keyword, "gi");
  const matches = body.match(keywordRegex) || [];

  if (matches.length === 0) {
    score -= 30;
    breakdown.keyword = "missing";
  } else {
    breakdown.keyword = "ok";
  }

  /* --- Structure --- */
  if (!body.includes("## ")) {
    score -= 15;
    breakdown.structure = "missing_h2";
  } else {
    breakdown.structure = "ok";
  }

  /* --- Title Quality --- */
  if (title.length > BLOG_RULES.seo.title_max) {
    score -= 10;
    breakdown.title = "too_long";
  } else {
    breakdown.title = "ok";
  }

  score = clamp(score, 0, 100);

  return {
    score,
    grade: scoreToGrade(score),
    breakdown
  };
}

/* ===========================
   GRADE MAPPER
=========================== */

function scoreToGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
