const express = require("express");
const { getAllCameras } = require("../services/cameras-all");

const router = express.Router();

router.get("/", async (req, res) => {
  const cameras = await getAllCameras();
  res.json({ count: cameras.length, cameras });
});

module.exports = router;
