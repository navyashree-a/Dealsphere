// Cloudflare Pages Function: GET /api/deals (see server/dealsApi.js)
import { listDeals } from "../../../server/dealsApi.js";

export const onRequestGet = ({ request }) => listDeals(request);
