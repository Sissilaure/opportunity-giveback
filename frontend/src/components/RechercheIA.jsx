import { useState } from "react";
import { Link } from "react-router-dom";
import { rechercheIntelligente } from "../lib/api";
import TypeBadge from "./TypeBadge";
import VerifiedBadge from "./VerifiedBadge";

// Recherche complémentaire à la barre classique : décrit une situation en langage
// naturel, Gemini classe les opportunités vérifiées par pertinence.
export default function RechercheIA() {
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState("idle");
  const [probleme, setProbleme] = useState(null);
  const [resultats, setResultats] = useState([]);

  async function handleRecherche() {
    const contenu = description.trim();
    if (!contenu) return;
    setStatut("loading");
    setProbleme(null);
    try {
      const data = await rechercheIntelligente(contenu);
      setResultats(data.resultats);
      setStatut("done");
    } catch (err) {
      // 400 = saisie à corriger. Tout le reste (service indisponible, quota, réseau) n'est pas
      // la faute de la personne : on le dit calmement et on oriente vers la recherche classique.
      const saisieInvalide = err.status === 400;
      setProbleme({
        saisieInvalide,
        message: saisieInvalide
          ? err.message
          : "La recherche intelligente est momentanément indisponible : réessayez dans quelques secondes. En attendant, utilisez la barre de recherche ou les filtres : toutes les opportunités vérifiées restent accessibles.",
      });
      setStatut("error");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-widest text-ink">Recherche intelligente · bêta</p>
        <h2 className="mt-1 font-display text-xl text-ink">Décrivez votre situation</h2>
        <p className="mt-1 text-sm text-muted">
          Ex. « Je suis en Master 1, originaire d'Afrique subsaharienne, je cherche une bourse pour l'Europe. »
        </p>
        <p className="mt-2 text-xs text-muted">
          L'IA peut se tromper : ses suggestions sont à vérifier. Consultez toujours la source officielle de chaque fiche avant de candidater.
        </p>

        <label htmlFor="recherche-ia" className="sr-only">
          Décrivez votre profil et ce que vous cherchez
        </label>
        <textarea
          id="recherche-ia"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handleRecherche()}
          rows={3}
          maxLength={500}
          placeholder="Décrivez votre profil et ce que vous cherchez…"
          className="mt-3 w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          onClick={handleRecherche}
          disabled={statut === "loading" || !description.trim()}
          className="mt-3 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-60"
        >
          {statut === "loading" ? "Recherche en cours…" : "Rechercher avec l'IA"}
        </button>

        {statut === "error" && probleme && (
          <p
            role="status"
            className={`animate-pop-in mt-3 rounded-lg px-3 py-2.5 text-sm ${
              probleme.saisieInvalide ? "bg-danger-bg text-danger" : "bg-accent-light text-ink"
            }`}
          >
            {probleme.message}
          </p>
        )}

        {statut === "done" && resultats.length === 0 && (
          <p className="mt-4 text-sm text-muted">Aucune opportunité pertinente trouvée pour cette description.</p>
        )}

        {resultats.length > 0 && (
          <div className="mt-4 space-y-3">
            {resultats.map((r, i) => (
              <Link
                key={r.id}
                to={`/opportunites/${r.id}`}
                style={{ "--delay": `${i * 70}ms` }}
                className="animate-fade-up block rounded-xl border border-line bg-canvas p-4 transition hover:border-ink/40 hover:shadow-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={r.type} />
                  <VerifiedBadge date={r.dateVerification} />
                </div>
                <h3 className="mt-2 font-display text-base text-ink">{r.titre}</h3>
                <p className="text-sm text-muted">{r.organisme}</p>
                {r.raisonIA && (
                  <p className="mt-2 border-l-2 border-ink pl-3 font-serif text-base italic text-ink/80">{r.raisonIA}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
