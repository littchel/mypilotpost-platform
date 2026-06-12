/**
 * myPilotPost — Platform Email System
 * PREMIUM • AGENCY-GRADE • TRANSACTIONAL-SAFE
 */

const BRAND = {
  name: "myPilotPost",
  color_primary: "#6C63FF",
  color_dark: "#0F0F1A",
  color_text: "#1A1A2E",
  logo_url: "https://mypilotpost.com/assets/logo.png",
  site_url: "https://mypilotpost.com",
  app_url: "https://app.mypilotpost.com"
};

const DEFAULT_UNSUB = `${BRAND.site_url}/unsubscribe`;

function baseLayout(content, preheader = "", unsubscribeUrl = DEFAULT_UNSUB) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F8;font-family:'Inter',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:${BRAND.color_dark};padding:28px 40px;text-align:center;">
          <img src="${BRAND.logo_url}" alt="${BRAND.name}" height="36" style="display:block;margin:0 auto 8px;">
          <div style="height:3px;background:linear-gradient(90deg,${BRAND.color_primary},#9C88FF);border-radius:2px;margin-top:16px;"></div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#F4F4F8;padding:24px 40px;text-align:center;border-top:1px solid #E8E8F0;">
          <p style="margin:0;font-size:12px;color:#9090A0;">© ${new Date().getFullYear()} ${BRAND.name} · <a href="${BRAND.site_url}/privacy" style="color:${BRAND.color_primary};text-decoration:none;">Privacy</a> · <a href="${unsubscribeUrl}" style="color:${BRAND.color_primary};text-decoration:none;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function primaryButton(text, url) {
  return `<a href="${url}" style="display:inline-block;background:${BRAND.color_primary};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin-top:24px;">${text}</a>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:${BRAND.color_text};">${text}</h1>`;
}

function p(text) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4A4A6A;">${text}</p>`;
}

function highlight(text) {
  return `<div style="background:#F0EEFF;border-left:4px solid ${BRAND.color_primary};padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;font-size:15px;color:${BRAND.color_text};font-weight:500;">${text}</div>`;
}

// ─── TEMPLATE EXPORTS ───────────────────────────────────────────

export function welcomeEmail({ first_name, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Welcome to ${BRAND.name} — Your Brand Intelligence Platform`,
    html: baseLayout(
      h1(`Welcome, ${first_name || "there"} 👋`) +
      p(`You've joined <strong>${BRAND.name}</strong> — the strategic brand intelligence platform built for modern businesses.`) +
      highlight("Your Brand DNA profile is ready to be built. The more you complete it, the smarter your recommendations become.") +
      p("Start by exploring your dashboard and running your first content audit.") +
      primaryButton("Go to Dashboard →", app_url),
      "Your brand intelligence journey starts now.",
      unsubscribe_url
    ),
    text: `Welcome to ${BRAND.name}! Your dashboard is ready: ${app_url}`
  };
}

export function auditUnlockEmail({ first_name, brand_name, score, audit_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Your Brand DNA Score™ is ${score}/100 — Full Report Ready`,
    html: baseLayout(
      h1(`Your ${brand_name} Brand Audit is Complete`) +
      p(`Hi ${first_name || "there"}, your <strong>Brand DNA Score™</strong> has been calculated.`) +
      highlight(`<div style="font-size:36px;font-weight:800;color:${BRAND.color_primary};">${score}<span style="font-size:18px;color:#9090A0;">/100</span></div><div style="font-size:13px;color:#9090A0;margin-top:4px;">Brand DNA Score™</div>`) +
      p("Your full strategic report includes a 12-week roadmap, SWOT analysis, and competitor benchmarking.") +
      primaryButton("View Full Report →", audit_url),
      `Your brand scored ${score}/100.`,
      unsubscribe_url
    ),
    text: `Your Brand DNA Score™: ${score}/100. View report: ${audit_url}`
  };
}

export function teamInviteEmail({ inviter_name, brand_name, invite_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `${inviter_name} invited you to join ${brand_name} on ${BRAND.name}`,
    html: baseLayout(
      h1("You've been invited to collaborate") +
      p(`<strong>${inviter_name}</strong> has invited you to join the <strong>${brand_name}</strong> workspace on ${BRAND.name}.`) +
      p("Accept your invitation to start collaborating on content, approvals, and brand strategy.") +
      primaryButton("Accept Invitation →", invite_url),
      `${inviter_name} invited you to ${brand_name}.`,
      unsubscribe_url
    ),
    text: `You've been invited to ${brand_name} on ${BRAND.name}. Accept here: ${invite_url}`
  };
}

