// Client minimal pour l'API Gemini (Google AI Studio), via fetch natif : pas de SDK
// supplémentaire. Le niveau gratuit de Gemini n'exige pas de carte bancaire.
// Alias maintenu par Google plutôt qu'une version figée : évite de se faire
// désactiver au prochain retrait de modèle (ex. gemini-2.0-flash, retiré en 2026).
// La variante "lite" suffit à une tâche de classement/tri et est moins sujette
// à la saturation du tier gratuit que "gemini-flash-latest".
const DEFAULT_MODEL = "gemini-flash-lite-latest";

function endpoint(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Statuts temporaires côté Google (surcharge, quota par minute) : ça vaut la peine de réessayer.
const STATUTS_TEMPORAIRES = new Set([429, 500, 502, 503, 504]);
const MODELE_SECOURS = "gemini-flash-latest";
const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function appeler({ prompt, apiKey, model, delai }) {
  const res = await fetch(`${endpoint(model)}?key=${apiKey}`, {
    method: "POST",
    signal: AbortSignal.timeout(delai), // sans délai maximum, un Gemini lent bloquerait le visiteur indéfiniment
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Température à 0 : c'est un classement/tri, pas de la génération créative,
      // on veut un résultat stable d'un essai à l'autre pour la même description.
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`Gemini a répondu ${res.status} : ${detail.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Réponse Gemini vide ou dans un format inattendu.");
  }
  return text;
}

/**
 * Appelle Gemini avec résilience : le niveau gratuit renvoie parfois 503 « forte demande » pendant quelques secondes.
 * On réessaie le modèle principal une fois (après `pause` ms), puis on bascule sur un modèle de secours.
 * Une erreur définitive (clé invalide 400/403, etc.) n'est jamais retentée.
 */
async function generateJson({ prompt, apiKey, model = process.env.GEMINI_MODEL || DEFAULT_MODEL, pause = 1200, delai = 10000 }) {
  const essais = [model, model, ...(model === MODELE_SECOURS ? [] : [MODELE_SECOURS])];
  let derniereErreur;
  for (let i = 0; i < essais.length; i++) {
    try {
      return await appeler({ prompt, apiKey, model: essais[i], delai });
    } catch (err) {
      derniereErreur = err;
      // Temporaire = statut Google surchargé, délai dépassé ou coupure réseau (fetch lève une TypeError).
      const temporaire = STATUTS_TEMPORAIRES.has(err.status) || ['TimeoutError', 'AbortError', 'TypeError'].includes(err.name);
      if (!temporaire) throw err;
      if (i < essais.length - 1 && i === 0) await attendre(pause);
    }
  }
  throw derniereErreur;
}

module.exports = { generateJson };
