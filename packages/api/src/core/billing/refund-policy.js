// packages/api/src/core/billing/refund-policy.js
//
// Pure policy engine — no DB, no side effects.
// Input: payment facts. Output: eligibility decision.
//
// Policy version 2026-v1:
//   Monthly initial  0–3 days  → 100%
//   Monthly initial  4–14 days → pro-rated (unused days / 30)
//   Monthly renewal            → not eligible
//   Annual  initial  0–14 days → 100%
//   Annual  renewal  0–14 days → 50%
//   Statutory override         → admin can approve outside policy

export const POLICY_VERSION = "2026-v1";

const MONTHLY_PERIOD_DAYS = 30;

/**
 * @param {object} params
 * @param {string|Date} params.payment_date  - ISO date or Date of the payment
 * @param {boolean}     params.is_renewal    - true if this is a renewal, false if initial
 * @param {"monthly"|"annual"} params.interval
 * @param {number}      params.amount        - original payment amount in cents
 * @returns {{ eligible: boolean, percent: number, refund_amount: number, reason: string, policy_version: string }}
 */
export function computeRefundEligibility({ payment_date, is_renewal, interval, amount }) {
  const paidAt     = new Date(payment_date).getTime();
  const daysSince  = Math.floor((Date.now() - paidAt) / (1000 * 60 * 60 * 24));

  if (interval === "monthly") {
    if (is_renewal) {
      return ineligible("Monthly renewals are not eligible for refunds.");
    }

    if (daysSince <= 3) {
      return eligible(100, amount, `Initial monthly payment — ${daysSince} day(s) old (≤3). Full refund.`);
    }

    if (daysSince <= 14) {
      const daysRemaining  = MONTHLY_PERIOD_DAYS - daysSince;
      const refund_amount  = Math.round((daysRemaining / MONTHLY_PERIOD_DAYS) * amount);
      const percent        = Math.round((refund_amount / amount) * 100);
      return eligible(
        percent,
        refund_amount,
        `Initial monthly payment — ${daysSince} day(s) old. Pro-rated: ${daysRemaining} unused days of ${MONTHLY_PERIOD_DAYS}.`
      );
    }

    return ineligible(`Initial monthly payment — ${daysSince} day(s) old. Beyond 14-day window.`);
  }

  if (interval === "annual") {
    if (!is_renewal) {
      if (daysSince <= 14) {
        return eligible(100, amount, `Initial annual payment — ${daysSince} day(s) old (≤14). Full refund.`);
      }
      return ineligible(`Initial annual payment — ${daysSince} day(s) old. Beyond 14-day window.`);
    }

    // Annual renewal
    if (daysSince <= 14) {
      const refund_amount = Math.round(amount * 0.5);
      return eligible(50, refund_amount, `Annual renewal — ${daysSince} day(s) old (≤14). 50% refund.`);
    }

    return ineligible(`Annual renewal — ${daysSince} day(s) old. Beyond 14-day window.`);
  }

  return ineligible(`Unknown billing interval: ${interval}.`);
}

function eligible(percent, refund_amount, reason) {
  return { eligible: true, percent, refund_amount, reason, policy_version: POLICY_VERSION };
}

function ineligible(reason) {
  return { eligible: false, percent: 0, refund_amount: 0, reason, policy_version: POLICY_VERSION };
}
