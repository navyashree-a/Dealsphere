// Cloudflare Pages Function: POST /api/session/logout (see server/userApi.js)
import { kvStore } from "../../../server/storage.js";
import { logout } from "../../../server/userApi.js";

export const onRequestPost = ({ request, env }) =>
  env.USERS_KV ? logout(request, kvStore(env.USERS_KV)) : Response.json({ ok: true });
