// Cámaras de tráfico reales del Servei Català de Trànsit (dato abierto,
// oficial, sin necesidad de clave):
// XML: http://www.gencat.cat/transit/opendata/cameres.xml
// Dataset: "Càmeres de trànsit a les carreteres de Catalunya"
//
// El feed trae, por cámara: carretera, municipio, punto kilométrico (cuando
// aplica) y la URL real de la imagen. Esa URL la usamos tal cual desde el
// navegador (con un parámetro anti-caché) — no hace falta pasarla por
// nuestro backend, así que no gastamos ancho de banda de más.
//
// No almacenamos ninguna cámara a mano: la lista completa sale de parsear
// este feed y filtrar por la zona de Barcelona y su área metropolitana.

const { XMLParser } = require("fast-xml-parser");

const FEED_URL = "http://www.gencat.cat/transit/opendata/cameres.xml";

// Bounding box aproximado de Barcelona + área metropolitana
// (Barcelonès, Baix Llobregat, Vallès, sur del Maresme).
const BBOX = { latMin: 41.2, latMax: 41.62, lonMin: 1.85, lonMax: 2.35 };

let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — la lista de cámaras casi no cambia

function idFromLink(link) {
  const m = /sctidcam=([^&.]+)/.exec(link || "");
  if (m) return m[1];
  const parts = String(link || "").split("/");
  return (parts[parts.length - 1] || link || "").replace(/\?.*$/, "");
}

async function getCameras() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`SCT cameres.xml -> HTTP ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml);
  const members = parsed?.["wfs:FeatureCollection"]?.["gml:featureMember"] || [];
  const list = Array.isArray(members) ? members : [members];

  const cameras = [];
  const seen = new Set();
  for (const m of list) {
    const c = m["cite:cameres"];
    if (!c) continue;
    const coordStr = c["cite:geom"]?.["gml:Point"]?.["gml:coordinates"];
    if (!coordStr) continue;
    const [lonStr, latStr] = String(coordStr).split(",");
    const lon = parseFloat(lonStr);
    const lat = parseFloat(latStr);
    if (!isFinite(lat) || !isFinite(lon)) continue;
    if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) continue;

    const link = c["cite:link"];
    if (!link) continue;
    const id = idFromLink(link);
    if (seen.has(id)) continue; // el feed trae alguna cámara duplicada
    seen.add(id);

    cameras.push({
      id,
      road: c["cite:carretera"] || "",
      municipality: String(c["cite:municipi"] || "").trim(),
      pk: c["cite:pk"] ?? null,
      source: c["cite:font"] || "",
      lat,
      lon,
      imageUrl: String(link).trim(),
    });
  }
  cache = { data: cameras, fetchedAt: now };
  return cameras;
}

module.exports = { getCameras };
