const { generateJson } = require("./gemini");
const { fetchOpportunitesVerifiees, findOrCreateStructure } = require("./opportunites");
const { TYPES_OPPORTUNITE } = require("./schemas");
const { safeHttpUrl } = require("./security");

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

async function rechercherNouvellesOpportunites(pool) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ajoutees: 0, examinees: 0 };
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

    const idStructure = await findOrCreateStructure(pool, organisme, siteWeb && siteWeb.length <= 255 ? siteWeb : null);
    await pool.query(
      `INSERT INTO opportunite
         (titre, type, id_structure, public_eligible, criteres, pieces_requises, date_echeance, lien_source, date_verification, statut)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, 'a_verifier')`,
      [
        titre,
        p.type,
        idStructure,
        typeof p.publicEligible === "string" ? p.publicEligible.slice(0, 2000) : "",
        Array.isArray(p.criteres) ? p.criteres.filter((c) => typeof c === "string").join("\n") : "",
        Array.isArray(p.piecesRequises) ? p.piecesRequises.filter((c) => typeof c === "string").join("\n") : "",
        lienSource,
      ],
    );
    ajoutees += 1;
  }

  return { ajoutees, examinees: propositions.length };
}

module.exports = { rechercherNouvellesOpportunites };
