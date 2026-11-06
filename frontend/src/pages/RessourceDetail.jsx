import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchRessource } from "../lib/api";
import { renderMarkdownLite } from "../lib/markdown";
import useTitre from "../hooks/useTitre";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/icons";

const LABELS = {
  cv: "Modèle",
  lettre: "Guide",
  vigilance: "Vigilance",
  checklist: "Check-list",
};

// Après avoir lu le guide, l'action naturelle diffère selon son propos.
const CTA_PAR_TYPE = {
  cv: { label: "Parcourir les opportunités", to: "/opportunites" },
  lettre: { label: "Parcourir les opportunités", to: "/opportunites" },
  checklist: { label: "Parcourir les opportunités", to: "/opportunites" },
  vigilance: { label: "Une annonce vous semble douteuse ? Posez la question", to: "/aide" },
};

export default function RessourceDetail() {
  const { id } = useParams();
  const [ressource, setRessource] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    fetchRessource(id)
      .then(setRessource)
      .catch(() => setErreur("Ressource introuvable."))
      .finally(() => setChargement(false));
  }, [id]);

  useTitre(ressource?.titre);

  const cta = ressource ? CTA_PAR_TYPE[ressource.type] : null;

  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <Link to="/ressources" className="inline-flex items-center gap-1 text-sm font-medium text-ink">
        <ChevronLeftIcon className="h-4 w-4" /> Ressources
      </Link>

      {chargement && <p className="mt-6 text-sm text-muted">Chargement…</p>}
      {erreur && <p className="mt-6 text-sm text-danger">{erreur}</p>}

      {ressource && (
        <>
          <div className="mt-4">
            <span className="inline-block rounded bg-canvas px-2 py-0.5 text-xs font-semibold tracking-wide text-ink">
              {LABELS[ressource.type] || ressource.type}
            </span>
            <h1 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink">{ressource.titre}</h1>
            <p className="mt-1 text-sm text-muted">{ressource.description}</p>
          </div>

          <div
            className={`contenu-guide mt-5 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6 ${
              ressource.type === "vigilance" ? "contenu-guide--alerte" : ""
            }`}
          >
            <div dangerouslySetInnerHTML={{ __html: renderMarkdownLite(ressource.contenu || "") }} />
          </div>

          {cta && (
            <Link
              to={cta.to}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark hover:shadow-card-hover"
            >
              {cta.label}
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          )}
        </>
      )}
    </main>
  );
}
