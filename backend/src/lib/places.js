// Centroides aproximados de distritos/barrios de Barcelona y municipios
// cercanos, para cuando el titular no menciona una carretera conocida (ver
// classify.js) pero sí un lugar reconocible. No inventamos coordenadas más
// precisas que esto.
const PLACES = {
  // Distritos
  "ciutat vella": [41.3825, 2.1769],
  eixample: [41.3888, 2.159],
  "sants-montjuïc": [41.3712, 2.1487],
  "les corts": [41.3857, 2.1177],
  sarrià: [41.3985, 2.1213],
  gràcia: [41.4036, 2.1563],
  horta: [41.4278, 2.1631],
  "nou barris": [41.4392, 2.1743],
  "sant andreu": [41.4335, 2.1893],
  "sant martí": [41.4076, 2.2003],
  // Barrios (Ciutat Vella / Eixample)
  raval: [41.3801, 2.1685],
  gòtic: [41.3833, 2.1765],
  barceloneta: [41.3805, 2.1899],
  "la rambla": [41.3809, 2.173],
  "sant antoni": [41.3762, 2.1608],
  "dreta de l'eixample": [41.3927, 2.1655],
  "fort pienc": [41.3944, 2.1794],
  // Barrios (Sants-Montjuïc)
  sants: [41.3757, 2.1341],
  hostafrancs: [41.3761, 2.146],
  "poble sec": [41.3733, 2.1637],
  "la bordeta": [41.3708, 2.1359],
  montjuïc: [41.3646, 2.1583],
  "zona franca": [41.3468, 2.1379],
  // Les Corts / Sarrià-Sant Gervasi
  pedralbes: [41.3939, 2.1149],
  "sant gervasi": [41.4013, 2.147],
  vallvidrera: [41.4132, 2.0908],
  // Gràcia
  vallcarca: [41.4113, 2.1466],
  "el coll": [41.4159, 2.153],
  "camp d'en grassot": [41.404, 2.1637],
  // Horta-Guinardó
  "el carmel": [41.4185, 2.1587],
  guinardó: [41.4187, 2.1717],
  "can baró": [41.4223, 2.1663],
  "la salut": [41.4152, 2.1636],
  // Nou Barris
  roquetes: [41.4404, 2.1668],
  "trinitat nova": [41.4436, 2.1791],
  canyelles: [41.4407, 2.1749],
  porta: [41.4319, 2.1746],
  prosperitat: [41.4365, 2.1719],
  // Sant Andreu
  "sant andreu de palomar": [41.4335, 2.1893],
  "trinitat vella": [41.4409, 2.1888],
  "la sagrera": [41.4165, 2.1834],
  navas: [41.4133, 2.1789],
  // Sant Martí
  poblenou: [41.4025, 2.2028],
  "diagonal mar": [41.4104, 2.2158],
  clot: [41.4103, 2.1867],
  "el clot": [41.4103, 2.1867],
  "la verneda": [41.4222, 2.1959],
  besòs: [41.4193, 2.2101],
  "vila olímpica": [41.3897, 2.198],
  // Municipios del área metropolitana
  "l'hospitalet": [41.3596, 2.0997],
  hospitalet: [41.3596, 2.0997],
  badalona: [41.4501, 2.2474],
  "santa coloma": [41.4514, 2.2082],
  cornellà: [41.3536, 2.0699],
  "sant boi": [41.3428, 2.0378],
  esplugues: [41.3777, 2.0854],
  "sant cugat": [41.4727, 2.0839],
  "sant adrià": [41.4298, 2.2199],
  terrassa: [41.5638, 2.0089],
  sabadell: [41.5433, 2.1094],
  "el prat": [41.325, 2.0951],
  viladecans: [41.3151, 2.0192],
};
module.exports = { PLACES };
