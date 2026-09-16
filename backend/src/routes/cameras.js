const express = require("express");
const { getCameras } = require("../services/cameras-service");

const router = express.Router();

router.get("/", async (req, res) => {
  const cameras = await getCameras();
  res.json({ count: cameras.length, cameras });
});

module.exports = router;
