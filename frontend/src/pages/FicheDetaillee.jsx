import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchOpportunite } from "../lib/api";
import { estSuivi, toggleSuivi } from "../lib/suivi";
import TypeBadge from "../components/TypeBadge";
import VerifiedBadge from "../components/VerifiedBadge";
import { ChevronLeftIcon, ExternalLinkIcon, CheckIcon } from "../components/icons";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function Section({ titre, children }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">{titre}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function FicheDetaillee() {
  const { id } = useParams();
  const [opp, setOpp] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [suivi, setSuivi] = useState(false);

  useEffect(() => {
    fetchOpportunite(id)
      .then((data) => {
        setOpp(data);
        setSuivi(estSuivi(id));
      })
      .catch(() => setErreur("Cette opportunité est introuvable ou n'est plus disponible."))
      .finally(() => setChargement(false));
  }, [id]);

  function handleToggleSuivi() {
    setSuivi(toggleSuivi(id));
  }

  if (chargement) {
    return <main className="mx-auto max-w-2xl px-5 pt-6 text-sm text-muted sm:px-8 sm:pt-10">Chargement…</main>;
  }

  if (erreur) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-6 sm:px-8 sm:pt-10">
        <Link to="/opportunites" className="inline-flex items-center gap-1 text-sm font-medium text-ink">
          <ChevronLeftIcon className="h-4 w-4" /> Répertoire
        </Link>
        <p className="mt-6 text-sm text-danger">{erreur}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <Link to="/opportunites" className="inline-flex items-center gap-1 text-sm font-medium text-ink">
        <ChevronLeftIcon className="h-4 w-4" /> Répertoire
      </Link>

      <div className="mt-4">
        <TypeBadge type={opp.type} />
        <h1 className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl">
          {opp.titre}
        </h1>
        <p className="mt-1 text-base italic text-muted">{opp.organisme}</p>
        <div className="mt-2">
          <VerifiedBadge date={opp.dateVerification} />
        </div>
      </div>

      <Section titre="Public éligible">
        <p className="text-sm text-ink/90">{opp.publicEligible}</p>
      </Section>

      <Section titre="Critères principaux">
        <ul className="space-y-1.5">
          {opp.criteres.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink/90">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <Section titre="Pièces requises">
        <ul className="space-y-1.5">
          {opp.piecesRequises.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink/90">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
      </Section>

      {opp.dateEcheance ? (
        <Section titre="Échéance">
          <div
            className={`flex items-center gap-3 rounded-xl p-3 ${
              opp.statutEcheance === "proche" || opp.statutEcheance === "depassee" ? "bg-danger-bg" : "bg-canvas"
            }`}
          >
            <span className="font-display text-4xl font-semibold text-ink">
              {opp.statutEcheance === "depassee" ? "Clos" : `${opp.joursRestants}j`}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {opp.statutEcheance === "depassee" ? "Échéance dépassée" : "Avant l'échéance"}
              </p>
              <p className="text-xs text-muted">{formatDate(opp.dateEcheance)}</p>
            </div>
          </div>
        </Section>
      ) : (
        <Section titre="Échéance">
          <p className="text-sm text-muted">Opportunité permanente, sans date limite.</p>
        </Section>
      )}

      <div className="mt-6 space-y-2.5">
        <a
          href={opp.lienSource}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark hover:shadow-card-hover"
        >
          En savoir plus
          <ExternalLinkIcon className="h-4 w-4" />
        </a>
        <button
          onClick={handleToggleSuivi}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition ${
            suivi ? "border-primary bg-primary-light text-primary" : "border-line bg-surface text-ink"
          }`}
        >
          {suivi && <CheckIcon className="h-4 w-4" />}
          {suivi ? "Dans mon suivi" : "Ajouter à mon suivi"}
        </button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Opportunity Hub facilite l'accès à cette opportunité et ne garantit pas son obtention.
        La décision finale appartient à l'organisme cité ci-dessus.
      </p>
    </main>
  );
}
