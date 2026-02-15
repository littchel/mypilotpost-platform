/**
 * Abstract email sender
 * Swap providers without touching lifecycle logic
 */
export async function sendEmail({ to, subject, html }) {
  // Example: Resend, Postmark, SES, SendGrid
  // MUST throw on failure

  console.log("[EMAIL]", { to, subject });
  return { provider: "stub", ref: crypto.randomUUID() };
}
