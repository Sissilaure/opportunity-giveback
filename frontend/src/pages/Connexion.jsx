import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSuivi } from "../lib/suivi";
import { importerSuiviCompte } from "../lib/api";
import useTitre from "../hooks/useTitre";
import { retourSur } from "../lib/retour";

export default function Connexion() {
  const [params, setParams] = useSearchParams();
  const inscriptionMode = params.get("mode") === "inscription";
  useTitre(inscriptionMode ? "Créer un compte" : "Connexion");
  const { utilisateur, connexion, inscription } = useAuth();
  const navigate = useNavigate();
  const retour = retourSur(params.get("retour"));

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [prenom, setPrenom] = useState("");
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  if (utilisateur) return <Navigate to={retour} replace />;

  function basculer() {
    setErreur("");
    const suivant = new URLSearchParams(params);
    if (inscriptionMode) suivant.delete("mode");
    else suivant.set("mode", "inscription");
    setParams(suivant, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      if (inscriptionMode) await inscription({ email, motDePasse, prenom });
      else await connexion({ email, motDePasse });
      // Reprend sans effort le suivi gardé sur cet appareil avant la création du compte.
      const locaux = getSuivi();
      if (locaux.length > 0) await importerSuiviCompte(locaux).catch(() => {});
      navigate(retour, { replace: true });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const champ =
    "mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none";

  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Mon compte</p>
      <h1 className="mt-1 font-display text-4xl tracking-tight text-ink">
        {inscriptionMode ? "Créer un compte" : "Se connecter"}
      </h1>
      <p className="mt-2 font-serif text-xl italic text-muted">
        {inscriptionMode
          ? "Suivez vos candidatures et recevez des rappels avant chaque échéance."
          : "Retrouvez vos candidatures et vos rappels."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-card border border-line bg-surface p-5" noValidate={false}>
        {inscriptionMode && (
          <div className="mb-4">
            <label htmlFor="prenom" className="text-sm font-medium text-ink">
              Prénom <span className="font-normal text-muted">(facultatif)</span>
            </label>
            <input id="prenom" type="text" autoComplete="given-name" maxLength={80} value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} />
          </div>
        )}

        <label htmlFor="email" className="text-sm font-medium text-ink">
          Adresse email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom@exemple.com"
          className={champ}
        />

        <div className="mt-4 flex items-baseline justify-between">
          <label htmlFor="mdp" className="text-sm font-medium text-ink">
            Mot de passe
          </label>
          <button type="button" onClick={() => setVoir((v) => !v)} aria-pressed={voir} className="py-1 text-xs font-semibold text-primary hover:underline">
            {voir ? "Masquer" : "Afficher"}
          </button>
        </div>
        <input
          id="mdp"
          type={voir ? "text" : "password"}
          required
          minLength={inscriptionMode ? 10 : undefined}
          maxLength={200}
          autoComplete={inscriptionMode ? "new-password" : "current-password"}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          aria-describedby={inscriptionMode ? "aide-mdp" : undefined}
          className={champ}
        />
        {inscriptionMode && (
          <p id="aide-mdp" className="mt-1.5 text-xs text-muted">
            10 caractères minimum. Une phrase facile à retenir fonctionne très bien.
          </p>
        )}

        {erreur && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
        >
          {envoi ? "Un instant…" : inscriptionMode ? "Créer mon compte" : "Me connecter"}
        </button>

        {inscriptionMode && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Nous gardons votre email, votre mot de passe (chiffré) et vos opportunités suivies, rien d'autre. Vous pouvez
            supprimer votre compte à tout moment.{" "}
            <Link to="/confidentialite" className="underline">
              En savoir plus
            </Link>
          </p>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {inscriptionMode ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
        <button type="button" onClick={basculer} className="py-2 font-semibold text-primary hover:underline">
          {inscriptionMode ? "Se connecter" : "Créer un compte"}
        </button>
      </p>
      {!inscriptionMode && (
        <p className="mt-1 text-center text-xs text-muted">
          Mot de passe oublié ? Écrivez-nous depuis la page <Link to="/aide" className="underline">Aide</Link>.
        </p>
      )}
    </main>
  );
}
