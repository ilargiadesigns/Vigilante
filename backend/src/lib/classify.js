// Clasificación por palabras clave (sin NLP real) y extracción de campos
// adicionales para accidentes. Es deliberadamente simple y auditable: cada
// regla es una expresión regular visible, no una caja negra.

const TYPE_RULES = [
  // Orden importa: lo más específico primero.
  { type: "STABBING", re: /apu[nñ]al|arma blanca/i },
  { type: "SHOOTING", re: /tiroteo|dispar|arma de foc|arma de fuego/i },
  { type: "FIRE", re: /incendi|incendio|crema|s'incendia/i },
  {
    type: "ACCIDENT",
    re: /accident|accidente|col·lisi[oó]|colisi[oó]n|xoc|choque|atropell|atropello|volca|vuelca|vuelco|sortida de via|salida de v[ií]a|tall per accident|corte por accidente/i,
  },
  { type: "ROBBERY", re: /atrac|robo|robat|hurto|furt/i },
  { type: "ASSAULT", re: /agressi[oó]|agresi[oó]n|pallissa|paliza/i },
  { type: "POLICE", re: /detingut|detenido|arrestat|arrestado|mossos|guàrdia urbana|guardia urbana/i },
  { type: "EMERGENCY", re: /emergència|emergencia|evacua|rescat|rescate/i },
  { type: "TRAFFIC", re: /retenci[oó]|tall de tr[àa]nsit|corte de tr[áa]fico|congesti[oó]/i },
];

// Gazetteer de carreteras: se construye en caliente a partir de las cámaras
// del feed SCT (ver cameras-service.js), así que no hay ninguna carretera
// escrita a mano — si el feed cambia, esto cambia solo.
function buildRoadGazetteer(cameras) {
  const roads = new Map(); // nombre normalizado -> {label, lat, lon} (primera cámara de esa vía)
  for (const cam of cameras) {
    if (!cam.road) continue;
    const key = cam.road.toLowerCase().trim();
    if (!roads.has(key)) roads.set(key, { label: cam.road, lat: cam.lat, lon: cam.lon });
  }
  return roads;
}

function findRoadMention(title, gazetteer) {
  const lower = title.toLowerCase();
  let best = null;
  for (const [key, val] of gazetteer.entries()) {
    if (key.length < 3) continue; // evita falsos positivos con claves muy cortas
    if (lower.includes(key) && (!best || key.length > best.key.length)) {
      best = { key, ...val };
    }
  }
  return best;
}

function findDirection(title) {
  const m = /(?:sentit|sentido|direcci[oó]n?)\s+([a-zàéíòóúüç\s]{2,20})/i.exec(title);
  return m ? m[1].trim() : null;
}

function classify(title) {
  for (const rule of TYPE_RULES) {
    if (rule.re.test(title)) return rule.type;
  }
  return null; // sin match claro -> no lo tratamos como suceso
}

module.exports = { classify, buildRoadGazetteer, findRoadMention, findDirection };
