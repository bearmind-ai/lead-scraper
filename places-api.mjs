const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

const TEXT_SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating"
].join(",");

const DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "websiteUri",
  "rating"
].join(",");

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function textSearch(apiKey, query, location, radius) {
  const body = { textQuery: query };
  if (location) {
    body.locationBias = {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius
      }
    };
  }
  const res = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELDS
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`textSearch HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.places || [];
}

export async function placeDetails(apiKey, placeId) {
  const res = await fetch(`${DETAILS_URL}/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DETAILS_FIELDS
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`placeDetails HTTP ${res.status}: ${body}`);
  }
  return await res.json();
}
