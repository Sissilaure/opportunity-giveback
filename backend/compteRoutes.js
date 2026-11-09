// Comptes utilisateurs : inscription, connexion, suivi de candidatures, notifications dans l'application.
// Aucune adresse email n'est utilisée pour envoyer quoi que ce soit : les rappels s'affichent dans l'appli
// (cloche), calculés à la demande à partir des échéances des opportunités suivies. Pas de tâche planifiée à maintenir.
const express = require("express");
const { z } = require("zod");
const { hashMotDePasse, verifierMotDePasse, hashFactice } = require("./motDePasse");
const createRateLimiter = require("./rateLimit");
const validate = require("./validate");
const { AppError, asyncHandler } = require("./errors");
const { formatOpportunite, joursAvant } = require("./opportunites");

const STATUTS_SUIVI = ["a_faire", "en_cours", "soumise", "acceptee", "refusee"];
const MAX_SUIVIS = 200;
const TRENTE_JOURS_MS = 30 * 24 * 60 * 60 * 1000;

// Avec un minimum de 8 caractères, c'est cette liste qui protège : on refuse les mots de passe les plus utilisés au monde.
const MOTS_DE_PASSE_FAIBLES = new Set([
  "12345678", "123456789", "1234567890", "12345678910", "0123456789", "87654321", "11111111", "00000000", "88888888",
  "azertyui", "azertyuiop", "azerty123", "azerty12", "azerty1234", "qwertyui", "qwertyuiop", "qwerty123", "qwerty12", "abcd1234", "abc12345", "a1b2c3d4",
  "motdepasse", "motdepasse1", "motdepasse123", "password", "password1", "password12", "password123", "passw0rd", "passw0rd123",
  "iloveyou", "iloveyou1", "iloveyou123", "bienvenue", "bienvenue1", "bonjour123", "soleil123", "doudou123", "chocolat1",
  "football", "football1", "football123", "admin123", "administrateur", "welcome1", "welcome123", "letmein1", "yeelen2026", "yeelen12345", "yeelen123", "giveback", "giveback123", "burkina123", "ouaga2026",
]);

const motDePasse = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(200, "Mot de passe trop long.");

const inscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(255, "Email trop long."),
  motDePasse,
  prenom: z.string().trim().max(80, "Prénom trop long.").optional().default(""),
  // Acceptation explicite de la politique de confidentialité : sans elle, pas de compte.
  consentement: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter la politique de confidentialité pour créer un compte." }) }),
});

const connexionSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email requis.").max(255, "Email trop long."),
  motDePasse: z.string().min(1, "Mot de passe requis.").max(200, "Mot de passe trop long."),
});

const idOpportunite = z.coerce.number().int().positive();
const suiviSchema = z
  .object({
    statut: z.enum(STATUTS_SUIVI).optional(),
    note: z.string().trim().max(500, "Note trop longue (500 caractères maximum).").optional(),
  })
  .refine((v) => v.statut !== undefined || v.note !== undefined, { message: "Rien à mettre à jour." });
const importSchema = z.object({ ids: z.array(idOpportunite).max(100, "Trop d'éléments à importer.") });
const luesSchema = z.object({ cles: z.array(z.string().trim().min(1).max(80)).max(100) });
const suppressionSchema = z.object({ motDePasse: z.string().min(1, "Mot de passe requis.").max(200) });

const inscriptionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 40, // un amphithéâtre entier peut s'inscrire depuis le wifi du campus (une seule adresse IP)
  message: "Trop de créations de compte depuis cette connexion, réessayez plus tard.",
});
const connexionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 80, // le verrou par compte (8 essais) protège les comptes ; celui-ci évite seulement l'abus massif
  message: "Trop de tentatives de connexion, réessayez dans quelques minutes.",
});
const connexionCompteLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Trop de tentatives sur ce compte, réessayez dans quelques minutes.",
  key: (req) => `utilisateur:${String(req.body?.email || "").trim().toLowerCase().slice(0, 255)}`,
});

