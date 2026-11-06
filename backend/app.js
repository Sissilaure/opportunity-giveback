const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { AppError, asyncHandler, errorHandler } = require("./errors");
const validate = require("./validate");
const { opportunitesQuerySchema } = require("./schemas");
const { formatOpportunite } = require("./opportunites");

const resourcesRoutes = require("./resourcesRoutes");
const faqRoutes = require("./faqRoutes");
const contenuRoutes = require("./contenuRoutes");
const createNewsletterRouter = require("./newsletterRoutes");
const createQuestionsRouter = require("./questionsRoutes");
const createAdminRouter = require("./adminRoutes");
const createRechercheIaRouter = require("./rechercheIaRoutes");
const createAdminOpportunitesRouter = require("./adminOpportunitesRoutes");

// `pool` est injecté plutôt qu'importé directement : les tests peuvent ainsi
// construire l'app avec un pool factice, sans dépendre d'un vrai serveur MySQL.
// `sessionStore` est optionnel : sans lui (comme dans les tests), express-session
// retombe sur son MemoryStore par défaut, sans jamais toucher au pool factice.
function createApp({ pool, sessionStore }) {
  const app = express();
  app.set("trust proxy", 1);

  const isProd = process.env.NODE_ENV === "production";

  // "*" + credentials:true est rejeté par les navigateurs : en prod, FRONTEND_URL doit être défini.
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
  if (!process.env.FRONTEND_URL && isProd) {
    console.warn(
      "FRONTEND_URL n'est pas défini : CORS est restreint à http://localhost:5173, ce qui bloquera le frontend en production."
    );
  }

  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json());

  // Session pour l'espace équipe (Ressources/Aide). Stockée en base (sessionStore) en
  // production : sans ça, un redémarrage/réveil du service (courant sur un hébergement
  // gratuit) déconnecte tout le monde puisque la MemoryStore par défaut repart à zéro.
  app.use(
    session({
      name: "connect.sid",
      secret: process.env.SESSION_SECRET || "dev-secret-a-changer",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // sameSite:"none"+secure exige HTTPS : nécessaire en prod (domaines différents),
        // mais empêche le cookie de se poser en dev sur http://localhost.
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 8,
      },
    })
  );

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // ---------- Opportunités (Répertoire / Fiche détaillée) ----------

  app.get(
    "/api/opportunites",
    validate(opportunitesQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { q, type, page, pageSize } = req.query;

      let whereSql = "WHERE o.statut = 'verifiee'";
      const params = [];

      if (q) {
        whereSql += " AND (o.titre LIKE ? OR s.nom LIKE ?)";
        params.push(`%${q}%`, `%${q}%`);
      }

      if (type) {
        whereSql += " AND o.type = ?";
        params.push(type);
      }

      const fromSql = `
        FROM opportunite o
        JOIN structure_partenaire s ON s.id_structure = o.id_structure
        ${whereSql}
      `;

      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${fromSql}`, params);

      let sql = `
        SELECT o.*, s.nom AS organisme, s.site_web
        ${fromSql}
        ORDER BY
          CASE WHEN o.date_echeance IS NULL THEN 1 ELSE 0 END,
          o.date_echeance ASC,
          o.date_verification DESC
      `;
      const listParams = [...params];

      // La pagination reste optionnelle : sans `page`, on renvoie tout (comportement historique).
      if (page) {
        const size = pageSize || 20;
        sql += " LIMIT ? OFFSET ?";
        listParams.push(size, (page - 1) * size);
      }

      const [rows] = await pool.query(sql, listParams);
      res.json({
        total,
        page: page || 1,
        pageSize: page ? pageSize || 20 : total,
        opportunites: rows.map(formatOpportunite),
      });
    }),
  );

  app.get(
    "/api/opportunites/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const sql = `
        SELECT o.*, s.nom AS organisme, s.site_web
        FROM opportunite o
        JOIN structure_partenaire s ON s.id_structure = o.id_structure
        WHERE o.id = ? AND o.statut = 'verifiee'
      `;
      const [rows] = await pool.query(sql, [id]);

      if (rows.length === 0) {
        throw new AppError(404, "Opportunité introuvable.");
      }
      res.json(formatOpportunite(rows[0]));
    }),
  );

  // Chiffres réels pour l'accueil : uniquement les opportunités publiées (statut 'verifiee').
  app.get(
    "/api/stats",
    asyncHandler(async (req, res) => {
      const [parType] = await pool.query(
        "SELECT type, COUNT(*) AS total FROM opportunite WHERE statut = 'verifiee' GROUP BY type",
      );
      const [[{ organismes }]] = await pool.query(
        "SELECT COUNT(DISTINCT id_structure) AS organismes FROM opportunite WHERE statut = 'verifiee'",
      );
      const parTypeMap = Object.fromEntries(parType.map((r) => [r.type, Number(r.total)]));
      const total = Object.values(parTypeMap).reduce((a, b) => a + b, 0);
      res.json({ total, organismes: Number(organismes), parType: parTypeMap });
    }),
  );

  app.use("/api/recherche-ia", createRechercheIaRouter(pool));

  // ---------- Ressources pratiques / Canal d'orientation ----------

  app.use("/api/resources", resourcesRoutes);
  app.use("/api/faq", faqRoutes);
  app.use("/api", contenuRoutes);
  app.use("/api/newsletter", createNewsletterRouter(pool));
  app.use("/api/questions", createQuestionsRouter(pool));
  app.use("/api/admin/opportunites", createAdminOpportunitesRouter(pool));
  app.use("/api/admin", createAdminRouter(pool));

  app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
