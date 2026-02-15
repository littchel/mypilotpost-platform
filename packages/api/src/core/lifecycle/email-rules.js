export const EMAIL_RULES = {
  user_registered: {
    template: "welcome",
    subject: "Welcome to myPilotPost 🚀",
  },

  brand_created: {
    template: "brand_created",
    subject: "Your brand is live 🎉",
  },

  content_published: {
    template: "content_published",
    subject: "Your content is live 📣",
  },

  plan_limit_hit: {
    template: "upgrade_prompt",
    subject: "You’ve hit your plan limit",
  },

  churn_risk: {
    template: "churn_prevention",
    subject: "Need help getting results?",
  },
};