const publicUser = (u) => ({ id: u.id, email: u.email, prenom: u.prenom || "" });

function requireUser(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: "Connexion requise." });
}

// Nouvel identifiant de session à chaque connexion (anti-fixation) ; session de 30 jours pour les utilisateurs.
async function ouvrirSession(req, utilisateur) {
  await new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
  req.session.userId = utilisateur.id;
  req.session.userEmail = utilisateur.email;
  req.session.cookie.maxAge = TRENTE_JOURS_MS;
}

// Une clé par notification : permet de savoir si elle a été lue, et de ne pas la répéter.
function construireNotifications(suivis, nouvellesOpportunites, maintenant = new Date()) {
  const notifications = [];
  for (const s of suivis) {
    // Une candidature déjà envoyée (ou close) n'a plus besoin de rappel d'échéance.
    if (!["a_faire", "en_cours"].includes(s.suivi_statut) || !s.date_echeance) continue;
    const jours = joursAvant(s.date_echeance, maintenant);
    if (jours === null) continue;
    let palier = null;
    if (jours < 0 && jours >= -7) palier = "depassee";
    else if (jours >= 0 && jours <= 1) palier = "j1";
    else if (jours <= 3 && jours > 1) palier = "j3";
    else if (jours <= 7 && jours > 3) palier = "j7";
    if (!palier) continue;

    const message =
      palier === "depassee"
        ? "La date limite est dépassée."
        : jours === 0
          ? "La date limite est aujourd'hui."
          : `Plus que ${jours} jour${jours > 1 ? "s" : ""} pour candidater.`;
    notifications.push({
      cle: `${s.id}:${palier}`,
      type: "echeance",
      niveau: palier === "j7" ? "info" : "urgent",
      titre: s.titre,
      message,
      idOpportunite: s.id,
    });
  }

  if (nouvellesOpportunites > 0) {
    // Une notification par semaine (semaine ISO approchée par le numéro de jour / 7).
    const semaine = Math.floor(maintenant.getTime() / (7 * 86400000));
    notifications.push({
      cle: `nouv:${semaine}`,
      type: "nouveautes",
      niveau: "info",
      titre: "Nouvelles opportunités",
      message: `${nouvellesOpportunites} opportunité${nouvellesOpportunites > 1 ? "s ont été ajoutées" : " a été ajoutée"} cette semaine.`,
      idOpportunite: null,
    });
  }
  return notifications;
}

