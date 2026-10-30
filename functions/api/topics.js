// Cloudflare Pages Function: GET /api/topics (see server/dealsApi.js)
import { listTopics } from "../../server/dealsApi.js";

export const onRequestGet = () => listTopics();
