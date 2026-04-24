const CITY_COORDS = {
  "München": { lat: 48.1351, lng: 11.5820 },
  "Munich": { lat: 48.1351, lng: 11.5820 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Hamburg": { lat: 53.5511, lng: 9.9937 },
  "Köln": { lat: 50.9375, lng: 6.9603 },
  "Cologne": { lat: 50.9375, lng: 6.9603 },
  "Frankfurt": { lat: 50.1109, lng: 8.6821 }
};

export function hasCity(city) {
  return Object.prototype.hasOwnProperty.call(CITY_COORDS, city);
}

export function getCityCenter(city) {
  const coords = CITY_COORDS[city];
  if (!coords) {
    throw new Error(`Unknown city: ${city}. Known: ${Object.keys(CITY_COORDS).join(", ")}`);
  }
  return coords;
}

export function buildGrid(city, size = 3, stepKm = 3) {
  const center = getCityCenter(city);
  const latStep = stepKm / 111;
  const lngStep = stepKm / (111 * Math.cos((center.lat * Math.PI) / 180));
  const offset = Math.floor(size / 2);
  const cells = [];
  for (let i = -offset; i <= offset; i++) {
    for (let j = -offset; j <= offset; j++) {
      cells.push({
        lat: center.lat + i * latStep,
        lng: center.lng + j * lngStep,
        radius: Math.round(stepKm * 1000 * 0.75)
      });
    }
  }
  return cells;
}