export function approvalEmail({ content_title, approver_name, approval_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Content pending your approval: "${content_title}"`,
    html: baseLayout(
      h1("Content Requires Your Approval") +
      p(`<strong>${approver_name}</strong>, a piece of content has been submitted for your review.`) +
      highlight(`"${content_title}"`) +
      p("Review and approve or request changes before it goes live.") +
      primaryButton("Review Content →", approval_url),
      `"${content_title}" is waiting for your approval.`,
      unsubscribe_url
    ),
    text: `Content pending approval: "${content_title}". Review here: ${approval_url}`
  };
}

export function trialEndingEmail({ first_name, days_left, upgrade_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Your ${BRAND.name} trial ends in ${days_left} day${days_left !== 1 ? "s" : ""}`,
    html: baseLayout(
      h1(`Your trial ends in ${days_left} day${days_left !== 1 ? "s" : ""}`) +
      p(`Hi ${first_name || "there"}, your free trial of ${BRAND.name} is coming to an end.`) +
      p("Upgrade now to keep access to your Brand DNA profile, strategic reports, and growth engine.") +
      primaryButton("Upgrade Now →", upgrade_url),
      `Your trial ends in ${days_left} days.`,
      unsubscribe_url
    ),
    text: `Your ${BRAND.name} trial ends in ${days_left} days. Upgrade: ${upgrade_url}`
  };
}

export function reportDeliveryEmail({ first_name, report_title, report_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Your report is ready: ${report_title}`,
    html: baseLayout(
      h1("Your Strategic Report is Ready") +
      p(`Hi ${first_name || "there"}, your report <strong>"${report_title}"</strong> has been generated and is ready to view.`) +
      p("This report includes executive KPI summaries, competitor benchmarking, and your 12-week strategic roadmap.") +
      primaryButton("View Report →", report_url),
      `Your report "${report_title}" is ready.`,
      unsubscribe_url
    ),
    text: `Your report "${report_title}" is ready: ${report_url}`
  };
}

export function referralEmail({ first_name, referral_url, reward, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Share ${BRAND.name} and earn ${reward}`,
    html: baseLayout(
      h1("Refer a Friend, Earn Rewards") +
      p(`Hi ${first_name || "there"}, you can earn <strong>${reward}</strong> for every person you refer to ${BRAND.name}.`) +
      highlight("Your unique referral link is ready to share.") +
      primaryButton("Share Your Link →", referral_url),
      `Refer a friend and earn ${reward}.`,
      unsubscribe_url
    ),
    text: `Refer a friend to ${BRAND.name} and earn ${reward}: ${referral_url}`
  };
}

export function emailVerifiedEmail({ first_name, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "Email verified — you're all set",
    html: baseLayout(
      h1("Your email is verified ✓") +
      p(`Hi ${first_name || "there"}, your email address has been confirmed.`) +
      p(`You now have full access to ${BRAND.name} — including publishing, integrations, and billing.`) +
      primaryButton("Go to Dashboard →", app_url),
      "Your account is fully verified.",
      unsubscribe_url
    ),
    text: `Your email is verified. Access your dashboard: ${app_url}`
  };
}

