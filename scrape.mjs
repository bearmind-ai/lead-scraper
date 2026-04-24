import { buildGrid, hasCity } from "./grid.mjs";
import { textSearch, placeDetails, sleep } from "./places-api.mjs";

const RATE_LIMIT_MS = 200;

export async function runScrape(searchTerm, city, maxLeads) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY not set");
  }

  const seen = new Map();
  const query = `${searchTerm} ${city}`;

  if (hasCity(city)) {
    const cells = buildGrid(city);
    for (const cell of cells) {
      if (seen.size >= maxLeads * 2) break;
      try {
        const { places } = await textSearch(apiKey, query, {
          location: { lat: cell.lat, lng: cell.lng },
          radius: cell.radius
        });
        for (const r of places) {
          if (r.id && !seen.has(r.id)) {
            seen.set(r.id, r);
          }
        }
      } catch (err) {
        console.error(`textSearch failed for cell ${cell.lat},${cell.lng}: ${err.message}`);
      }
      await sleep(RATE_LIMIT_MS);
    }
  } else {
    let pageToken = null;
    for (let page = 0; page < 3; page++) {
      if (seen.size >= maxLeads) break;
      try {
        const { places, nextPageToken } = await textSearch(apiKey, query, { pageToken });
        for (const r of places) {
          if (r.id && !seen.has(r.id)) {
            seen.set(r.id, r);
          }
        }
        if (!nextPageToken) break;
        pageToken = nextPageToken;
      } catch (err) {
        console.error(`textSearch failed for "${query}" (page ${page}): ${err.message}`);
        break;
      }
      await sleep(RATE_LIMIT_MS);
    }
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
