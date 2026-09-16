const express = require("express");
const cors = require("cors");

const camerasRoutes = require("./src/routes/cameras");
const eventsRoutes = require("./src/routes/events");
const { runPipeline } = require("./src/services/events-service");

const app = express();
const PORT = process.env.PORT || 3001;
const PIPELINE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/cameras", camerasRoutes);
app.use("/api/events", eventsRoutes);

app.listen(PORT, () => {
  console.log(`Vigilante backend escuchando en http://localhost:${PORT}`);
  // Primera pasada a los 5s de arrancar (no bloquea el arranque del server),
  // y luego cada 10 minutos mientras el proceso siga vivo.
  setTimeout(() => runPipeline().catch((e) => console.error(e)), 5000);
  setInterval(() => runPipeline().catch((e) => console.error(e)), PIPELINE_INTERVAL_MS);
});
