const express = require("express");
const createRateLimiter = require("./rateLimit");
const validate = require("./validate");
const { rechercheIaSchema } = require("./schemas");
const { AppError, asyncHandler } = require("./errors");
const { fetchOpportunitesVerifiees } = require("./opportunites");
const { generateJson } = require("./gemini");

// Coûte un appel API externe à chaque requête : limite plus stricte que la recherche classique.
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Trop de recherches intelligentes, réessaie dans une minute.",
});

function buildPrompt(description, opportunites) {
  const candidats = opportunites.map((o) => ({
    id: o.id,
    titre: o.titre,
    organisme: o.organisme,
    type: o.type,
    publicEligible: o.publicEligible,
    criteres: o.criteres,
    dateEcheance: o.dateEcheance,
  }));

  return `Tu es un assistant qui aide des étudiant·e·s à trouver des bourses, stages, emplois et concours pertinents parmi une liste vérifiée.

Situation décrite par l'utilisateur·rice :
"""${description}"""

Opportunités actuellement vérifiées (JSON) :
${JSON.stringify(candidats)}

Sélectionne uniquement celles qui sont réellement pertinentes pour cette situation (10 maximum), classées de la plus à la moins pertinente. Si aucune ne correspond, renvoie une liste vide.
Réponds strictement avec ce format JSON, sans aucun texte autour :
{"resultats": [{"id": <id numérique de l'opportunité>, "raison": "<une phrase courte en français expliquant la pertinence>"}]}`;
}

// `pool` est injecté comme dans les autres routeurs : testable sans base réelle.
function createRechercheIaRouter(pool) {
  const router = express.Router();

  router.post(
    "/",
    searchLimiter,
    validate(rechercheIaSchema),
    asyncHandler(async (req, res) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new AppError(503, "La recherche intelligente est momentanément indisponible.");
      }

      const { description } = req.body;
      const opportunites = await fetchOpportunitesVerifiees(pool);

      if (opportunites.length === 0) {
        return res.json({ resultats: [] });
      }

      let raw;
      try {
        raw = await generateJson({ prompt: buildPrompt(description, opportunites), apiKey });
      } catch (err) {
        console.error("Erreur Gemini:", err);
        throw new AppError(502, "La recherche intelligente est temporairement indisponible.");
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new AppError(502, "Réponse de l'IA illisible, réessaie.");
      }

      const suggestions = Array.isArray(parsed.resultats) ? parsed.resultats : [];
      const parId = new Map(opportunites.map((o) => [o.id, o]));

      const resultats = suggestions
        .map((s) => {
          const opp = parId.get(s.id);
          return opp ? { ...opp, raisonIA: typeof s.raison === "string" ? s.raison : "" } : null;
        })
        .filter(Boolean)
        .slice(0, 10);

      res.json({ resultats });
    }),
  );

  return router;
}

module.exports = createRechercheIaRouter;