function createCompteRouter(pool) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store"); // données personnelles : jamais en cache partagé
    next();
  });

  router.post(
    "/inscription",
    inscriptionLimiter,
    validate(inscriptionSchema),
    asyncHandler(async (req, res) => {
      const { email, motDePasse: mdp, prenom } = req.body;
      if (MOTS_DE_PASSE_FAIBLES.has(mdp.toLowerCase()) || mdp.toLowerCase() === email || /^(.)\1+$/.test(mdp)) {
        throw new AppError(400, "Ce mot de passe est trop facile à deviner, choisissez-en un autre.");
      }
      const hash = await hashMotDePasse(mdp);
      let insertId;
      try {
        const [result] = await pool.query("INSERT INTO utilisateur (email, password_hash, prenom) VALUES (?, ?, ?)", [
          email,
          hash,
          prenom || null,
        ]);
        insertId = result.insertId;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
          throw new AppError(409, "Un compte existe déjà avec cet email. Connectez-vous.");
        }
        throw err;
      }
      const utilisateur = { id: insertId, email, prenom };
      await ouvrirSession(req, utilisateur);
      res.status(201).json({ utilisateur: publicUser(utilisateur) });
    }),
  );

  router.post(
    "/connexion",
    connexionLimiter,
    validate(connexionSchema),
    connexionCompteLimiter,
    asyncHandler(async (req, res) => {
      const { email, motDePasse: mdp } = req.body;
      const [rows] = await pool.query("SELECT id, email, prenom, password_hash FROM utilisateur WHERE email = ?", [email]);
      const user = rows[0];
      // Comparaison faite même si le compte n'existe pas : même durée de réponse (pas de fuite par le temps).
      const valide = await verifierMotDePasse(mdp, user ? user.password_hash : await hashFactice());
      if (!user || !valide) throw new AppError(401, "Email ou mot de passe incorrect.");
      await ouvrirSession(req, user);
      res.json({ utilisateur: publicUser(user) });
    }),
  );

  router.post("/deconnexion", (req, res) => {
    req.session.destroy(() => {
      const prod = process.env.NODE_ENV === "production";
      res.clearCookie("connect.sid", { httpOnly: true, sameSite: prod ? "none" : "lax", secure: prod });
      res.json({ message: "Déconnecté." });
    });
  });

  router.get(
    "/moi",
    asyncHandler(async (req, res) => {
      if (!req.session || !req.session.userId) return res.json({ utilisateur: null });
      const [rows] = await pool.query("SELECT id, email, prenom FROM utilisateur WHERE id = ?", [req.session.userId]);
      if (!rows[0]) return res.json({ utilisateur: null }); // compte supprimé entre-temps
      res.json({ utilisateur: publicUser(rows[0]) });
    }),
  );

  // Suppression du compte et de toutes ses données (droit à l'effacement), avec confirmation par mot de passe.
  router.delete(
    "/moi",
    requireUser,
    validate(suppressionSchema),
    asyncHandler(async (req, res) => {
      const [rows] = await pool.query("SELECT password_hash FROM utilisateur WHERE id = ?", [req.session.userId]);
      const valide = await verifierMotDePasse(req.body.motDePasse, rows[0] ? rows[0].password_hash : await hashFactice());
      if (!rows[0] || !valide) throw new AppError(401, "Mot de passe incorrect.");
      const id = req.session.userId;
      await pool.query("DELETE FROM suivi_candidature WHERE id_utilisateur = ?", [id]);
      await pool.query("DELETE FROM notification_lue WHERE id_utilisateur = ?", [id]);
      await pool.query("DELETE FROM utilisateur WHERE id = ?", [id]);
      req.session.destroy(() => res.json({ message: "Compte supprimé." }));
    }),
  );

  // ---------- Suivi des candidatures ----------
  router.get(
    "/suivi",
    requireUser,
    asyncHandler(async (req, res) => {
      const [rows] = await pool.query(
        `SELECT o.*, s.nom AS organisme, s.site_web, c.statut AS suivi_statut, c.note AS suivi_note, c.updated_at AS suivi_maj
         FROM suivi_candidature c
         JOIN opportunite o ON o.id = c.id_opportunite
         JOIN structure_partenaire s ON s.id_structure = o.id_structure
         WHERE c.id_utilisateur = ? AND o.statut IN ('verifiee', 'expiree')
         ORDER BY c.updated_at DESC`,
        [req.session.userId],
      );
      res.json({
        suivis: rows.map((r) => ({
          ...formatOpportunite(r),
          suiviStatut: r.suivi_statut,
          note: r.suivi_note || "",
          miseAJour: r.suivi_maj,
        })),
      });
    }),
  );

  router.put(
    "/suivi/:id",
    requireUser,
    validate(suiviSchema),
    asyncHandler(async (req, res) => {
      const id = idOpportunite.safeParse(req.params.id);
      if (!id.success) throw new AppError(400, "Opportunité invalide.");

      const [opp] = await pool.query("SELECT id FROM opportunite WHERE id = ? AND statut = 'verifiee'", [id.data]);
      if (!opp[0]) throw new AppError(404, "Opportunité introuvable.");

      const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM suivi_candidature WHERE id_utilisateur = ?", [
        req.session.userId,
      ]);
      const [existe] = await pool.query("SELECT 1 FROM suivi_candidature WHERE id_utilisateur = ? AND id_opportunite = ?", [
        req.session.userId,
        id.data,
      ]);
      if (!existe[0] && Number(total) >= MAX_SUIVIS) {
        throw new AppError(400, `Vous suivez déjà ${MAX_SUIVIS} opportunités : retirez-en avant d'en ajouter.`);
      }

      const { statut = "a_faire", note = null } = req.body;
      await pool.query(
        `INSERT INTO suivi_candidature (id_utilisateur, id_opportunite, statut, note)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           statut = IF(? IS NULL, statut, VALUES(statut)),
           note = IF(? IS NULL, note, VALUES(note))`,
        [req.session.userId, id.data, statut, note, req.body.statut === undefined ? null : statut, req.body.note === undefined ? null : note],
      );
      res.json({ message: "Suivi enregistré." });
    }),
  );

  router.delete(
    "/suivi/:id",
    requireUser,
    asyncHandler(async (req, res) => {
      const id = idOpportunite.safeParse(req.params.id);
      if (!id.success) throw new AppError(400, "Opportunité invalide.");
      await pool.query("DELETE FROM suivi_candidature WHERE id_utilisateur = ? AND id_opportunite = ?", [req.session.userId, id.data]);
      res.json({ message: "Retiré du suivi." });
    }),
  );

  // Reprend le suivi gardé sur l'appareil (avant la création du compte) : seules les opportunités existantes sont gardées.
  router.post(
    "/suivi/importer",
    requireUser,
    validate(importSchema),
    asyncHandler(async (req, res) => {
      const ids = [...new Set(req.body.ids)];
      if (ids.length === 0) return res.json({ importes: 0 });
      const [valides] = await pool.query(
        `SELECT id FROM opportunite WHERE statut = 'verifiee' AND id IN (${ids.map(() => "?").join(",")})`,
        ids,
      );
      for (const { id } of valides.slice(0, MAX_SUIVIS)) {
        await pool.query("INSERT IGNORE INTO suivi_candidature (id_utilisateur, id_opportunite) VALUES (?, ?)", [req.session.userId, id]);
      }
      res.json({ importes: valides.length });
    }),
  );

  // ---------- Notifications ----------
  router.get(
    "/notifications",
    requireUser,
    asyncHandler(async (req, res) => {
      const [suivis] = await pool.query(
        `SELECT o.id, o.titre, o.date_echeance, c.statut AS suivi_statut
         FROM suivi_candidature c JOIN opportunite o ON o.id = c.id_opportunite
         WHERE c.id_utilisateur = ? AND o.statut = 'verifiee' AND o.date_echeance IS NOT NULL`,
        [req.session.userId],
      );
      const [[{ n }]] = await pool.query(
        "SELECT COUNT(*) AS n FROM opportunite WHERE statut = 'verifiee' AND date_verification >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
      );
      const [lues] = await pool.query("SELECT cle FROM notification_lue WHERE id_utilisateur = ?", [req.session.userId]);
      const dejaLues = new Set(lues.map((l) => l.cle));

      const notifications = construireNotifications(suivis, Number(n)).map((x) => ({ ...x, lue: dejaLues.has(x.cle) }));
      // Les plus urgentes d'abord, puis les non lues.
      notifications.sort((a, b) => Number(a.lue) - Number(b.lue) || (a.niveau === "urgent" ? -1 : 1) - (b.niveau === "urgent" ? -1 : 1));
      res.json({ notifications, nonLues: notifications.filter((x) => !x.lue).length });
    }),
  );

  router.post(
    "/notifications/lues",
    requireUser,
    validate(luesSchema),
    asyncHandler(async (req, res) => {
      for (const cle of [...new Set(req.body.cles)]) {
        await pool.query("INSERT IGNORE INTO notification_lue (id_utilisateur, cle) VALUES (?, ?)", [req.session.userId, cle]);
      }
      res.json({ message: "Notifications marquées comme lues." });
    }),
  );

  return router;
}

module.exports = createCompteRouter;
module.exports.construireNotifications = construireNotifications;
