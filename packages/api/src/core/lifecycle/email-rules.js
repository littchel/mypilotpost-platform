// packages/api/src/core/lifecycle/email-rules.js
// 11 canonical lifecycle event rules.
// cooldown_hours: 0 = send every time, -1 = send only once ever.

export const EMAIL_RULES = {
  user_registered: {
    template:       "welcome",
    subject:        "Welcome to myPilotPost — Your brand command center is ready",
    cooldown_hours: -1,   // once ever
    category:       "transactional",
  },

  email_verified: {
    template:       "email_verified",
    subject:        "Email verified — you're all set",
    cooldown_hours: -1,
    category:       "transactional",
  },

  brand_created: {
    template:       "brand_created",
    subject:        "Your brand workspace is live 🎉",
    cooldown_hours: -1,
    category:       "transactional",
  },

  first_post_published: {
    template:       "first_post",
    subject:        "Your first post is live — this is just the beginning",
    cooldown_hours: -1,
    category:       "lifecycle",
  },

  content_published: {
    template:       "content_published",
    subject:        "Your content is live 📣",
    cooldown_hours: 2,
    category:       "activity",
  },

  approval_required: {
    template:       "approval",
    subject:        "Content is waiting for your approval",
    cooldown_hours: 1,
    category:       "transactional",
  },

  trial_expiring: {
    template:       "trial_ending",
    subject:        "Your myPilotPost trial ends soon",
    cooldown_hours: 24,
    category:       "billing",
  },

  plan_limit_hit: {
    template:       "upgrade_prompt",
    subject:        "You've reached your plan limit",
    cooldown_hours: 24,
    category:       "billing",
  },

  team_invite_sent: {
    template:       "team_invite",
    subject:        "You've been invited to collaborate on myPilotPost",
    cooldown_hours: 0,
    category:       "transactional",
  },

  churn_risk: {
    template:       "churn_prevention",
    subject:        "We noticed you haven't been active — can we help?",
    cooldown_hours: 72,
    category:       "lifecycle",
  },

  weekly_digest: {
    template:       "weekly_digest",
    subject:        "Your weekly brand performance summary",
    cooldown_hours: 168,  // 7 days
    category:       "digest",
  },
};
