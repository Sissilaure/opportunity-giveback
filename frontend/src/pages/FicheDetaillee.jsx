import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchOpportunite } from "../lib/api";
import { estSuivi, toggleSuivi } from "../lib/suivi";
import { lienSur } from "../lib/url";
import { imageOpportunite } from "../lib/types";
import { telechargerICS } from "../lib/calendrier";
import useTitre from "../hooks/useTitre";
import TypeBadge from "../components/TypeBadge";
import VerifiedBadge from "../components/VerifiedBadge";
import { ChevronLeftIcon, ExternalLinkIcon, CheckIcon } from "../components/icons";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function Section({ titre, children }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">{titre}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Liste({ elements }) {
  return (
    <ul className="space-y-1.5">
      {elements.map((e, i) => (
        <li key={i} className="flex gap-2 text-sm text-ink/90">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          {e}
        </li>
      ))}
    </ul>
  );
}

export default function FicheDetaillee() {
  const { id } = useParams();
  const [opp, setOpp] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [suivi, setSuivi] = useState(false);

  useTitre(opp?.titre);

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

  const [message, setMessage] = useState("");
  const annoncer = (texte) => {
    setMessage(texte);
    setTimeout(() => setMessage(""), 3000);
  };

  // Partage natif sur mobile (WhatsApp, etc.), sinon copie du lien : le canal n°1 de diffusion ici est WhatsApp.
  async function handlePartager() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: opp.titre, text: `${opp.titre} — ${opp.organisme}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      annoncer("Lien copié dans le presse-papiers.");
    } catch (err) {
      if (err?.name !== "AbortError") annoncer("Impossible de partager ce lien.");
    }
  }

  function handleCalendrier() {
    if (!telechargerICS(opp, window.location.href)) annoncer("Cette opportunité n'a pas de date limite.");
  }

  if (chargement) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-6 sm:px-8 sm:pt-10" aria-busy="true">
        <div className="skeleton aspect-[21/9] w-full rounded-card" />
        <div className="skeleton mt-5 h-8 w-3/4 rounded" />
        <div className="skeleton mt-3 h-4 w-1/3 rounded" />
        <div className="skeleton mt-8 h-24 w-full rounded" />
      </main>
    );
  }

  if (erreur) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-6 sm:px-8 sm:pt-10">
        <Link to="/opportunites" className="inline-flex items-center gap-1 text-sm font-medium text-ink">
          <ChevronLeftIcon className="h-4 w-4" /> Opportunités
        </Link>
        <p className="mt-6 text-sm text-danger">{erreur}</p>
      </main>
    );
  }

  const lien = lienSur(opp.lienSource);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <Link to="/opportunites" className="-ml-1 inline-flex items-center gap-1 py-2 pr-3 text-sm font-medium text-ink hover:text-primary">
        <ChevronLeftIcon className="h-4 w-4" /> Opportunités
      </Link>

      <div className="animate-fade-up relative mt-4 aspect-[21/9] overflow-hidden rounded-card bg-primary-light shadow-card">
        <img
          src={imageOpportunite(opp)}
          alt=""
          width="1000"
          height="563"
          className="h-full w-full object-cover saturate-75"
        />
      </div>

      <div className="animate-fade-up mt-5" style={{ "--delay": "80ms" }}>
        <TypeBadge type={opp.type} />
        <h1 className="mt-2 font-display text-2xl leading-snug tracking-tight text-ink sm:text-3xl">
          {opp.titre}
        </h1>
        <p className="mt-1 font-serif text-xl italic text-muted">{opp.organisme}</p>
        <div className="mt-2">
          <VerifiedBadge date={opp.dateVerification} />
        </div>
      </div>

      <div className="animate-fade-up" style={{ "--delay": "160ms" }}>
        {opp.publicEligible && (
          <Section titre="Public éligible">
            <p className="text-sm text-ink/90">{opp.publicEligible}</p>
          </Section>
        )}

        {opp.criteres.length > 0 && (
          <Section titre="Critères principaux">
            <Liste elements={opp.criteres} />
          </Section>
        )}

        {opp.piecesRequises.length > 0 && (
          <Section titre="Pièces requises">
            <Liste elements={opp.piecesRequises} />
          </Section>
        )}

        {opp.dateEcheance ? (
          <Section titre="Échéance">
            <div
              className={`flex items-center gap-3 rounded-xl p-3 ${
                opp.statutEcheance === "proche" || opp.statutEcheance === "depassee" ? "bg-danger-bg" : "bg-primary-light"
              }`}
            >
              <span className="font-serif text-4xl text-ink">
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
      </div>

      <div className="mt-6 space-y-2.5">
        {lien ? (
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark hover:shadow-card-hover"
          >
            Voir la source officielle
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        ) : (
          <p className="rounded-xl bg-accent-light px-4 py-3 text-sm text-ink">
            Le lien officiel de cette opportunité n'est pas disponible pour le moment.
          </p>
        )}
        <button
          onClick={handleToggleSuivi}
          aria-pressed={suivi}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition ${
            suivi ? "border-primary bg-primary-light text-primary" : "border-line bg-surface text-ink hover:border-ink"
          }`}
        >
          {suivi && <CheckIcon className="h-4 w-4" />}
          {suivi ? "Dans mon suivi" : "Ajouter à mon suivi"}
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handlePartager}
            className="flex items-center justify-center gap-2 rounded-xl border border-ink/40 bg-transparent py-3 text-sm font-semibold text-ink transition hover:border-ink"
          >
            Partager
          </button>
          {opp.dateEcheance && opp.statutEcheance !== "depassee" && (
            <button
              onClick={handleCalendrier}
              className="flex items-center justify-center gap-2 rounded-xl border border-ink/40 bg-transparent py-3 text-sm font-semibold text-ink transition hover:border-ink"
            >
              Rappel calendrier
            </button>
          )}
        </div>
        <p role="status" aria-live="polite" className="min-h-[1.25rem] text-center text-sm text-success">
          {message}
        </p>
        {suivi && (
          <Link to="/suivi" className="animate-pop-in block text-center text-sm font-medium text-primary hover:underline">
            Voir mon suivi →
          </Link>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Yeelen facilite l'accès à cette opportunité et ne garantit pas son obtention.
        La décision finale appartient à l'organisme cité ci-dessus.
      </p>
    </main>
  );
}