export function firstPostEmail({ first_name, platform, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "Your first post is live — this is just the beginning",
    html: baseLayout(
      h1("Your first post is live 🚀") +
      p(`Congratulations ${first_name || "there"}! You just published your first piece of content${platform ? ` on <strong>${platform}</strong>` : ""}.`) +
      highlight("Every brand authority story starts with a single post. Yours just began.") +
      p("Keep the momentum — schedule your next post and watch your brand score climb.") +
      primaryButton("Schedule Next Post →", app_url),
      "Your first post is live.",
      unsubscribe_url
    ),
    text: `Your first post is live! Schedule your next one: ${app_url}`
  };
}

export function weeklyDigestEmail({ first_name, brand_name, score, posts_this_week, top_insight, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Your weekly brand performance summary — ${brand_name}`,
    html: baseLayout(
      h1(`${brand_name} — Weekly Summary`) +
      p(`Hi ${first_name || "there"}, here's your brand performance snapshot for the past 7 days.`) +
      highlight(
        `<table width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#9090A0;">Brand Score</td>
            <td style="padding:8px 0;font-size:18px;font-weight:700;color:#6C63FF;text-align:right;">${score || "—"}/100</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#9090A0;">Posts This Week</td>
            <td style="padding:8px 0;font-size:18px;font-weight:700;text-align:right;">${posts_this_week || 0}</td>
          </tr>
        </table>`
      ) +
      (top_insight ? p(`<strong>Top Insight:</strong> ${top_insight}`) : "") +
      primaryButton("View Full Report →", app_url),
      `Your ${brand_name} weekly summary is ready.`,
      unsubscribe_url
    ),
    text: `${brand_name} weekly: score ${score}/100, ${posts_this_week} posts. View report: ${app_url}`
  };
}

export function churnPreventionEmail({ first_name, days_inactive, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "We noticed you haven't been active — can we help?",
    html: baseLayout(
      h1(`We miss you, ${first_name || "there"} 👋`) +
      p(`It's been ${days_inactive || "a few"} days since your last activity on ${BRAND.name}.`) +
      p("Brand momentum is built through consistency. Even one post a week keeps your audience engaged.") +
      highlight("Your Brand DNA profile is ready and waiting. Pick up where you left off.") +
      primaryButton("Resume Your Brand →", app_url),
      "Come back and keep your brand momentum going.",
      unsubscribe_url
    ),
    text: `We miss you! Your brand dashboard is waiting: ${app_url}`
  };
}

export function brandCreatedEmail({ first_name, brand_name, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Your brand workspace is live — ${brand_name} 🎉`,
    html: baseLayout(
      h1(`${brand_name} is live!`) +
      p(`Hi ${first_name || "there"}, your brand workspace has been created and is ready to go.`) +
      p("Next step: complete your Brand DNA to unlock intelligent content recommendations tailored to your voice and market.") +
      primaryButton("Build Your Brand DNA →", `${app_url}?tab=brand-dna`),
      `${brand_name} workspace is ready.`,
      unsubscribe_url
    ),
    text: `${brand_name} workspace is live on ${BRAND.name}. Build your Brand DNA: ${app_url}`
  };
}

export function upgradePromptEmail({ first_name, limit_type, upgrade_url = `${BRAND.app_url}?tab=billing`, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "You've reached your plan limit",
    html: baseLayout(
      h1("You've hit your plan limit") +
      p(`Hi ${first_name || "there"}, you've reached the ${limit_type || "usage"} limit on your current plan.`) +
      p("Upgrade to keep creating, scheduling, and publishing without interruption.") +
      primaryButton("View Plans →", upgrade_url),
      "Upgrade to remove your limits.",
      unsubscribe_url
    ),
    text: `You've reached your ${limit_type || "usage"} limit. Upgrade: ${upgrade_url}`
  };
}

