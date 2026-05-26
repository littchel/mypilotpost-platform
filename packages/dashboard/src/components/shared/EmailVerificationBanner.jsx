import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../lib/api/client";

const OTP_LENGTH = 6;

function OTPInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const digits = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);

  function handleKey(e, idx) {
    if (e.key === "Backspace") {
      const next = value.slice(0, idx) + value.slice(idx + 1);
      onChange(next);
      if (idx > 0) inputs.current[idx - 1]?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = value.slice(0, idx) + e.key + value.slice(idx + 1);
    onChange(next.slice(0, OTP_LENGTH));
    if (idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  return (
    <div className="otp-input-row" role="group" aria-label="6-digit verification code">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={el => inputs.current[idx] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          readOnly
          disabled={disabled}
          onKeyDown={e => handleKey(e, idx)}
          onFocus={e => e.target.select()}
          className={`otp-digit${digit ? " otp-digit--filled" : ""}`}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}

export default function EmailVerificationBanner({ onVerified }) {
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState(null);

  useEffect(() => {
    apiRequest("/api/customer/trust/status")
      .then(res => setStatus(res))
      .catch(() => {});
  }, []);

  if (!status || status.verified) return null;

  async function handleSend() {
    setSending(true);
    setSendMsg(null);
    try {
      const res = await apiRequest("/api/customer/trust/otp/send", { method: "POST" });
      if (res.already_verified) {
        setStatus(s => ({ ...s, verified: true }));
        onVerified?.();
        return;
      }
      setStatus(s => ({ ...s, otp_pending: true }));
      setSendMsg({ type: "success", text: "Code sent — check your inbox." });
      setShowModal(true);
    } catch {
      setSendMsg({ type: "error", text: "Failed to send code. Try again." });
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (code.length !== OTP_LENGTH) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await apiRequest("/api/customer/trust/otp/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (res.ok && res.verified) {
        setStatus(s => ({ ...s, verified: true }));
        setShowModal(false);
        onVerified?.();
      } else {
        setVerifyMsg({ type: "error", text: res.message || "Incorrect code." });
        setCode("");
      }
    } catch (err) {
      const code = err?.code || err?.error;
      let text = err?.message || "Verification failed.";
      if (code === "OTP_EXPIRED") {
        text = "Code expired — request a new one below.";
        setStatus(s => ({ ...s, otp_pending: false }));
      } else if (code === "OTP_LOCKED") {
        text = "Too many attempts — request a new code.";
        setStatus(s => ({ ...s, otp_pending: false }));
      }
      setVerifyMsg({ type: "error", text });
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <div className="email-verify-banner" role="alert" aria-live="polite">
        <i className="fas fa-shield-alt" aria-hidden="true"></i>
        <span className="email-verify-banner__text">
          {status.otp_pending
            ? <>A verification code was sent to <strong>{status.email}</strong> — check your inbox.</>
            : "Verify your email to unlock publishing, billing, and integrations."}
        </span>
        {sendMsg && (
          <span className={`email-verify-banner__msg email-verify-banner__msg--${sendMsg.type}`}>
            {sendMsg.text}
          </span>
        )}
        <button
          type="button"
          className="btn-verify-trigger"
          onClick={status.otp_pending ? () => setShowModal(true) : handleSend}
          disabled={sending}
        >
          {sending ? "Sending…" : status.otp_pending ? "Enter Code" : "Verify Email"}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Email verification">
          <div className="verify-modal">
            <button
              type="button"
              className="verify-modal__close"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
            <div className="verify-modal__icon">
              <i className="fas fa-envelope-open-text" aria-hidden="true"></i>
            </div>
            <h2 className="verify-modal__title">Check your email</h2>
            <p className="verify-modal__sub">
              We sent a 6-digit code to <strong>{status.email}</strong>.
              It expires in 15 minutes.
            </p>
            <OTPInput value={code} onChange={setCode} disabled={verifying} />
            {verifyMsg && (
              <p className={`verify-modal__feedback verify-modal__feedback--${verifyMsg.type}`}>
                {verifyMsg.text}
              </p>
            )}
            <button
              type="button"
              className="auth-btn-primary"
              onClick={handleVerify}
              disabled={verifying || code.length !== OTP_LENGTH}
            >
              {verifying ? "Verifying…" : "Confirm Code"}
            </button>
            <p className="verify-modal__resend">
              Didn't receive it?{" "}
              <button type="button" className="auth-forgot-btn" onClick={handleSend} disabled={sending}>
                {sending ? "Sending…" : "Resend code"}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
