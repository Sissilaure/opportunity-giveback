const { generateJson } = require("./gemini");
const { fetchOpportunitesVerifiees, findOrCreateStructure } = require("./opportunites");
const { TYPES_OPPORTUNITE } = require("./schemas");
const { safeHttpUrl } = require("./security");
const { verifierSource } = require("./verification");

// Publication directe quand la source officielle a été lue et correspond ; sinon la piste reste « à vérifier ».
// Désactivable (AUTO_PUBLISH=false) pour revenir à une validation humaine systématique.
const autoPublier = () => process.env.AUTO_PUBLISH !== "false";

async function verifierSansPlanter(candidat) {
  try {
    return await verifierSource(candidat);
  } catch (err) {
    return { verifiee: false, raison: err.message, imageUrl: null };
  }
}

// Important : la clé Gemini gratuite de ce projet n'a pas accès au "grounding" Google Search
// (quota 429 constaté), donc ce prompt s'appuie sur les connaissances propres du modèle, pas
// une recherche web en direct. Pour limiter le risque d'invention, on demande explicitement
// de ne proposer que des programmes bien établis, et TOUT atterrit en statut 'a_verifier' :
// rien n'est jamais publié sans qu'un humain de l'équipe clique sur "Publier".
function buildPrompt(existantes) {
  const resume = existantes.map((o) => `${o.titre} (${o.organisme})`).join("; ") || "aucune";

  const compteParType = existantes.reduce((acc, o) => {
    acc[o.type] = (acc[o.type] || 0) + 1;
    return acc;
  }, {});
  const repartition = TYPES_OPPORTUNITE.map((t) => `${t}: ${compteParType[t] || 0}`).join(", ");

  return `Tu aides une petite équipe à repérer des pistes de bourses, stages, emplois ou concours pour des étudiant·e·s africain·e·s francophones. Une équipe humaine vérifiera et validera chaque piste avant publication. Ton rôle est uniquement de proposer, jamais de garantir.

Opportunités déjà présentes dans la base (ne les répète pas) :
${resume}

Répartition actuelle par type (${repartition}) : privilégie les types les moins représentés plutôt que d'ajouter encore des bourses si elles sont déjà nombreuses.

Propose entre 4 et 6 opportunités, en couvrant si possible plusieurs types différents (bourse, stage, emploi, concours, autre), pas uniquement le même type. Règle stricte : ne propose que des programmes réputés et bien établis dont tu es raisonnablement confiant qu'ils existent réellement avec ces caractéristiques. Si tu doutes d'un détail précis (date, montant, URL exacte), n'invente rien : soit tu ne proposes pas cette opportunité, soit tu laisses le champ concerné vague plutôt que faux.

Réponds strictement en JSON, sans aucun texte autour :
{"propositions": [{"titre": "...", "type": "bourse|stage|emploi|concours|autre", "organisme": "...", "siteWeb": "https://...", "publicEligible": "...", "criteres": ["...", "..."], "piecesRequises": ["...", "..."], "lienSource": "https://..."}]}`;
}

async function rechercherNouvellesOpportunites(pool, { verifier = verifierSansPlanter } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ajoutees: 0, publiees: 0, examinees: 0 };
  }

  const existantes = await fetchOpportunitesVerifiees(pool);
  const raw = await generateJson({ prompt: buildPrompt(existantes), apiKey });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Réponse de l'IA illisible.");
  }

  const propositions = Array.isArray(parsed.propositions) ? parsed.propositions : [];
  let ajoutees = 0;
  let publiees = 0;

  for (const p of propositions) {
    if (!p || typeof p.titre !== "string" || typeof p.organisme !== "string" || typeof p.lienSource !== "string") {
      continue;
    }
    if (!TYPES_OPPORTUNITE.includes(p.type)) continue;

    // Sortie d'IA = entrée non fiable : lien http(s) obligatoire, longueurs bornées aux colonnes SQL.
    const lienSource = safeHttpUrl(p.lienSource);
    if (!lienSource || lienSource.length > 500) continue;
    const siteWeb = safeHttpUrl(p.siteWeb);
    const titre = p.titre.trim().slice(0, 255);
    const organisme = p.organisme.trim().slice(0, 255);
    if (!titre || !organisme) continue;

    // Évite les doublons évidents (même titre déjà en base, publié ou en attente de vérification).
    const [dup] = await pool.query("SELECT id FROM opportunite WHERE titre = ?", [titre]);
    if (dup.length > 0) continue;

    const siteSur = siteWeb && siteWeb.length <= 255 ? siteWeb : null;
    const idStructure = await findOrCreateStructure(pool, organisme, siteSur);
    const verification = autoPublier()
      ? await verifier({ titre, organisme, lienSource, siteWeb: siteSur })
      : { verifiee: false, imageUrl: null };
    await pool.query(
      `INSERT INTO opportunite
         (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source,
          date_verification, statut, image_url, verification_auto)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ${verification.verifiee ? "NOW()" : "NULL"}, ?, ?, ?)`,
      [
        titre,
        p.type,
        idStructure,
        typeof p.publicEligible === "string" ? p.publicEligible.slice(0, 2000) : "",
        Array.isArray(p.criteres) ? p.criteres.filter((c) => typeof c === "string").join("\n") : "",
        Array.isArray(p.piecesRequises) ? p.piecesRequises.filter((c) => typeof c === "string").join("\n") : "",
        lienSource,
        verification.verifiee ? "verifiee" : "a_verifier",
        verification.imageUrl,
        verification.verifiee ? 1 : 0,
      ],
    );
    ajoutees += 1;
    if (verification.verifiee) publiees += 1;
  }

  return { ajoutees, publiees, examinees: propositions.length };
}

// Repasse chaque jour sur les pistes encore en attente (un site momentanément en panne la veille, par exemple) :
// celles dont la source se vérifie enfin sont publiées. Au plus 10 par passage, pour rester léger.
async function verifierEnAttente(pool) {
  if (!autoPublier()) return 0;
  const [lignes] = await pool.query(
    `SELECT o.id, o.titre, o.lien_source, s.nom AS organisme, s.site_web
     FROM opportunite o JOIN structure_partenaire s ON s.id_structure = o.id_structure
     WHERE o.statut = 'a_verifier' AND o.lien_source IS NOT NULL
     ORDER BY o.id DESC LIMIT 10`,
  );
  let publiees = 0;
  for (const l of lignes) {
    const lienSource = safeHttpUrl(l.lien_source);
    if (!lienSource) continue;
    const v = await verifierSansPlanter({ titre: l.titre, organisme: l.organisme, lienSource, siteWeb: safeHttpUrl(l.site_web) });
    if (!v.verifiee) continue;
    await pool.query(
      "UPDATE opportunite SET statut = 'verifiee', date_verification = NOW(), image_url = ?, verification_auto = 1 WHERE id = ? AND statut = 'a_verifier'",
      [v.imageUrl, l.id],
    );
    publiees += 1;
  }
  return publiees;
}

module.exports = { rechercherNouvellesOpportunites, verifierEnAttente };
