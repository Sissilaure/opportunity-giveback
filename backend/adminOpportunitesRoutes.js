const express = require("express");
const requireAdmin = require("./requireAdmin");
const validate = require("./validate");
const { opportuniteAdminSchema } = require("./schemas");
const { AppError, asyncHandler } = require("./errors");
const { formatOpportunite, findOrCreateStructure } = require("./opportunites");
const { rechercherNouvellesOpportunites } = require("./discoveryIA");
const createRateLimiter = require("./rateLimit");
const { importSchema, importerOpportunites, enrichirImages: enrichirImagesParDefaut } = require("./importOpportunites");

const STATUTS_VALIDES = ["verifiee", "a_verifier", "expiree"];

// Coûte un appel Gemini à chaque déclenchement : on limite les usages manuels.
const rechercheLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Trop de recherches lancées, réessaie dans quelques minutes.",
});

// Un import écrit jusqu'à 100 lignes d'un coup : on borne la fréquence.
const importLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Trop d'imports lancés, réessayez dans quelques minutes.",
});

// `pool` injecté comme les autres routeurs : testable sans base réelle.
// `enrichirImages` est injectable aussi : les tests ne doivent pas lire de vrais sites web.
function createAdminOpportunitesRouter(pool, { enrichirImages = enrichirImagesParDefaut } = {}) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const statut = STATUTS_VALIDES.includes(req.query.statut) ? req.query.statut : null;
      const sql = `
        SELECT o.*, s.nom AS organisme, s.site_web
        FROM opportunite o
        JOIN structure_partenaire s ON s.id_structure = o.id_structure
        ${statut ? "WHERE o.statut = ?" : ""}
        ORDER BY o.id DESC
      `;
      const [rows] = await pool.query(sql, statut ? [statut] : []);
      res.json({ opportunites: rows.map(formatOpportunite) });
    }),
  );

  router.post(
    "/",
    validate(opportuniteAdminSchema),
    asyncHandler(async (req, res) => {
      const b = req.body;
      const idStructure = await findOrCreateStructure(pool, b.organisme, b.siteWeb);
      await pool.query(
        `INSERT INTO opportunite
           (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'verifiee')`,
        [b.titre, b.type, idStructure, b.publicEligible, b.criteres, b.piecesRequises, b.dateEcheance, b.lienSource],
      );
      res.status(201).json({ message: "Opportunité ajoutée et publiée." });
    }),
  );

  router.post(
    "/importer",
    importLimiter,
    validate(importSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await importerOpportunites(pool, req.body.lignes, req.body.mode, { enrichirImages }));
    }),
  );

  router.post(
    "/:id/approuver",
    asyncHandler(async (req, res) => {
      const [result] = await pool.query(
        "UPDATE opportunite SET statut = 'verifiee', date_verification = NOW() WHERE id = ?",
        [req.params.id],
      );
      if (result.affectedRows === 0) throw new AppError(404, "Opportunité introuvable.");
      res.json({ message: "Opportunité publiée." });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const [result] = await pool.query("DELETE FROM opportunite WHERE id = ?", [req.params.id]);
      if (result.affectedRows === 0) throw new AppError(404, "Opportunité introuvable.");
      res.json({ message: "Opportunité supprimée." });
    }),
  );

  router.post(
    "/rechercher-ia",
    rechercheLimiter,
    asyncHandler(async (req, res) => {
      if (!process.env.GEMINI_API_KEY) {
        throw new AppError(503, "Recherche IA indisponible : clé Gemini non configurée.");
      }
      try {
        const resultat = await rechercherNouvellesOpportunites(pool);
        res.json(resultat);
      } catch (err) {
        console.error("Erreur recherche IA (admin):", err);
        throw new AppError(502, "La recherche IA a échoué, réessaie plus tard.");
      }
    }),
  );

  return router;
}

module.exports = createAdminOpportunitesRouter;
