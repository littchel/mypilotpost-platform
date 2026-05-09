/**
 * Abstract email sender
 * Swap providers without touching lifecycle logic
 */
export async function sendEmail({ to, subject, html }) {
  // Example: Resend, Postmark, SES, SendGrid
  // MUST throw on failure

  console.info(`[SERVICE:EMAIL] Sending to ${to} | Subject: ${subject}`);
  return { provider: "stub", ref: crypto.randomUUID() };
}