export function passwordResetEmail({ first_name, reset_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "Reset your myPilotPost password",
    html: baseLayout(
      h1("Password reset request") +
      p(`Hi ${first_name || "there"}, we received a request to reset your myPilotPost password.`) +
      p("This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email — your password won't change.") +
      primaryButton("Reset Password →", reset_url) +
      p(`<small style="color:#9090A0;">If the button doesn't work, copy this link: <a href="${reset_url}" style="color:#6C63FF;">${reset_url}</a></small>`),
      "Reset your myPilotPost password.",
      unsubscribe_url
    ),
    text: `Reset your password: ${reset_url} (expires in 1 hour)`
  };
}

export function passwordChangedEmail({ first_name, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "Your myPilotPost password was changed",
    html: baseLayout(
      h1("Your password was changed") +
      p(`Hi ${first_name || "there"}, your myPilotPost account password was successfully updated.`) +
      highlight("If you made this change, no action is needed.") +
      p(`If you did <strong>not</strong> make this change, your account may be compromised. Contact us immediately at <a href="mailto:security@mypilotpost.com" style="color:#6C63FF;">security@mypilotpost.com</a>.`) +
      primaryButton("Secure My Account →", `${BRAND.app_url}?tab=security`),
      "Your password was just changed.",
      unsubscribe_url
    ),
    text: `Your myPilotPost password was changed. If you didn't do this, contact security@mypilotpost.com immediately.`
  };
}

export function onboardingReminderEmail({ first_name, app_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: "Complete your brand setup — it takes 2 minutes",
    html: baseLayout(
      h1(`Your brand dashboard is waiting, ${first_name || "there"}`) +
      p(`You're one step away from unlocking your brand intelligence. Finish setting up your brand workspace to get personalized content recommendations.`) +
      highlight("Complete setup in 2 minutes to unlock your Brand DNA profile, growth engine, and content strategy.") +
      primaryButton("Complete My Setup →", `${app_url}/onboarding`),
      "Your brand setup is incomplete.",
      unsubscribe_url
    ),
    text: `Complete your brand setup on ${BRAND.name}: ${app_url}/onboarding`
  };
}

export function accountDeletionRequestedEmail({ first_name, scheduled_for, cancel_url, unsubscribe_url = DEFAULT_UNSUB }) {
  const date = scheduled_for
    ? new Date(scheduled_for).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "in 7 days";
  return {
    subject: "Account deletion scheduled — you have 7 days to cancel",
    html: baseLayout(
      h1("Account deletion scheduled") +
      p(`Hi ${first_name || "there"}, we've received your request to permanently delete your myPilotPost account.`) +
      highlight(`Your account and all associated data will be permanently deleted on <strong>${date}</strong>.`) +
      p("If you change your mind, you can cancel this request before then. After that date, this action cannot be undone.") +
      (cancel_url ? primaryButton("Cancel Deletion →", cancel_url) : "") +
      p(`<small style="color:#9090A0;">If you have questions, email <a href="mailto:privacy@mypilotpost.com" style="color:#6C63FF;">privacy@mypilotpost.com</a></small>`),
      "Account deletion scheduled.",
      unsubscribe_url
    ),
    text: `Your myPilotPost account deletion is scheduled for ${date}. To cancel: ${cancel_url || BRAND.app_url}`
  };
}

export function accountDeletedEmail({ first_name }) {
  return {
    subject: "Your myPilotPost account has been deleted",
    html: baseLayout(
      h1("Your account has been deleted") +
      p(`Hi ${first_name || "there"}, your myPilotPost account and all associated data have been permanently deleted as requested.`) +
      p("This action is final and cannot be undone. Your subscription (if any) has been cancelled.") +
      p(`If you'd like to start fresh in the future, you're welcome to create a new account at <a href="${BRAND.site_url}" style="color:#6C63FF;">${BRAND.site_url}</a>.`) +
      p(`<small style="color:#9090A0;">Questions? Email <a href="mailto:privacy@mypilotpost.com" style="color:#6C63FF;">privacy@mypilotpost.com</a></small>`),
      "Your account has been permanently deleted.",
      DEFAULT_UNSUB
    ),
    text: `Your myPilotPost account has been permanently deleted. Questions? Email privacy@mypilotpost.com`
  };
}

