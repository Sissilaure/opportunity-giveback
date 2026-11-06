const express = require("express");
const { readJson } = require("./jsonStore");
const { asyncHandler } = require("./errors");

// Contenu éditorial statique (équipe, témoignages) : modifiable dans backend/data/*.json
// sans toucher à la base, comme la FAQ et les ressources.
const router = express.Router();

router.get(
  "/equipe",
  asyncHandler(async (req, res) => {
    res.json(await readJson("equipe.json"));
  }),
);

router.get(
  "/temoignages",
  asyncHandler(async (req, res) => {
    res.json(await readJson("temoignages.json"));
  }),
);

module.exports = router;
