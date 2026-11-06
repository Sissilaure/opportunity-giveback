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
  const [erreur, setErreur] = useState("");
  const [resultats, setResultats] = useState([]);

  async function handleRecherche() {
    const contenu = description.trim();
    if (!contenu) return;
    setStatut("loading");
    setErreur("");
    try {
      const data = await rechercheIntelligente(contenu);
      setResultats(data.resultats);
      setStatut("done");
    } catch (err) {
      setErreur(err.message);
      setStatut("error");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-feature opacity-[0.08] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-widest text-feature">Recherche intelligente · bêta</p>
        <h2 className="mt-1 font-display text-xl font-bold text-ink">Décris ta situation</h2>
        <p className="mt-1 text-sm text-muted">
          Ex. « Je suis en Master 1, ressortissant d'Afrique subsaharienne, je cherche une bourse pour l'Europe. »
        </p>

        <p className="mt-2 text-xs text-muted">
          L'IA peut se tromper : ses suggestions sont à vérifier. Consulte toujours la source officielle de chaque fiche avant de candidater.
        </p>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.metaKey && handleRecherche()}
          rows={3}
          placeholder="Décris ton profil et ce que tu cherches…"
          className="mt-3 w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder:text-muted focus:border-feature focus:outline-none"
        />
        <button
          onClick={handleRecherche}
          disabled={statut === "loading" || !description.trim()}
          className="mt-3 rounded-xl bg-feature px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-60"
        >
          {statut === "loading" ? "Recherche en cours…" : "Rechercher avec l'IA"}
        </button>

        {statut === "error" && <p className="mt-3 text-sm text-danger">{erreur}</p>}

        {statut === "done" && resultats.length === 0 && (
          <p className="mt-4 text-sm text-muted">Aucune opportunité pertinente trouvée pour cette description.</p>
        )}

        {resultats.length > 0 && (
          <div className="mt-4 space-y-3">
            {resultats.map((r) => (
              <Link
                key={r.id}
                to={`/opportunites/${r.id}`}
                className="block rounded-xl border border-line bg-canvas p-4 transition hover:border-feature/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={r.type} />
                  <VerifiedBadge date={r.dateVerification} />
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-ink">{r.titre}</h3>
                <p className="text-sm text-muted">{r.organisme}</p>
                {r.raisonIA && (
                  <p className="mt-2 border-l-2 border-feature pl-3 text-sm italic text-ink/80">{r.raisonIA}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
