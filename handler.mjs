import { runScrape } from "./scrape.mjs";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function response(statusCode, payload) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload)
  };
}

export async function handler(event) {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return response(500, { error: "GOOGLE_MAPS_API_KEY not configured" });
    }

    let body = event?.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return response(400, { error: "Invalid JSON body" });
      }
    }
    body = body || {};

    const { searchTerm, city, maxLeads } = body;
    if (!searchTerm || !city || maxLeads === undefined || maxLeads === null) {
      return response(400, {
        error: "Missing required fields: searchTerm, city, maxLeads"
      });
    }

    const max = parseInt(maxLeads, 10);
    if (!Number.isFinite(max) || max <= 0) {
      return response(400, { error: "maxLeads must be a positive integer" });
    }

    const leads = await runScrape(searchTerm, city, max);
    return response(200, { count: leads.length, leads });
  } catch (err) {
    return response(500, { error: err.message || "Internal error" });
  }
}
