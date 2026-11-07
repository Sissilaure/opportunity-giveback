const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const session = require("express-session");
const { AppError, asyncHandler, errorHandler } = require("./errors");
const validate = require("./validate");
const createRateLimiter = require("./rateLimit");
const { createOriginGuard, normalizeOrigin } = require("./security");
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
const createCompteRouter = require("./compteRoutes");

// `pool` est injecté plutôt qu'importé directement : les tests peuvent ainsi
// construire l'app avec un pool factice, sans dépendre d'un vrai serveur MySQL.
// `sessionStore` est optionnel : sans lui (comme dans les tests), express-session
// retombe sur son MemoryStore par défaut, sans jamais toucher au pool factice.
function createApp({ pool, sessionStore }) {
  const app = express();
  app.set("trust proxy", 1);

  const isProd = process.env.NODE_ENV === "production";

  // "*" + credentials:true est rejeté par les navigateurs : en prod, FRONTEND_URL doit être défini.
  const allowedOrigin = normalizeOrigin(process.env.FRONTEND_URL || "http://localhost:5173");
  if (!process.env.FRONTEND_URL && isProd) {
    console.warn(
      "FRONTEND_URL n'est pas défini : CORS est restreint à http://localhost:5173, ce qui bloquera le frontend en production."
    );
  }

  // Sans secret propre, les cookies de session seraient signés avec une valeur publique (visible dans le code).
  if (isProd && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET est obligatoire en production.");
  }
  // Un secret court se devine par force brute : il signe le cookie de session de l'espace équipe.
  if (isProd && process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET est trop court (32 caractères minimum) : voir backend/.env.example.");
  }

  app.disable("x-powered-by");
  // L'API ne sert que du JSON : en-têtes stricts, et ressources lisibles depuis le frontend (autre domaine).
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  // JSON compressé : gain net sur les connexions mobiles lentes.
  app.use(compression());
  app.use(express.json({ limit: "20kb" }));
  app.use(createOriginGuard(allowedOrigin));
  app.use(
    "/api",
    createRateLimiter({ windowMs: 60 * 1000, max: 900, message: "Trop de requêtes, réessayez dans une minute." }),
  );

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

  // Lectures publiques : cache court (le navigateur et le CDN évitent des allers-retours). L'espace équipe n'est jamais mis en cache.
  app.use(["/api/opportunites", "/api/stats", "/api/equipe", "/api/temoignages", "/api/resources", "/api/faq"], (req, res, next) => {
    if (req.method === "GET") res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    next();
  });
  app.use("/api/admin", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

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
        // % et _ saisis par le visiteur sont des jokers SQL : on les neutralise pour chercher le texte tel quel.
        const motif = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
        whereSql += " AND (o.titre LIKE ? OR s.nom LIKE ?)";
        params.push(motif, motif);
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
        "SELECT type, COUNT(*) AS total FROM opportunite WHERE statut = 'verifiee' AND (date_echeance IS NULL OR date_echeance >= CURDATE()) GROUP BY type",
      );
      const [[{ organismes }]] = await pool.query(
        "SELECT COUNT(DISTINCT id_structure) AS organismes FROM opportunite WHERE statut = 'verifiee' AND (date_echeance IS NULL OR date_echeance >= CURDATE())",
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
  app.use("/api/compte", createCompteRouter(pool));
  app.use("/api/questions", createQuestionsRouter(pool));
  app.use("/api/admin/opportunites", createAdminOpportunitesRouter(pool));
  app.use("/api/admin", createAdminRouter(pool));

  app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
