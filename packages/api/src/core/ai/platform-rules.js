export const PLATFORM_RULES = {
  twitter: {
    maxChars: 280,
    hashtagStyle: "inline",
    hashtagLimit: 3,
  },

  linkedin: {
    maxChars: 3000,
    hashtagStyle: "end",
    hashtagLimit: 5,
  },

  instagram: {
    maxChars: 2200,
    hashtagStyle: "end",
    hashtagLimit: 10,
  },

  facebook: {
    maxChars: 5000,
    hashtagStyle: "minimal",
    hashtagLimit: 3,
  },

  /* BLOG IS NOT SOCIAL — DIFFERENT RULE SET */
  blog: {
    maxChars: null,              // long-form
    minWords: 600,
    maxWords: 2500,
    structure: [
      "title",
      "introduction",
      "headings",
      "subheadings",
      "conclusion"
    ],
    seoRequired: true
  }
};
