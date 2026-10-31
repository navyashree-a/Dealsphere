// WhatsApp OTP sign-in service.
//
// The browser only talks to DealSphere's own backend (server/whatsappOtp.js),
// which:
//   POST {API}/otp/whatsapp/send    { phone }        -> 200 { expiresIn, demoCode? }
//   POST {API}/otp/whatsapp/verify  { phone, code }  -> 200 { name? } | 4xx { error }
// The backend makes the code, stores only a hash with an expiry, sends it
// through Pinnacle (WhatsApp Business) using the approved Authentication
// template, and rate-limits requests. The Pinnacle API key stays on the server
// - never put it in this frontend.
//
// {API} is "/api" (this site's backend) unless VITE_OTP_API_URL points
// elsewhere. When the backend runs locally without Pinnacle settings, it
// returns `demoCode` and the UI shows it as a labelled demo; the live site
// never does.

export const OTP_API_URL = ((import.meta.env.VITE_OTP_API_URL || "").trim() || "/api").replace(/\/$/, "");

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;

// Country codes offered in the phone step. Validation is a basic length check;
// the backend validates the number again.
export const COUNTRIES = [
  { code: "+91", label: "India (+91)", pattern: /^[6-9]\d{9}$/, hint: "10-digit mobile number" },
  { code: "+971", label: "UAE (+971)", pattern: /^5\d{8}$/, hint: "9-digit mobile number starting with 5" },
  { code: "+1", label: "US / Canada (+1)", pattern: /^\d{10}$/, hint: "10-digit number" },
  { code: "+44", label: "UK (+44)", pattern: /^7\d{9}$/, hint: "10-digit mobile number starting with 7" },
];

export const normalisePhone = (countryCode, number) => `${countryCode}${String(number).replace(/\D/g, "")}`;

// "+919876543210" -> "+91 ••••••3210". Matches the longest known country code
// first, so "+91" isn't confused with "+971" or misread as "+919".
export const maskPhone = (phone) => {
  const country = [...COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => phone.startsWith(c.code));
  const countryCode = country ? country.code : "";
  const rest = phone.slice(countryCode.length);
  return `${countryCode} ${"•".repeat(Math.max(0, rest.length - 4))}${rest.slice(-4)}`.trim();
};

const post = async (path, body) => {
  let response;
  try {
    response = await fetch(`${OTP_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the sign-in service. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
};

// Resolves with { demoCode? }. demoCode only comes from a local backend
// without Pinnacle settings.
export async function sendWhatsAppOtp(phone) {
  const data = await post("/otp/whatsapp/send", { phone });
  return { demoCode: data.demoCode || "" };
}

// Resolves with { phone, name } on success; rejects with a friendly message.
export async function verifyWhatsAppOtp(phone, code) {
  const data = await post("/otp/whatsapp/verify", { phone, code });
  return { phone, name: data.name || "" };
}
