const express = require("express");
const { getEvents, getStatus, runPipeline } = require("../services/events-service");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ ...getStatus(), events: getEvents() });
});

// Disparar el pipeline a mano (útil para probar sin esperar 10 min).
router.post("/refresh", async (req, res) => {
  await runPipeline();
  res.json({ ...getStatus() });
});

module.exports = router;
