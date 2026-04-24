import "dotenv/config";
import { handler } from "./handler.mjs";

const event = {
  version: "2.0",
  routeKey: "POST /scrape",
  requestContext: { http: { method: "POST", path: "/scrape" } },
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    searchTerm: "Zahnarzt",
    city: "München",
    maxLeads: 3
  }),
  isBase64Encoded: false
};

const result = await handler(event);
console.log("statusCode:", result.statusCode);
console.log("headers:", result.headers);
console.log("body:", result.body);
