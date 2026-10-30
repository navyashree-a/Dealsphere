// Cloudflare Pages Function: GET /api/deals/:id (see server/dealsApi.js)
import { getDeal } from "../../../server/dealsApi.js";

export const onRequestGet = ({ params }) => getDeal(params.id);
