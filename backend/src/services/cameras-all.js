// Combina las dos redes de cámaras que tenemos: el feed oficial del SCT
// (Servei Català de Trànsit, cameras-service.js — NO TOCAR, sigue igual)
// y la red municipal del Ajuntament de Barcelona (bcn-transit-service.js).
// Si una de las dos falla, seguimos sirviendo la otra en vez de romper
// todo el endpoint.
const { getCameras: getSctCameras } = require("./cameras-service");
const { getBcnCameras } = require("./bcn-transit-service");

async function getAllCameras() {
  const [sctRaw, bcn] = await Promise.all([
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
  return [...sct, ...bcn];
}

module.exports = { getAllCameras };
