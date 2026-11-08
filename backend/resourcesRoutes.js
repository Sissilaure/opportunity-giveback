const express = require("express");
const { readJson } = require("./jsonStore");
const { AppError, asyncHandler } = require("./errors");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const resources = await readJson("resources.json");
    res.json(resources);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const resources = await readJson("resources.json");
    const resource = resources.find((r) => r.id === req.params.id);
    if (!resource) {
      throw new AppError(404, "Ressource introuvable.");
    }
    res.json(resource);
  }),
);

module.exports = router;
