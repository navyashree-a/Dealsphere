// Cloudflare Pages Function: GET /api/session (see server/userApi.js)
import { kvStore } from "../../../server/storage.js";
import { getSession } from "../../../server/userApi.js";

export const onRequestGet = ({ request, env }) =>
  env.USERS_KV ? getSession(request, kvStore(env.USERS_KV)) : Response.json({ error: "Please sign in." }, { status: 401 });
