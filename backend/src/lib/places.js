ash

cat /home/claude/vigilante-repo/backend/src/lib/places.js
Salida

// Centroides aproximados de distritos/barrios de Barcelona, para cuando el
// titular no menciona una carretera conocida (ver classify.js) pero sí un
// lugar reconocible. No inventamos coordenadas más precisas que esto.
const PLACES = {
  "ciutat vella": [41.3825, 2.1769],
  raval: [41.3801, 2.1685],
  gòtic: [41.3833, 2.1765],
  barceloneta: [41.3805, 2.1899],
  eixample: [41.3888, 2.159],
  sants: [41.3757, 2.1341],
  "sants-montjuïc": [41.3712, 2.1487],
  "les corts": [41.3857, 2.1177],
  sarrià: [41.3985, 2.1213],
  "sant gervasi": [41.4013, 2.147],
  gràcia: [41.4036, 2.1563],
  horta: [41.4278, 2.1631],
  "nou barris": [41.4392, 2.1743],
  "sant andreu": [41.4335, 2.1893],
  "sant martí": [41.4076, 2.2003],
  poblenou: [41.4025, 2.2028],
  "la rambla": [41.3809, 2.173],
  "diagonal mar": [41.4104, 2.2158],
  "el carmel": [41.4185, 2.1587],
};
module.exports = { PLACES };
