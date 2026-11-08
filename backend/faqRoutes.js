const express = require("express");
const { readJson } = require("./jsonStore");
const { asyncHandler } = require("./errors");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const faq = await readJson("faq.json");
    res.json(faq);
  }),
);

module.exports = router;
