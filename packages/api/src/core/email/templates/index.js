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

function baseLayout(content, preheader = "") {
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
          <p style="margin:0;font-size:12px;color:#9090A0;">© ${new Date().getFullYear()} ${BRAND.name} · <a href="${BRAND.site_url}/privacy" style="color:${BRAND.color_primary};text-decoration:none;">Privacy</a> · <a href="${BRAND.site_url}/unsubscribe" style="color:${BRAND.color_primary};text-decoration:none;">Unsubscribe</a></p>
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

export function welcomeEmail({ first_name, app_url = BRAND.app_url }) {
  return {
    subject: `Welcome to ${BRAND.name} — Your Brand Intelligence Platform`,
    html: baseLayout(
      h1(`Welcome, ${first_name || "there"} 👋`) +
      p(`You've joined <strong>${BRAND.name}</strong> — the strategic brand intelligence platform built for modern businesses.`) +
      highlight("Your Brand DNA profile is ready to be built. The more you complete it, the smarter your recommendations become.") +
      p("Start by exploring your dashboard and running your first content audit.") +
      primaryButton("Go to Dashboard →", app_url),
      "Your brand intelligence journey starts now."
    ),
    text: `Welcome to ${BRAND.name}! Your dashboard is ready: ${app_url}`
  };
}

export function auditUnlockEmail({ first_name, brand_name, score, audit_url }) {
  return {
    subject: `Your Brand DNA Score™ is ${score}/100 — Full Report Ready`,
    html: baseLayout(
      h1(`Your ${brand_name} Brand Audit is Complete`) +
      p(`Hi ${first_name || "there"}, your <strong>Brand DNA Score™</strong> has been calculated.`) +
      highlight(`<div style="font-size:36px;font-weight:800;color:${BRAND.color_primary};">${score}<span style="font-size:18px;color:#9090A0;">/100</span></div><div style="font-size:13px;color:#9090A0;margin-top:4px;">Brand DNA Score™</div>`) +
      p("Your full strategic report includes a 12-week roadmap, SWOT analysis, and competitor benchmarking.") +
      primaryButton("View Full Report →", audit_url),
      `Your brand scored ${score}/100.`
    ),
    text: `Your Brand DNA Score™: ${score}/100. View report: ${audit_url}`
  };
}

export function teamInviteEmail({ inviter_name, brand_name, invite_url }) {
  return {
    subject: `${inviter_name} invited you to join ${brand_name} on ${BRAND.name}`,
    html: baseLayout(
      h1("You've been invited to collaborate") +
      p(`<strong>${inviter_name}</strong> has invited you to join the <strong>${brand_name}</strong> workspace on ${BRAND.name}.`) +
      p("Accept your invitation to start collaborating on content, approvals, and brand strategy.") +
      primaryButton("Accept Invitation →", invite_url),
      `${inviter_name} invited you to ${brand_name}.`
    ),
    text: `You've been invited to ${brand_name} on ${BRAND.name}. Accept here: ${invite_url}`
  };
}

export function approvalEmail({ content_title, approver_name, approval_url }) {
  return {
    subject: `Content pending your approval: "${content_title}"`,
    html: baseLayout(
      h1("Content Requires Your Approval") +
      p(`<strong>${approver_name}</strong>, a piece of content has been submitted for your review.`) +
      highlight(`"${content_title}"`) +
      p("Review and approve or request changes before it goes live.") +
      primaryButton("Review Content →", approval_url),
      `"${content_title}" is waiting for your approval.`
    ),
    text: `Content pending approval: "${content_title}". Review here: ${approval_url}`
  };
}

export function trialEndingEmail({ first_name, days_left, upgrade_url }) {
  return {
    subject: `Your ${BRAND.name} trial ends in ${days_left} day${days_left !== 1 ? "s" : ""}`,
    html: baseLayout(
      h1(`Your trial ends in ${days_left} day${days_left !== 1 ? "s" : ""}`) +
      p(`Hi ${first_name || "there"}, your free trial of ${BRAND.name} is coming to an end.`) +
      p("Upgrade now to keep access to your Brand DNA profile, strategic reports, and growth engine.") +
      primaryButton("Upgrade Now →", upgrade_url),
      `Your trial ends in ${days_left} days.`
    ),
    text: `Your ${BRAND.name} trial ends in ${days_left} days. Upgrade: ${upgrade_url}`
  };
}

export function reportDeliveryEmail({ first_name, report_title, report_url }) {
  return {
    subject: `Your report is ready: ${report_title}`,
    html: baseLayout(
      h1("Your Strategic Report is Ready") +
      p(`Hi ${first_name || "there"}, your report <strong>"${report_title}"</strong> has been generated and is ready to view.`) +
      p("This report includes executive KPI summaries, competitor benchmarking, and your 12-week strategic roadmap.") +
      primaryButton("View Report →", report_url),
      `Your report "${report_title}" is ready.`
    ),
    text: `Your report "${report_title}" is ready: ${report_url}`
  };
}

export function referralEmail({ first_name, referral_url, reward }) {
  return {
    subject: `Share ${BRAND.name} and earn ${reward}`,
    html: baseLayout(
      h1("Refer a Friend, Earn Rewards") +
      p(`Hi ${first_name || "there"}, you can earn <strong>${reward}</strong> for every person you refer to ${BRAND.name}.`) +
      highlight("Your unique referral link is ready to share.") +
      primaryButton("Share Your Link →", referral_url),
      `Refer a friend and earn ${reward}.`
    ),
    text: `Refer a friend to ${BRAND.name} and earn ${reward}: ${referral_url}`
  };
}
