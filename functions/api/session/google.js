// Cloudflare Pages Function: POST /api/session/google (see server/googleAuth.js)
// A verified Google ID token starts a session in USERS_KV (see server/session.js).
import { kvStore } from "../../../server/storage.js";
import { signInWithGoogle } from "../../../server/googleAuth.js";

export const onRequestPost = ({ request, env }) =>
  signInWithGoogle(request, env, { sessionStore: env.USERS_KV ? kvStore(env.USERS_KV) : undefined });
