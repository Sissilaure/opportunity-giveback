const express = require("express");
const crypto = require("crypto");
const createRateLimiter = require("./rateLimit");
const validate = require("./validate");
const { questionSchema } = require("./schemas");
const { asyncHandler } = require("./errors");

const postLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Trop de questions envoyées, réessayez dans une minute.",
});

// `pool` est injecté (plutôt qu'importé directement) pour pouvoir brancher un pool
// factice dans les tests sans dépendre d'un vrai serveur MySQL.
function createQuestionsRouter(pool) {
  const router = express.Router();

  router.post(
    "/",
    postLimiter,
    validate(questionSchema),
    asyncHandler(async (req, res) => {
      const { texte } = req.body;

      await pool.query(
        "INSERT INTO question (id, texte, date, statut) VALUES (?, ?, NOW(), 'en_attente')",
        [crypto.randomUUID(), texte],
      );

      res.status(201).json({ message: "Question envoyée." });
    }),
  );

  router.get(
    "/answered",
    asyncHandler(async (req, res) => {
      const [questions] = await pool.query(
        `SELECT id, texte, date, reponse, date_reponse AS dateReponse
         FROM question
         WHERE statut = 'repondu'
         ORDER BY date_reponse DESC, date DESC`,
      );
      res.json(questions);
    }),
  );

  return router;
}

module.exports = createQuestionsRouter;
