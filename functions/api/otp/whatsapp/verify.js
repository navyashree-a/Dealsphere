// Cloudflare Pages Function: POST /api/otp/whatsapp/verify (see server/whatsappOtp.js)
// A correct code also starts a session in USERS_KV (see server/session.js).
import { kvStore, verifyOtp } from "../../../../server/whatsappOtp.js";

export const onRequestPost = ({ request, env }) => {
  if (!env.OTP_KV) return Response.json({ error: "WhatsApp sign-in isn't set up yet." }, { status: 503 });
  return verifyOtp(request, env, {
    store: kvStore(env.OTP_KV),
    sessionStore: env.USERS_KV ? kvStore(env.USERS_KV) : undefined,
  });
};
