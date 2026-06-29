import { httpAction, httpRouter } from "convex/server";

import { auth } from "./auth";
import { streamVoiceTurn } from "./voiceStream";

const http = httpRouter();

auth.addHttpRoutes(http);

// ── Voice streaming endpoint ──────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
};

http.route({
  method: "OPTIONS",
  path: "/voice/turn",
  handler: httpAction(async () => {
    return new Response(null, { headers: new Headers(CORS_HEADERS), status: 204 });
  }),
});

http.route({
  method: "POST",
  path: "/voice/turn",
  handler: streamVoiceTurn,
});

export default http;
