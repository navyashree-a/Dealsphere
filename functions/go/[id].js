// Cloudflare Pages Function: GET /go/:id - "View Deal" redirect (see server/dealsApi.js)
import { goToDeal } from "../../server/dealsApi.js";

export const onRequestGet = ({ params }) => goToDeal(params.id);
