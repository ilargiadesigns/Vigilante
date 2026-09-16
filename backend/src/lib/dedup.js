bash

cat /home/claude/vigilante-repo/backend/src/lib/dedup.js
Salida

const { haversineMeters } = require("./geo");

function titleSimilarity(a, b) {
  const words = (s) => new Set(s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\W+/).filter((w) => w.length > 3));
  const wa = words(a), wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}

// ¿newEvent es el mismo suceso que existing? mismo tipo + cerca en el
// espacio + cerca en el tiempo + titulares parecidos.
function isSameEvent(existing, newEvent) {
  if (existing.type !== newEvent.type) return false;
  const distance = haversineMeters(existing.lat, existing.lon, newEvent.lat, newEvent.lon);
  if (distance > 800) return false;
  const hoursApart = Math.abs(new Date(existing.occurred_at) - new Date(newEvent.occurred_at)) / 3600000;
  if (hoursApart > 6) return false;
  const sim = Math.max(
    titleSimilarity(existing.title, newEvent.title),
    ...existing.sources.map((s) => titleSimilarity(s.title, newEvent.title))
  );
  return sim >= 0.3 || distance < 150; // muy cerca en el espacio basta aunque el titular difiera
}

module.exports = { isSameEvent, titleSimilarity };
