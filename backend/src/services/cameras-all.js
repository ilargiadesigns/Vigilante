// Combina las dos redes de cámaras que tenemos: el feed oficial del SCT
// (Servei Català de Trànsit, cameras-service.js — NO TOCAR, sigue igual)
// y la red municipal del Ajuntament de Barcelona (bcn-transit-service.js).
// Si una de las dos falla, seguimos sirviendo la otra en vez de romper
// todo el endpoint.
const { getCameras: getSctCameras } = require("./cameras-service");
const { getBcnCameras } = require("./bcn-transit-service");
const { haversineMeters } = require("../lib/geo");

// Varias cámaras municipales (Ronda Litoral, Ronda de Dalt) están en los
// mismos tramos que ya cubre el SCT. Si una cámara BCN cae muy cerca de
// una del SCT, es casi seguro el mismo cruce visto por dos sistemas —
// descartamos la BCN y nos quedamos con la del SCT para no duplicar.
const DEDUPE_RADIUS_M = 250;

async function getAllCameras() {
  const [sctRaw, bcnRaw] = await Promise.all([
    getSctCameras().catch((e) => {
      console.error("Error cámaras SCT:", e.message);
      return [];
    }),
    getBcnCameras().catch((e) => {
      console.error("Error cámaras BCN:", e.message);
      return [];
    }),
  ]);
  const sct = sctRaw.map((c) => ({ ...c, network: c.network || "SCT" }));

  const bcn = bcnRaw.filter((b) => {
    const tooClose = sct.some((s) => haversineMeters(b.lat, b.lon, s.lat, s.lon) < DEDUPE_RADIUS_M);
    return !tooClose;
  });

  return [...sct, ...bcn];
}

module.exports = { getAllCameras };
