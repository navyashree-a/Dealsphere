// Cloudflare Pages Function: POST /api/otp/whatsapp/verify (see server/whatsappOtp.js)
import { kvStore, verifyOtp } from "../../../../server/whatsappOtp.js";

export const onRequestPost = ({ request, env }) => {
  if (!env.OTP_KV) return Response.json({ error: "WhatsApp sign-in isn't set up yet." }, { status: 503 });
  return verifyOtp(request, env, { store: kvStore(env.OTP_KV) });
};
