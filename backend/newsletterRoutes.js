const express = require("express");
const createRateLimiter = require("./rateLimit");
const validate = require("./validate");
const { newsletterSchema } = require("./schemas");
const { asyncHandler } = require("./errors");

const postLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Trop d'inscriptions envoyées, réessayez dans une minute.",
});

function createNewsletterRouter(pool) {
  const router = express.Router();

  // Réinscrire la même adresse met seulement à jour la fréquence choisie : pas de doublon,
  // et on ne révèle pas si l'adresse était déjà inscrite.
  router.post(
    "/",
    postLimiter,
    validate(newsletterSchema),
    asyncHandler(async (req, res) => {
      const { email, frequence } = req.body;
      await pool.query(
        `INSERT INTO newsletter_abonne (email, frequence) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE frequence = VALUES(frequence)`,
        [email, frequence],
      );
      res.status(201).json({ message: "Inscription enregistrée." });
    }),
  );

  return router;
}

module.exports = createNewsletterRouter;
