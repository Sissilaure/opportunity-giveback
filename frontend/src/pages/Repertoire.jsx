import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchOpportunites } from "../lib/api";
import useTitre from "../hooks/useTitre";
import SearchBar from "../components/SearchBar";
import FilterTabs from "../components/FilterTabs";
import OpportuniteCard from "../components/OpportuniteCard";
import RechercheIA from "../components/RechercheIA";

export default function Repertoire() {
  useTitre("Opportunités");
  const [q, setQ] = useState("");
  // Le filtre de type vit dans l'URL (?type=bourse) pour que les catégories de l'accueil y mènent directement.
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") || "toutes";
  const setType = (valeur) => setSearchParams(valeur === "toutes" ? {} : { type: valeur });
  const [opportunites, setOpportunites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const delai = setTimeout(() => {
      setChargement(true);
      fetchOpportunites({ q, type })
        .then((data) => {
          setOpportunites(data.opportunites);
          setErreur(null);
        })
        .catch(() => setErreur("Impossible de charger les opportunités. Vérifiez votre connexion."))
        .finally(() => setChargement(false));
    }, 250);

    return () => clearTimeout(delai);
  }, [q, type]);

  return (
    <main>
      <div className="border-b border-line bg-glow">
        <div className="mx-auto max-w-6xl px-5 pb-6 pt-6 sm:px-8 sm:pt-10">
          <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Répertoire</p>
              <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                Opportunités
              </h1>
              <p className="mt-1 text-base italic text-muted">Vérifiées pour votre avenir</p>
            </div>

            {!erreur && (
              <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0" aria-live="polite">
                <span className="font-display text-4xl font-semibold text-primary">
                  {chargement ? "…" : opportunites.length}
                </span>
                <span className="text-sm font-semibold text-muted">
                  opportunité{opportunites.length > 1 ? "s" : ""} vérifiée{opportunites.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="animate-fade-up mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ "--delay": "100ms" }}>
            <div className="sm:max-w-xs sm:flex-1">
              <SearchBar value={q} onChange={setQ} />
            </div>
            <FilterTabs value={type} onChange={setType} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8">
        <RechercheIA />

        <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-muted">Parcourir toutes les opportunités</p>

        {erreur && (
          <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
            {erreur}
          </p>
        )}

        {!chargement && !erreur && opportunites.length === 0 && (
          <div className="animate-fade-up rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold text-ink">Aucune opportunité ne correspond</p>
            <p className="mt-1 text-sm text-muted">Essayez un autre mot-clé, ou affichez toutes les catégories.</p>
            {(q || type !== "toutes") && (
              <button
                onClick={() => {
                  setQ("");
                  setType("toutes");
                }}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {chargement && opportunites.length === 0 && !erreur && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-72 rounded-card" />
            ))}
          </div>
        )}

        <div
          className={`grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${
            chargement ? "opacity-60" : "opacity-100"
          }`}
        >
          {opportunites.map((opp, i) => (
            <div key={opp.id} className="animate-fade-up" style={{ "--delay": `${Math.min(i, 8) * 60}ms` }}>
              <OpportuniteCard opportunite={opp} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
