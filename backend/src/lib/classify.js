const TYPE_RULES = [
  { type: "STABBING", re: /apu[nñ]al|arma blanca/i },
  { type: "SHOOTING", re: /tiroteo|dispar|arma de foc|arma de fuego/i },
  { type: "FIRE", re: /incendi|incendio|crema|s'incendia/i },
  {
    type: "ACCIDENT",
    re: /accident|accidente|col·lisi[oó]|colisi[oó]n|xoc|choque|atropell|atropello|volca|vuelca|vuelco|sortida de via|salida de v[ií]a|tall per accident|corte por accidente/i,
  },
  { type: "ROBBERY", re: /atrac|robo|robat|atraco|hurto|furt/i },
  { type: "ASSAULT", re: /agressi[oó]|agresi[oó]n|pallissa|paliza|apali[zç]/i },
  { type: "POLICE", re: /detingut|detenido|arrestat|arrestado|mossos|guàrdia urbana|guardia urbana|operatiu policial|operativo policial/i },
  { type: "EMERGENCY", re: /emergència|emergencia|evacua|rescat|rescate|explosi[oó]|fuga de gas|derrumb|ensulsiada|inundaci[oó]|ofegat|ahogad/i },
  { type: "TRAFFIC", re: /retenci[oó]|tall de tr[àa]nsit|corte de tr[áa]fico|congesti[oó]/i },
  // Cajón de sastre: recoge sucesos que claramente son noticia de "sucesos"
  // pero no encajan en ninguna categoría anterior, para no descartarlos.
  {
    type: "OTHER",
    re: /succ[eé]s|suceso|incident(e)?|altercat|altercado|disturbi|desallotjament|desalojo|okup|amenaça|amenaza|persecuci[oó]|fuga polic/i,
  },
];

function buildRoadGazetteer(cameras) {
  const map = new Map();
  for (const cam of cameras) {
    const name = (cam.road || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { label: name, lat: cam.lat, lon: cam.lon });
    }
  }
  return map;
}

function findRoadMention(title, gazetteer) {
  const lower = title.toLowerCase();
  let best = null;
  for (const [key, val] of gazetteer.entries()) {
    if (key.length < 2) continue;
    if (lower.includes(key)) {
      if (!best || key.length > best.key.length) {
        best = { key, ...val };
      }
    }
  }
  return best;
}

function findDirection(title) {
  const m = /(?:sentit|sentido|direcci[oó]n)\s+([a-zàéíòóúüç\s]{3,30})/i.exec(title);
  return m ? m[1].trim() : null;
}

function classify(title) {
  for (const rule of TYPE_RULES) {
    if (rule.re.test(title)) return rule.type;
  }
  return null;
}

module.exports = { classify, buildRoadGazetteer, findRoadMention, findDirection };
