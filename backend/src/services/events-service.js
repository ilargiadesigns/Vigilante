bash

cat /home/claude/vigilante-repo/backend/src/services/events-service.js
Salida

// Pipeline: RSS de prensa -> clasificar -> extraer ubicación (y campos de
// accidente) -> geocodificar -> deduplicar contra lo que ya teníamos ->
// cámaras cercanas (para ACCIDENT/TRAFFIC) -> guardar. Se ejecuta cada ~10
// minutos (ver server.js) y también se puede disparar a mano.
//
// No hay fuentes oficiales estructuradas de sucesos (Mossos/Bombers/Guàrdia
// Urbana no publican eso) — solo prensa vía RSS. Ver backend/README.md.

const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const { getCameras } = require("./cameras-service");
const { classify, buildRoadGazetteer, findRoadMention, findDirection } = require("../lib/classify");
const { geocodeIncident } = require("../lib/geocode");
const { isSameEvent } = require("../lib/dedup");
const { haversineMeters } = require("../lib/geo");

const STORE_PATH = path.join(__dirname, "..", "..", "data", "events.json");
const CLEARED_AFTER_HOURS = 3; // sin actualizaciones nuevas en este tiempo -> lo marcamos CLEARED (heurística, no confirmado)
const NEARBY_CAMERA_RADIUS_M = 1500;

// Consultas RSS de Google News: una por grupo de tipos, para tener buena
// cobertura de vocabulario sin una única query gigante poco precisa.
const QUERIES = [
  "Barcelona (accidente OR accident OR colisión OR atropello OR vuelca)",
  "Barcelona (incendio OR incendi OR fuego)",
  "Barcelona (robo OR atraco OR hurto OR robatori)",
  "Barcelona (agresión OR agressió OR apuñalado OR apunyalat)",
  "Barcelona (tiroteo OR disparo OR arma de foc)",
  "Barcelona (detenido OR detingut OR mossos OR guàrdia urbana)",
  "Barcelona (emergencia OR evacuación OR rescate)",
];

let store = []; // eventos en memoria
let lastRun = null;
let lastError = null;

function loadStore() {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    store = JSON.parse(raw);
  } catch {
    store = [];
  }
}

function persistStore() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error("No se pudo guardar events.json:", e.message);
  }
}

async function fetchRssItems(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("RSS " + query + " -> HTTP " + res.status);
  const xml = await res.text();
  const parsed = new XMLParser().parse(xml);
  const raw = parsed?.rss?.channel?.item || [];
  return Array.isArray(raw) ? raw : [raw];
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
  lastError = null;
  try {
    const cameras = await getCameras();
    const gazetteer = buildRoadGazetteer(cameras);

    const allItems = [];
    for (const q of QUERIES) {
      try {
        const items = await fetchRssItems(q);
        allItems.push(...items);
      } catch (e) {
        console.error("Fallo RSS:", q, e.message);
      }
    }

    for (const item of allItems) {
      const title = String(item.title || "").trim();
      if (!title) continue;
      const type = classify(title);
      if (!type) continue;

      const roadHit = findRoadMention(title, gazetteer);
      const geo = await geocodeIncident(title, roadHit);
      if (!geo) continue; // sin ubicación reconocible: no creamos marcador

      const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      const source = {
        title,
        link: item.link,
        name: (item.source && item.source["#text"]) || item.source || "Google News",
        published_at: publishedAt,
      };

      const candidate = {
        type,
        title,
        lat: geo.lat,
        lon: geo.lon,
        location_text: geo.place,
        location_accuracy: geo.accuracy, // ROAD | NEIGHBORHOOD | STREET
        location_confidence: geo.accuracy === "ROAD" ? "MEDIUM" : "LOW",
        occurred_at: publishedAt, // no tenemos forma fiable de extraer la hora real del suceso del titular; usamos publicación como mejor estimación disponible
        published_at: publishedAt,
      };

      if (type === "ACCIDENT" || type === "TRAFFIC") {
        candidate.road_name = roadHit ? roadHit.label : null;
        candidate.direction = findDirection(title);
        candidate.traffic_impact = /tall|corte|retenci[oó]|congesti[oó]/i.test(title);
      }

      const existing = store.find((e) => isSameEvent(e, candidate));
      if (existing) {
        existing.updated_at = new Date().toISOString();
        existing.status = "ACTIVE";
        if (!existing.sources.some((s) => s.link === source.link)) existing.sources.push(source);
      } else {
        const id = `${type}-${Date.now()}-${Math.round(geo.lat * 1000)}-${Math.round(geo.lon * 1000)}`;
        store.push({
          id,
          ...candidate,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sources: [source],
          nearby_cameras: ["ACCIDENT", "TRAFFIC"].includes(type) ? nearbyCameras(geo.lat, geo.lon, cameras) : [],
        });
      }
    }

    // Marcar como CLEARED lo que lleva mucho sin actualizarse (heurística,
    // no una confirmación real de que el suceso haya terminado).
    const now = Date.now();
    for (const e of store) {
      const hoursSinceUpdate = (now - new Date(e.updated_at)) / 3600000;
      if (e.status === "ACTIVE" && hoursSinceUpdate > CLEARED_AFTER_HOURS) e.status = "CLEARED";
    }

    // Nos quedamos con los últimos 3 días para no crecer sin límite.
    const cutoff = now - 3 * 24 * 3600000;
    store = store.filter((e) => new Date(e.updated_at).getTime() >= cutoff);

    persistStore();
    lastRun = new Date().toISOString();
  } catch (e) {
    lastError = e.message;
    console.error("Fallo en el pipeline de eventos:", e);
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
