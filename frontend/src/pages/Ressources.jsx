import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRessources } from "../lib/api";
import { ChevronRightIcon } from "../components/icons";
import useTitre from "../hooks/useTitre";

const LABELS = {
  cv: "Modèle",
  lettre: "Guide",
  vigilance: "Vigilance",
  checklist: "Check-list",
};

export default function Ressources() {
  useTitre("Ressources");
  const [ressources, setRessources] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    fetchRessources()
      .then(setRessources)
      .catch(() => setErreur("Impossible de charger les ressources."))
      .finally(() => setChargement(false));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Se préparer</p>
      <h1 className="mt-1 font-display text-4xl tracking-tight text-ink sm:text-5xl">Ressources</h1>
      <p className="mt-1 font-serif text-xl italic text-muted">Guides, modèles et réponses</p>

      {chargement && <p className="mt-6 text-sm text-muted">Chargement…</p>}
      {erreur && <p className="mt-6 text-sm text-danger">{erreur}</p>}

      {!chargement && !erreur && ressources.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">
          Aucune ressource disponible pour le moment.
        </p>
      )}

      {ressources.length > 0 && (
        <>
          <h2 className="mt-5 font-sans text-xs font-semibold uppercase tracking-wide text-muted">À consulter</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ressources.map((r, i) => (
              <Link
                key={r.id}
                to={`/ressources/${r.id}`}
                style={{ "--delay": `${i * 70}ms` }}
                className="animate-fade-up group flex flex-col rounded-card border border-line bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="inline-block w-fit rounded bg-canvas px-2 py-0.5 text-xs font-semibold tracking-wide text-ink">
                  {LABELS[r.type] || r.type}
                </span>
                <h3 className="mt-2 font-display text-lg leading-snug text-ink">{r.titre}</h3>
                <p className="mt-1 text-sm text-muted">{r.description}</p>
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-md bg-primary-light px-3 py-1 text-xs font-semibold text-primary transition group-hover:bg-primary group-hover:text-white">
                  Consulter le guide
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
