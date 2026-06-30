import { httpRouter } from "convex/server";

import { auth } from "./auth";
import { buyerSourcingChat } from "./listings/buyerChatHttp";
import { mpesaStkWebhook } from "./orders/mpesaWebhookHttp";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  handler: buyerSourcingChat,
  method: "POST",
  path: "/api/buyer/sourcing",
});

http.route({
  handler: buyerSourcingChat,
  method: "OPTIONS",
  path: "/api/buyer/sourcing",
});

http.route({
  handler: mpesaStkWebhook,
  method: "POST",
  path: "/api/webhooks/mpesa/stk",
});

export default http;
