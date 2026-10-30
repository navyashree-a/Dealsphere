import { useEffect, useId, useRef, useState } from "react";
import Icon from "../components/Icon";
import {
  COUNTRIES,
  OTP_LENGTH,
  RESEND_SECONDS,
  isOtpDemo,
  maskPhone,
  normalisePhone,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
} from "./whatsappOtp";

// "Continue with WhatsApp": phone number -> 6-digit code -> signed in.
// See whatsappOtp.js for the backend contract and the labelled demo mode.
function WhatsAppOtpLogin({ onSuccess, mode = "signin" }) {
  const id = useId();
  const [step, setStep] = useState("closed"); // closed | phone | code
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeRef = useRef(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0];

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const sendCode = async (target) => {
    setBusy(true);
    setError("");
    try {
      const result = await sendWhatsAppOtp(target);
      setPhone(target);
      setDemoCode(result.demoCode || "");
      setCode("");
      setStep("code");
      setSecondsLeft(RESEND_SECONDS);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (event) => {
    event.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (!selectedCountry.pattern.test(digits)) {
      setError(`Enter a valid ${selectedCountry.hint}.`);
      return;
    }
    sendCode(normalisePhone(country, digits));
  };

  const verify = async (value) => {
    if (busy) return;
    if (value.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = await verifyWhatsAppOtp(phone, value);
      onSuccess(user);
    } catch (verifyError) {
      setError(verifyError.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(value);
    setError("");
    if (value.length === OTP_LENGTH) verify(value); // auto-submit when complete
  };

  if (step === "closed") {
    return (
      <button type="button" className="wa-btn" onClick={() => setStep("phone")}>
        <span className="wa-btn__icon" aria-hidden="true">
          <Icon name="message" size={16} />
        </span>
        {mode === "signup" ? "Sign up with WhatsApp" : "Continue with WhatsApp"}
      </button>
    );
  }

  return (
    <div className="wa-otp">
      <div className="wa-otp__head">
        <span className="wa-btn__icon" aria-hidden="true">
          <Icon name="message" size={16} />
        </span>
        <strong>{step === "phone" ? "Sign in with WhatsApp" : "Enter your code"}</strong>
        <button
          type="button"
          className="wa-otp__close"
          onClick={() => {
            setStep("closed");
            setError("");
          }}
          aria-label="Close WhatsApp sign-in"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {step === "phone" ? (
        <form className="wa-otp__form" onSubmit={submitPhone} noValidate>
          <label htmlFor={`${id}-number`} className="field-label">WhatsApp number</label>
          <div className="wa-otp__phone">
            <label htmlFor={`${id}-country`} className="sr-only">Country code</label>
            <select id={`${id}-country`} className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              id={`${id}-number`}
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={selectedCountry.hint}
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setError("");
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-msg`}
              autoFocus
            />
          </div>
          <p className="wa-otp__hint">We'll send a {OTP_LENGTH}-digit code to this number on WhatsApp.</p>
          <button type="submit" className="btn btn--lime btn--block" disabled={busy}>
            {busy ? "Sending code…" : "Send code"}
          </button>
        </form>
      ) : (
        <form className="wa-otp__form" onSubmit={(e) => { e.preventDefault(); verify(code); }} noValidate>
          <p className="wa-otp__sent">
            Code sent to <strong>{maskPhone(phone)}</strong>
            <button type="button" className="link-btn" onClick={() => { setStep("phone"); setError(""); }}>
              Change number
            </button>
          </p>

          {demoCode && (
            <p className="notice notice--lime wa-otp__demo" role="status">
              <Icon name="info" size={16} />
              <span>
                <strong>Demo — no WhatsApp message was sent.</strong> Use code{" "}
                <span className="wa-otp__demo-code">{demoCode}</span>. A real backend is needed to send codes.
              </span>
            </p>
          )}

          <label htmlFor={`${id}-code`} className="field-label">{OTP_LENGTH}-digit code</label>
          <input
            id={`${id}-code`}
            ref={codeRef}
            className="input wa-otp__code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            placeholder={"•".repeat(OTP_LENGTH)}
            value={code}
            onChange={onCodeChange}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-msg`}
          />
          <button type="submit" className="btn btn--lime btn--block" disabled={busy || code.length !== OTP_LENGTH}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <button
            type="button"
            className="link-btn wa-otp__resend"
            disabled={secondsLeft > 0 || busy}
            onClick={() => sendCode(phone)}
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
        </form>
      )}

      <p id={`${id}-msg`} className="wa-otp__error" role="alert">
        {error}
      </p>
      {isOtpDemo() && step === "phone" && (
        <p className="wa-otp__hint">Demo mode: no message will actually be sent.</p>
      )}
    </div>
  );
}

export default WhatsAppOtpLogin;
