// Cámaras de tráfico del Ajuntament de Barcelona ("Trànsit BCN"),
// una red MUNICIPAL independiente del feed del Servei Català de Trànsit
// (SCT). No hay un XML/JSON público con la lista completa de esta red,
// así que mantenemos aquí una lista verificada a mano: cada URL de imagen
// se ha comprobado una por una contra bcn.cat/transit/imatges/.
//
// Las coordenadas son el centro aproximado del cruce/plaza donde está la
// cámara (mismo nivel de precisión que el diccionario de barrios en
// places.js) — no son coordenadas GPS exactas del poste de la cámara,
// porque bcn.cat no las publica.

const IMG_BASE = "http://www.bcn.cat/transit/imatges/";

const BCN_CAMERAS = [
  { slug: "BalmesMitre", name: "Balmes / Mitre", lat: 41.4022, lon: 2.1421 },
  { slug: "RondaLitoralZonaFranca", name: "Ronda Litoral / Zona Franca", lat: 41.355, lon: 2.1345 },
  { slug: "RondaLitoralMollFusta", name: "Ronda Litoral / Moll de la Fusta", lat: 41.3795, lon: 2.183 },
  { slug: "RondaLitoralBadajoz", name: "Ronda Litoral / Badajoz", lat: 41.3903, lon: 2.1965 },
  { slug: "RondadeDaltVelodrom", name: "Ronda de Dalt / Velòdrom", lat: 41.4272, lon: 2.1479 },
  { slug: "RondadeDaltSantGervasi", name: "Ronda de Dalt / Sant Gervasi", lat: 41.4064, lon: 2.1275 },
  { slug: "RondadeDaltMeridiana", name: "Ronda de Dalt / Meridiana", lat: 41.4425, lon: 2.181 },
  { slug: "RondadeDaltCrtaEsplugues", name: "Ronda de Dalt / Ctra. Esplugues", lat: 41.3898, lon: 2.0951 },
  { slug: "PlUrquinaona", name: "Plaça Urquinaona", lat: 41.3878, lon: 2.1755 },
  { slug: "PlPauVila", name: "Plaça Pau Vila", lat: 41.3803, lon: 2.1841 },
  { slug: "PlPaissosCatalans", name: "Plaça Països Catalans", lat: 41.3797, lon: 2.1403 },
  { slug: "PlMolina", name: "Plaça Molina", lat: 41.4013, lon: 2.1497 },
  { slug: "PlEspanya", name: "Plaça Espanya / Paral·lel", lat: 41.3748, lon: 2.1493 },
  { slug: "PlCatalunya", name: "Plaça Catalunya / Pelai", lat: 41.387, lon: 2.1701 },
  { slug: "PlAntonioLopez", name: "Plaça Antonio López", lat: 41.3808, lon: 2.1839 },
  { slug: "MeridianaFelipII", name: "Meridiana / Felip II", lat: 41.4187, lon: 2.1836 },
  { slug: "MarinaPujades", name: "Marina / Pujades", lat: 41.3963, lon: 2.1943 },
  { slug: "GranViaMarina", name: "Gran Via / Marina", lat: 41.3958, lon: 2.1837 },
  { slug: "DiagonalMCristina", name: "Diagonal / Maria Cristina", lat: 41.386, lon: 2.1273 },
  { slug: "DiagonalCiutatdeGranada", name: "Diagonal / Ciutat de Granada", lat: 41.4004, lon: 2.1935 },
  { slug: "BalmesGranVia", name: "Balmes / Gran Via", lat: 41.387, lon: 2.1631 },
];

let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000;

// No comprobamos aquí si cada imagen carga en el servidor: bcn.cat ha
// bloqueado accesos automáticos en nuestras pruebas (anti-bot), pero el
// NAVEGADOR del usuario sí suele poder cargar la imagen directamente al
// abrir el panel de cámara (igual que con las del SCT). Si una imagen en
// concreto no carga, el panel ya muestra "Imagen no disponible ahora
// mismo" — no rompe nada.
async function getBcnCameras() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const cameras = BCN_CAMERAS.map((c) => ({
    id: "bcn_" + c.slug,
    road: c.name,
    municipality: "Barcelona",
    pk: null,
    source: "Ajuntament de Barcelona (Trànsit BCN)",
    lat: c.lat,
    lon: c.lon,
    imageUrl: IMG_BASE + c.slug + ".gif",
    network: "BCN",
  }));

  cache = { data: cameras, fetchedAt: now };
  return cameras;
}

module.exports = { getBcnCameras };