export function otpVerificationEmail({ first_name, otp, expires_minutes = 15, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `${otp} — Your myPilotPost verification code`,
    html: baseLayout(
      h1("Verify your email address") +
      p(`Hi ${first_name || "there"}, enter the code below to verify your email address.`) +
      highlight(`<div style="text-align:center;font-size:36px;font-weight:800;letter-spacing:8px;color:#6C63FF;">${otp}</div>`) +
      p(`<small style="color:#9090A0;">This code expires in <strong>${expires_minutes} minutes</strong>. Never share it with anyone.</small>`),
      `${otp} is your myPilotPost verification code.`,
      unsubscribe_url
    ),
    text: `Your myPilotPost verification code is: ${otp}. Expires in ${expires_minutes} minutes.`
  };
}

export function supportReplyEmail({ first_name, message_preview, thread_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Reply from myPilotPost Support`,
    html: baseLayout(
      h1("You have a new reply") +
      p(`Hi ${first_name || "there"}, our support team has replied to your request.`) +
      highlight(message_preview ? message_preview.slice(0, 280) : "Open the portal to read the full reply.") +
      p("Reply directly from your dashboard to continue the conversation.") +
      primaryButton("View Conversation →", thread_url),
      "Support has replied to your request.",
      unsubscribe_url
    ),
    text: `Support replied: ${message_preview || ""}\nView: ${thread_url}`
  };
}

export function ticketResolvedEmail({ first_name, subject_line, thread_url = BRAND.app_url, unsubscribe_url = DEFAULT_UNSUB }) {
  return {
    subject: `Your support request has been resolved`,
    html: baseLayout(
      h1("Your request is resolved ✓") +
      p(`Hi ${first_name || "there"}, we've marked your support request${subject_line ? ` "<strong>${subject_line}</strong>"` : ""} as resolved.`) +
      highlight("If you still need help, just reply and we'll reopen the conversation.") +
      primaryButton("View Conversation →", thread_url),
      "Your support request has been resolved.",
      unsubscribe_url
    ),
    text: `Your support request${subject_line ? ` "${subject_line}"` : ""} has been resolved. View: ${thread_url}`
  };
}

// Template registry — maps rule template keys → functions
export const TEMPLATE_REGISTRY = {
  welcome:          welcomeEmail,
  email_verified:   emailVerifiedEmail,
  brand_created:    brandCreatedEmail,
  first_post:       firstPostEmail,
  content_published: ({ first_name, app_url, unsubscribe_url = DEFAULT_UNSUB }) => ({
    subject: "Your content is live 📣",
    html: baseLayout(
      h1("Your content is live!") +
      p(`Hi ${first_name || "there"}, your post has been published successfully.`) +
      primaryButton("View Dashboard →", app_url || BRAND.app_url),
      "Your content just went live.",
      unsubscribe_url
    ),
    text: `Your content is live. View dashboard: ${app_url || BRAND.app_url}`
  }),
  approval:         approvalEmail,
  trial_ending:     trialEndingEmail,
  upgrade_prompt:   upgradePromptEmail,
  team_invite:      teamInviteEmail,
  churn_prevention:     churnPreventionEmail,
  weekly_digest:        weeklyDigestEmail,
  password_reset:             passwordResetEmail,
  password_changed:           passwordChangedEmail,
  onboarding_reminder:        onboardingReminderEmail,
  account_deletion_requested: accountDeletionRequestedEmail,
  otp_verification:           otpVerificationEmail,
  support_reply:              supportReplyEmail,
  ticket_resolved:            ticketResolvedEmail,
};
