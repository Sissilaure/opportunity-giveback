import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOpportunite, fetchSuiviCompte, enregistrerSuiviCompte, retirerSuiviCompte, compteSupprimer } from "../lib/api";
import { getSuivi, toggleSuivi } from "../lib/suivi";
import { STATUTS_SUIVI } from "../lib/suiviStatuts";
import { useAuth } from "../context/AuthContext";
import useTitre from "../hooks/useTitre";
import OpportuniteCard from "../components/OpportuniteCard";

function EnTete({ texte }) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Mon suivi</p>
      <h1 className="mt-1 font-display text-4xl tracking-tight text-ink sm:text-5xl">Mes opportunités</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">{texte}</p>
    </>
  );
}

function Squelettes() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-64 rounded-card" />
      ))}
    </div>
  );
}

function Vide({ children }) {
  return (
    <div className="animate-fade-up mt-10 rounded-card border border-dashed border-line bg-surface p-10 text-center">
      <p className="font-serif text-2xl text-ink">Rien dans votre suivi pour l'instant</p>
      <p className="mt-1 text-sm text-muted">{children}</p>
      <Link to="/opportunites" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">
        Explorer les opportunités
      </Link>
    </div>
  );
}

// ---------- Sans compte : liste gardée sur l'appareil ----------
function SuiviLocal() {
  const [opportunites, setOpportunites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [probleme, setProbleme] = useState(false);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let actuel = true;
    const ids = getSuivi();
    Promise.allSettled(ids.map((id) => fetchOpportunite(id))).then((resultats) => {
      if (!actuel) return;
      // 404 = archivée ou supprimée depuis : on l'oublie. Toute autre erreur (réseau, serveur) : on garde l'identifiant
      // et on le dit, sinon la personne croirait avoir perdu son suivi.
      const disparues = [];
      let injoignable = false;
      resultats.forEach((r, i) => {
        if (r.status === "rejected") {
          if (r.reason?.status === 404) disparues.push(ids[i]);
          else injoignable = true;
        }
      });
      disparues.forEach((id) => toggleSuivi(id));
      setOpportunites(resultats.filter((r) => r.status === "fulfilled").map((r) => r.value));
      setProbleme(injoignable);
      setChargement(false);
    });
    return () => {
      actuel = false;
    };
  }, [tentative]);

  function retirer(id) {
    toggleSuivi(id);
    setOpportunites((liste) => liste.filter((o) => o.id !== id));
  }

  return (
    <>
      <EnTete texte="Retrouvez ici les opportunités que vous avez mises de côté. Pour l'instant, cette liste reste sur cet appareil." />

      <div className="mt-6 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          <strong className="font-semibold">Créez un compte gratuit</strong> pour suivre l'avancée de vos candidatures et être
          prévenu avant chaque date limite, sur tous vos appareils.
        </p>
        <Link to="/connexion?mode=inscription&retour=/suivi" className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-dark">
          Créer un compte
        </Link>
      </div>

      {chargement && <Squelettes />}

      {!chargement && probleme && (
        <div role="alert" className="mt-8 flex flex-col gap-3 rounded-lg bg-danger-bg px-4 py-3 text-sm font-medium text-danger sm:flex-row sm:items-center sm:justify-between">
          <span>Impossible de charger certaines opportunités. Votre suivi est conservé : vérifiez votre connexion.</span>
          <button
            onClick={() => {
              setChargement(true);
              setTentative((n) => n + 1);
            }}
            className="min-h-[40px] rounded-lg bg-danger px-4 py-2 font-semibold text-white"
          >
            Réessayer
          </button>
        </div>
      )}

      {!chargement && !probleme && opportunites.length === 0 && (
        <Vide>Ouvrez une opportunité et utilisez « Ajouter à mon suivi » pour la retrouver ici.</Vide>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunites.map((opp, i) => (
          <div key={opp.id} className="animate-fade-up flex flex-col gap-2" style={{ "--delay": `${i * 70}ms` }}>
            <OpportuniteCard opportunite={opp} />
            <button onClick={() => retirer(opp.id)} className="self-start py-2 text-sm font-medium text-muted underline-offset-2 hover:text-danger hover:underline">
              Retirer de mon suivi
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Avec compte : statut de chaque candidature, note, synchronisé ----------
function SuiviCompte({ utilisateur }) {
  const { deconnexion } = useAuth();
  const [suivis, setSuivis] = useState(null);
  const [erreur, setErreur] = useState("");
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let actuel = true;
    fetchSuiviCompte()
      .then((d) => {
        if (!actuel) return;
        setSuivis(d.suivis);
        setErreur("");
      })
      .catch(() => actuel && setErreur("Impossible de charger votre suivi. Vérifiez votre connexion."));
    return () => {
      actuel = false;
    };
  }, [tentative]);

  async function modifier(id, changements, rollback) {
    setSuivis((l) => l.map((s) => (s.id === id ? { ...s, ...changements.local } : s)));
    try {
      await enregistrerSuiviCompte(id, changements.api);
      setErreur("");
    } catch (err) {
      setSuivis((l) => l.map((s) => (s.id === id ? { ...s, ...rollback } : s)));
      setErreur(err.message);
    }
  }

  async function retirer(id) {
    const avant = suivis;
    setSuivis((l) => l.filter((s) => s.id !== id));
    try {
      await retirerSuiviCompte(id);
    } catch (err) {
      setSuivis(avant);
      setErreur(err.message);
    }
  }

  const compte = (statut) => (suivis || []).filter((s) => s.suiviStatut === statut).length;

  return (
    <>
      <EnTete texte={`Bonjour${utilisateur.prenom ? ` ${utilisateur.prenom}` : ""}. Suivez l'avancée de chaque candidature : elle est enregistrée sur votre compte.`} />

      {erreur && (
        <div role="alert" className="mt-6 flex flex-col gap-3 rounded-lg bg-danger-bg px-4 py-3 text-sm font-medium text-danger sm:flex-row sm:items-center sm:justify-between">
          <span>{erreur}</span>
          {!suivis && (
            <button onClick={() => setTentative((n) => n + 1)} className="min-h-[40px] rounded-lg bg-danger px-4 py-2 font-semibold text-white">
              Réessayer
            </button>
          )}
        </div>
      )}

      {!suivis && !erreur && <Squelettes />}

      {suivis && suivis.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Résumé de vos candidatures">
          {STATUTS_SUIVI.map((s) => (
            <li key={s.value} className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink">
              {s.label} <span className="ml-1 text-primary">{compte(s.value)}</span>
            </li>
          ))}
        </ul>
      )}

      {suivis && suivis.length === 0 && !erreur && (
        <Vide>Ouvrez une opportunité et utilisez « Ajouter à mon suivi » : vous serez prévenu avant la date limite.</Vide>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(suivis || []).map((opp, i) => (
          <div key={opp.id} className="animate-fade-up flex flex-col gap-2" style={{ "--delay": `${Math.min(i, 8) * 60}ms` }}>
            <OpportuniteCard opportunite={opp} />
            <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor={`statut-${opp.id}`}>
              Ma candidature
            </label>
            <select
              id={`statut-${opp.id}`}
              value={opp.suiviStatut}
              onChange={(e) => modifier(opp.id, { local: { suiviStatut: e.target.value }, api: { statut: e.target.value } }, { suiviStatut: opp.suiviStatut })}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            >
              {STATUTS_SUIVI.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <textarea
              defaultValue={opp.note}
              maxLength={500}
              rows={2}
              aria-label={`Note personnelle sur ${opp.titre}`}
              placeholder="Une note pour vous (facultatif)"
              onBlur={(e) => e.target.value !== opp.note && modifier(opp.id, { local: { note: e.target.value }, api: { note: e.target.value } }, { note: opp.note })}
              className="w-full rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button onClick={() => retirer(opp.id)} className="self-start py-2 text-sm font-medium text-muted underline-offset-2 hover:text-danger hover:underline">
              Retirer de mon suivi
            </button>
          </div>
        ))}
      </div>

      <GestionCompte utilisateur={utilisateur} onDeconnexion={deconnexion} />
    </>
  );
}

function GestionCompte({ utilisateur, onDeconnexion }) {
  const { deconnexion } = useAuth();
  const [confirmation, setConfirmation] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function supprimer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    try {
      await compteSupprimer(motDePasse);
      await deconnexion();
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  return (
    <section className="mt-14 border-t border-line pt-6" aria-labelledby="titre-compte">
      <h2 id="titre-compte" className="font-sans text-xs font-bold uppercase tracking-widest text-muted">
        Mon compte
      </h2>
      <p className="mt-2 text-sm text-ink">{utilisateur.email}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button onClick={onDeconnexion} className="min-h-[44px] rounded-xl border border-ink/40 px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink">
          Me déconnecter
        </button>
        {!confirmation && (
          <button onClick={() => setConfirmation(true)} className="min-h-[44px] px-2 py-2.5 text-sm font-medium text-muted underline-offset-2 hover:text-danger hover:underline">
            Supprimer mon compte
          </button>
        )}
      </div>
      {confirmation && (
        <form onSubmit={supprimer} className="mt-4 max-w-md rounded-card border border-line bg-surface p-4">
          <p className="text-sm text-ink">Cette action efface votre compte et tout votre suivi, définitivement. Entrez votre mot de passe pour confirmer.</p>
          <label htmlFor="mdp-suppression" className="sr-only">
            Mot de passe
          </label>
          <input
            id="mdp-suppression"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-3 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none"
          />
          {erreur && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {erreur}
            </p>
          )}
          <div className="mt-3 flex gap-3">
            <button type="submit" disabled={envoi} className="min-h-[44px] rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {envoi ? "Suppression…" : "Supprimer définitivement"}
            </button>
            <button type="button" onClick={() => setConfirmation(false)} className="min-h-[44px] px-3 text-sm font-medium text-muted hover:text-ink">
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function Suivi() {
  useTitre("Mon suivi");
  const { utilisateur } = useAuth();
  return (
    <main className="mx-auto max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pt-10">
      {utilisateur === undefined ? <Squelettes /> : utilisateur ? <SuiviCompte utilisateur={utilisateur} /> : <SuiviLocal />}
    </main>
  );
}
