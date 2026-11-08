// Import en lot d'opportunités par l'équipe (collage d'un tableur / fichier CSV côté interface).
// Chaque ligne est validée séparément : une ligne fausse n'empêche pas les autres, et le compte rendu dit laquelle pose problème.
const { z } = require("zod");
const { opportuniteAdminSchema } = require("./schemas");
const { findOrCreateStructure } = require("./opportunites");
const { lireHtml } = require("./safeFetch");
const { extraireImage } = require("./verification");
const { safeHttpUrl } = require("./security");

const MAX_LIGNES = 100;

const importSchema = z.object({
  mode: z.enum(["publier", "a_verifier"], { message: "Mode d'import inconnu." }),
  lignes: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "Aucune ligne à importer.")
    .max(MAX_LIGNES, `${MAX_LIGNES} lignes maximum par import : découpez le fichier.`),
});

// Image facultative fournie dans le fichier : https uniquement, jamais javascript: ni data:.
const ligneSchema = opportuniteAdminSchema.extend({
  imageUrl: z
    .string()
    .trim()
    .max(500, "Adresse d'image trop longue.")
    .refine((v) => v === "" || (v.startsWith("https://") && safeHttpUrl(v) !== null), "L'image doit être une adresse https.")
    .optional()
    .default(""),
});

const LIBELLES = {
  titre: "Titre",
  type: "Type",
  organisme: "Organisme",
  siteWeb: "Site web",
  publicEligible: "Public éligible",
  criteres: "Critères",
  piecesRequises: "Pièces requises",
  dateEcheance: "Date limite",
  lienSource: "Lien source",
  imageUrl: "Image",
};

function formaterErreur(erreur) {
  const issue = erreur.issues[0];
  const champ = LIBELLES[issue.path[0]] || issue.path[0] || "Ligne";
  // Un message déjà explicite (« Titre trop court. ») n'a pas besoin du nom du champ en plus.
  return /^[A-ZÉ]/.test(issue.message) && issue.message.toLowerCase().includes(String(champ).toLowerCase())
    ? issue.message
    : `${champ} : ${issue.message}`;
}

// « Bourse Chevening » et « bourse  CHEVENING » (ou avec accents différents) sont le même titre.
const normaliserTitre = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * @param mode "publier" : l'équipe a vérifié, la fiche est publiée tout de suite ;
 *             "a_verifier" : mise en attente (la lecture automatique de la source pourra la publier ensuite).
 */
async function importerOpportunites(pool, lignes, mode, { enrichirImages } = {}) {
  const [existants] = await pool.query("SELECT titre FROM opportunite");
  const dejaVus = new Set(existants.map((r) => normaliserTitre(r.titre)));
  const structures = new Map();
  const resultats = [];
  const aIllustrer = [];
  const publier = mode === "publier";

  for (let i = 0; i < lignes.length; i++) {
    const numero = i + 1;
    const analyse = ligneSchema.safeParse(lignes[i]);
    if (!analyse.success) {
      resultats.push({ ligne: numero, statut: "invalide", titre: String(lignes[i]?.titre ?? "").slice(0, 80), raison: formaterErreur(analyse.error) });
      continue;
    }
    const b = analyse.data;
    const cle = normaliserTitre(b.titre);
    if (dejaVus.has(cle)) {
      resultats.push({ ligne: numero, statut: "doublon", titre: b.titre, raison: "Une opportunité avec ce titre existe déjà (ou figure plus haut dans le fichier)." });
      continue;
    }
    dejaVus.add(cle);

    let idStructure = structures.get(b.organisme);
    if (!idStructure) {
      idStructure = await findOrCreateStructure(pool, b.organisme, b.siteWeb || null);
      structures.set(b.organisme, idStructure);
    }

    const [res] = await pool.query(
      `INSERT INTO opportunite
         (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source,
          date_verification, statut, image_url, verification_auto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${publier ? "NOW()" : "NULL"}, ?, ?, 0)`,
      [b.titre, b.type, idStructure, b.publicEligible, b.criteres, b.piecesRequises, b.dateEcheance, b.lienSource, publier ? "verifiee" : "a_verifier", b.imageUrl || null],
    );
    resultats.push({ ligne: numero, statut: "ajoutee", titre: b.titre });
    if (!b.imageUrl) aIllustrer.push({ id: res.insertId, lienSource: b.lienSource });
  }

  // Les images se récupèrent APRÈS la réponse : lire 100 sites prendrait des minutes, l'équipe n'a pas à attendre.
  if (enrichirImages && aIllustrer.length > 0) {
    Promise.resolve(enrichirImages(pool, aIllustrer)).catch(() => {});
  }

  const compte = (s) => resultats.filter((r) => r.statut === s).length;
  return { ajoutees: compte("ajoutee"), doublons: compte("doublon"), invalides: compte("invalide"), mode, resultats };
}

// Va chercher l'image d'aperçu publiée par l'organisme sur la page du lien source (3 sites à la fois, 6 s maximum chacun).
// L'image est un confort : toute erreur est ignorée, la fiche garde alors la photo de sa catégorie.
async function enrichirImages(pool, elements, { lire = lireHtml, concurrence = 3 } = {}) {
  const file = [...elements];
  async function travailleur() {
    while (file.length > 0) {
      const el = file.shift();
      try {
        const page = await lire(el.lienSource, { delai: 6000 });
        if (page.status >= 200 && page.status < 300 && page.html) {
          const image = extraireImage(page.html, page.url);
          if (image) await pool.query("UPDATE opportunite SET image_url = ? WHERE id = ? AND image_url IS NULL", [image, el.id]);
        }
      } catch {
        /* ignoré volontairement */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrence, file.length) }, travailleur));
}

module.exports = { importSchema, importerOpportunites, enrichirImages, MAX_LIGNES, normaliserTitre };
