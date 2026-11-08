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

// Verrou par compte, en plus du verrou par IP : sans lui, quelqu'un qui change d'adresse IP peut essayer
// des mots de passe à l'infini sur le compte d'un membre de l'équipe.
const loginCompteLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Trop de tentatives sur ce compte, réessayez dans quelques minutes.",
  key: (req) => `compte:${String(req.body?.email || "").trim().toLowerCase().slice(0, 255)}`,
});

// `pool` est injecté (plutôt qu'importé directement) pour pouvoir brancher un pool
// factice dans les tests sans dépendre d'un vrai serveur MySQL.
function createAdminRouter(pool) {
  const router = express.Router();

  router.post(
    "/login",
    loginLimiter,
    validate(loginSchema),
    loginCompteLimiter,
    asyncHandler(async (req, res) => {
      const { email, motDePasse } = req.body;

      const [rows] = await pool.query(
        "SELECT id, email, password_hash FROM admin_user WHERE email = ?",
        [email],
      );
      const user = rows[0];

      const valid = await bcrypt.compare(motDePasse, user ? user.password_hash : DUMMY_HASH);
      if (!user || !valid) {
        // Trace côté serveur (journaux Render) pour repérer une attaque ; jamais le mot de passe.
        console.warn(`Connexion refusée depuis ${req.ip}`);
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
      // Mêmes attributs que le cookie posé à la connexion, sinon le navigateur ne le supprime pas (SameSite=None + Secure en prod).
      const prod = process.env.NODE_ENV === "production";
      res.clearCookie("connect.sid", { httpOnly: true, sameSite: prod ? "none" : "lax", secure: prod });
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
