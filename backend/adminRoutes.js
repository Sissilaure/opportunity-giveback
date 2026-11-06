const express = require("express");
const bcrypt = require("bcryptjs");
const requireAdmin = require("./requireAdmin");
const createRateLimiter = require("./rateLimit");
const validate = require("./validate");
const { loginSchema, answerSchema } = require("./schemas");
const { AppError, asyncHandler } = require("./errors");

// Comparée quand l'email est inconnu, pour que la réponse prenne le même temps
// qu'une comparaison réelle (évite de révéler par le timing si l'email existe).
const DUMMY_HASH = bcrypt.hashSync("mot-de-passe-inexistant", 10);

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Trop de tentatives de connexion, réessayez dans quelques minutes.",
});

// `pool` est injecté (plutôt qu'importé directement) pour pouvoir brancher un pool
// factice dans les tests sans dépendre d'un vrai serveur MySQL.
function createAdminRouter(pool) {
  const router = express.Router();

  router.post(
    "/login",
    loginLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, motDePasse } = req.body;

      const [rows] = await pool.query(
        "SELECT id, email, password_hash FROM admin_user WHERE email = ?",
        [email],
      );
      const user = rows[0];

      const valid = await bcrypt.compare(motDePasse, user ? user.password_hash : DUMMY_HASH);
      if (!user || !valid) {
        throw new AppError(401, "Identifiants incorrects.");
      }

      // Nouvel identifiant de session à la connexion : empêche la fixation de session.
      await new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
      req.session.isAdmin = true;
      req.session.adminId = user.id;
      req.session.adminEmail = user.email;
      res.json({ message: "Connecté." });
    }),
  );

  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Déconnecté." });
    });
  });

  router.get("/session", (req, res) => {
    res.json({
      isAdmin: Boolean(req.session && req.session.isAdmin),
      email: req.session ? req.session.adminEmail : undefined,
    });
  });

  router.get(
    "/questions",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const [questions] = await pool.query(
        `SELECT id, texte, date, statut, reponse, date_reponse AS dateReponse
         FROM question
         ORDER BY date DESC`,
      );
      res.json(questions);
    }),
  );

  router.post(
    "/questions/:id/answer",
    requireAdmin,
    validate(answerSchema),
    asyncHandler(async (req, res) => {
      const { reponse } = req.body;

      const [result] = await pool.query(
        `UPDATE question
         SET reponse = ?, statut = 'repondu', date_reponse = NOW()
         WHERE id = ?`,
        [reponse, req.params.id],
      );

      if (result.affectedRows === 0) {
        throw new AppError(404, "Question introuvable.");
      }

      res.json({ message: "Réponse enregistrée." });
    }),
  );

  return router;
}

module.exports = createAdminRouter;
