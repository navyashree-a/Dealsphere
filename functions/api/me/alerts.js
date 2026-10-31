// Cloudflare Pages Function: GET / PUT /api/me/alerts (see server/userApi.js)
import { kvStore } from "../../../server/storage.js";
import { getAlerts, putAlerts } from "../../../server/userApi.js";

const unavailable = () => Response.json({ error: "Please sign in." }, { status: 401 });

export const onRequestGet = ({ request, env }) => (env.USERS_KV ? getAlerts(request, kvStore(env.USERS_KV)) : unavailable());
export const onRequestPut = ({ request, env }) => (env.USERS_KV ? putAlerts(request, kvStore(env.USERS_KV)) : unavailable());
