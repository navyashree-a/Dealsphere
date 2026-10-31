// Cloudflare Pages Function: GET / PUT /api/me/saved (see server/userApi.js)
import { kvStore } from "../../../server/storage.js";
import { getSaved, putSaved } from "../../../server/userApi.js";

const unavailable = () => Response.json({ error: "Please sign in." }, { status: 401 });

export const onRequestGet = ({ request, env }) => (env.USERS_KV ? getSaved(request, kvStore(env.USERS_KV)) : unavailable());
export const onRequestPut = ({ request, env }) => (env.USERS_KV ? putSaved(request, kvStore(env.USERS_KV)) : unavailable());
