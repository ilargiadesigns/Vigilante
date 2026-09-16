// Geocodificación en dos pasos:
// 1) diccionario de barrios/distritos (rápido, sin red)
// 2) Nominatim (OpenStreetMap), como respaldo, respetando su política de uso
//    (1 petición/seg, User-Agent identificable, resultado cacheado).
//
// Si no encontramos nada mejor que "Barcelona" a secas, NO devolvemos
// coordenadas — mejor ningún punto que uno inventado (así lo pedías).

const { PLACES } = require("./places");

const cache = new Map();
let lastNominatimCall = 0;

function findInDictionary(title) {
  const lower = title.toLowerCase();
  for (const [name, coords] of Object.entries(PLACES)) {
    if (lower.includes(name)) return { lat: coords[0], lon: coords[1], place: name, accuracy: "NEIGHBORHOOD" };
  }
  return null;
}

async function nominatimLookup(query) {
  if (cache.has(query)) return cache.get(query);
  const wait = 1000 - (Date.now() - lastNominatimCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&viewbox=1.9,41.47,2.30,41.30&bounded=1&q=${encodeURIComponent(query + ", Barcelona")}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "vigilante-app/0.1 (proyecto personal, sin fines comerciales)" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const hit = json?.[0];
    const result = hit ? { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), place: query, accuracy: "STREET" } : null;
    cache.set(query, result);
    return result;
  } catch (e) {
    cache.set(query, null);
    return null;
  }
}

// title: titular de la noticia. roadHit: resultado de findRoadMention (o null).
async function geocodeIncident(title, roadHit) {
  if (roadHit) {
    return { lat: roadHit.lat, lon: roadHit.lon, place: roadHit.label, accuracy: "ROAD" };
  }
  const dict = findInDictionary(title);
  if (dict) return dict;

  // Última opción: intentar extraer "calle X" / "carrer X" y geocodificar
  // con Nominatim. Si no hay ni eso, no inventamos nada.
  const m = /(?:calle|carrer|carretera|avinguda|avenida|plaça|plaza)\s+([a-zàéíòóúüç0-9º'\s]{3,40})/i.exec(title);
  if (m) {
    const guess = await nominatimLookup(m[0]);
    if (guess) return guess;
  }
  return null;
}

module.exports = { geocodeIncident };
