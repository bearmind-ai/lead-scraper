import { buildGrid } from "./grid.mjs";
import { textSearch, placeDetails, sleep } from "./places-api.mjs";

const RATE_LIMIT_MS = 200;

export async function runScrape(searchTerm, city, maxLeads) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY not set");
  }

  const cells = buildGrid(city);
  const seen = new Map();

  for (const cell of cells) {
    if (seen.size >= maxLeads * 2) break;
    try {
      const results = await textSearch(
        apiKey,
        `${searchTerm} ${city}`,
        { lat: cell.lat, lng: cell.lng },
        cell.radius
      );
      for (const r of results) {
        if (r.id && !seen.has(r.id)) {
          seen.set(r.id, r);
        }
      }
    } catch (err) {
      console.error(`textSearch failed for cell ${cell.lat},${cell.lng}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  const leads = [];
  for (const [placeId, base] of seen) {
    if (leads.length >= maxLeads) break;
    try {
      const details = await placeDetails(apiKey, placeId);
      leads.push({
        name: details.displayName?.text || base.displayName?.text || null,
        address: details.formattedAddress || base.formattedAddress || null,
        phone: details.internationalPhoneNumber || details.nationalPhoneNumber || null,
        website: details.websiteUri || null,
        rating: details.rating ?? base.rating ?? null
      });
    } catch (err) {
      console.error(`placeDetails failed for ${placeId}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return leads;
}
