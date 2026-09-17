const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const { getCameras } = require("./cameras-service");
const { classify, buildRoadGazetteer, findRoadMention, findDirection } = require("../lib/classify");
const { geocodeIncident } = require("../lib/geocode");
const { isSameEvent } = require("../lib/dedup");
const { haversineMeters } = require("../lib/geo");

const STORE_PATH = path.join(__dirname, "..", "..", "data", "events.json");
const CLEARED_AFTER_HOURS = 3;
const NEARBY_CAMERA_RADIUS_M = 1500;

// Cuánto de "casi en tiempo real" queremos: descartamos noticias más
// antiguas que esto para que la app no se llene de sucesos de hace meses
// que además caen fuera de la línea de tiempo de la interfaz.
const MAX_NEWS_AGE_DAYS = 30;
const MAX_NEWS_AGE_MS = MAX_NEWS_AGE_DAYS * 24 * 60 * 60 * 1000;

// Cuánto tiempo mantenemos un evento guardado (por si sigue recibiendo
// actualizaciones de fuentes), aunque ya no aparezca en pantalla.
const STORE_RETENTION_DAYS = 3;

const QUERIES = [
  "Barcelona (accidente OR accident OR colisión OR atropello OR vuelca)",
  "Barcelona (incendio OR incendi OR fuego)",
  "Barcelona (robo OR atraco OR hurto OR robatori)",
  "Barcelona (agresión OR agressió OR apuñalado OR apunyalat)",
  "Barcelona (tiroteo OR disparo OR arma de foc)",
  "Barcelona (detenido OR detingut OR mossos OR guàrdia urbana)",
  "Barcelona (emergencia OR evacuación OR rescate)",
  // Más términos: sucesos que no siempre usan las palabras de arriba
  "Barcelona (explosión OR fuga de gas OR derrumbe OR inundación)",
  "Barcelona (desalojo OR okupas OR altercado OR disturbios)",
  "Barcelona (suceso OR sucesos OR operativo policial OR alerta)",
  // Área metropolitana: misma variedad de tipos que Barcelona
  "(L'Hospitalet OR Badalona OR \"Santa Coloma\" OR Cornellà) (accidente OR robo OR incendio OR agresión OR apuñalado OR tiroteo OR detenido OR explosión OR desalojo OR suceso)",
];

let store = [];
let lastRun = null;
let lastError = null;

function loadStore() {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    store = JSON.parse(raw);
    if (!Array.isArray(store)) store = [];
  } catch (e) {
    store = [];
  }
}

function persistStore() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("No se pudo guardar events.json:", e.message);
  }
}

async function fetchRssItems(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; vigilante-app/0.1)" },
  });
  if (!res.ok) throw new Error(`Google News RSS -> HTTP ${res.status} (${query})`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

function nearbyCameras(lat, lon, cameras) {
  return cameras
    .map((cam) => ({ cam, dist: haversineMeters(lat, lon, cam.lat, cam.lon) }))
    .filter((x) => x.dist <= NEARBY_CAMERA_RADIUS_M)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map((x) => ({
      camera_id: x.cam.id,
      name: x.cam.road + (x.cam.municipality ? " · " + x.cam.municipality : ""),
      latitude: x.cam.lat,
      longitude: x.cam.lon,
      distance_meters: Math.round(x.dist),
      image_url: x.cam.imageUrl,
    }));
}

async function runPipeline() {
  try {
    const cameras = await getCameras().catch(() => []);
    const gazetteer = buildRoadGazetteer(cameras);
    const now = Date.now();

    let totalItems = 0;
    let tooOld = 0;
    let noLocation = 0;
    let added = 0;
    let updated = 0;

    for (const query of QUERIES) {
      let items = [];
      try {
        items = await fetchRssItems(query);
      } catch (e) {
        console.error("Error RSS:", query, e.message);
        continue;
      }

      for (const item of items) {
        totalItems++;
        const title = String(item.title || "").trim();
        if (!title) continue;

        const link = item.link || "";
        const pubDateRaw = item.pubDate;
        const publishedAt = pubDateRaw ? new Date(pubDateRaw) : new Date();
        const publishedAtIso = isFinite(publishedAt.getTime()) ? publishedAt.toISOString() : new Date().toISOString();

        // --- Filtro de antigüedad: descartamos noticias viejas ---
        const ageMs = now - new Date(publishedAtIso).getTime();
        if (ageMs > MAX_NEWS_AGE_MS) {
          tooOld++;
          continue;
        }

        const type = classify(title);
        if (!type) continue;

        const roadHit = findRoadMention(title, gazetteer);
        const geo = await geocodeIncident(title, roadHit).catch(() => null);
        if (!geo || geo.lat == null || geo.lon == null) {
          noLocation++;
          continue;
        }

        const candidate = {
          type,
          title,
          lat: geo.lat,
          lon: geo.lon,
          location_text: geo.place || "",
          location_accuracy: geo.accuracy || "CITY",
          location_confidence: geo.accuracy === "ROAD" ? "media" : geo.accuracy === "NEIGHBORHOOD" ? "media" : "baja",
          occurred_at: publishedAtIso,
          published_at: publishedAtIso,
        };

        if (type === "ACCIDENT" || type === "TRAFFIC") {
          candidate.road_name = roadHit ? roadHit.label : null;
          candidate.direction = findDirection(title);
          candidate.traffic_impact = true;
        }

        let matched = null;
        for (const ev of store) {
          if (isSameEvent(ev, candidate)) {
            matched = ev;
            break;
          }
        }

        const sourceEntry = { title, link, published_at: publishedAtIso };

        if (matched) {
          matched.updated_at = new Date().toISOString();
          matched.status = "ACTIVE";
          matched.sources = matched.sources || [];
          const already = matched.sources.some((s) => s.link === link);
          if (!already) matched.sources.push(sourceEntry);
          updated++;
        } else {
          const newEvent = {
            id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...candidate,
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sources: [sourceEntry],
          };
          if (type === "ACCIDENT" || type === "TRAFFIC") {
            newEvent.nearby_cameras = nearbyCameras(geo.lat, geo.lon, cameras);
          }
          store.push(newEvent);
          added++;
        }
      }
    }

    // Marcar como CLEARED los eventos sin novedades en CLEARED_AFTER_HOURS
    const clearedCutoff = now - CLEARED_AFTER_HOURS * 3600 * 1000;
    for (const ev of store) {
      if (ev.status === "ACTIVE" && new Date(ev.updated_at).getTime() < clearedCutoff) {
        ev.status = "CLEARED";
      }
    }

    // Purga: nos quedamos solo con lo de los últimos STORE_RETENTION_DAYS días
    const retentionCutoff = now - STORE_RETENTION_DAYS * 24 * 3600 * 1000;
    store = store.filter((ev) => new Date(ev.updated_at).getTime() >= retentionCutoff);

    persistStore();
    lastRun = new Date().toISOString();
    lastError = null;
    console.error(
      `Pipeline sucesos: ${totalItems} items vistos, ${tooOld} descartados por antiguos (>${MAX_NEWS_AGE_DAYS}d), ${noLocation} sin ubicación, ${added} nuevos, ${updated} actualizados. Total en store: ${store.length}.`
    );
  } catch (e) {
    lastError = e.message;
    console.error("Error en pipeline de sucesos:", e);
  }
}

function getEvents() {
  return store;
}

function getStatus() {
  return { lastRun, lastError, count: store.length };
}

loadStore();

module.exports = { runPipeline, getEvents, getStatus };
