import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminSession, adminLogin, adminLogout, adminFetchQuestions, adminRepondreQuestion } from "../lib/api";
import AdminOpportunites from "../components/AdminOpportunites";
import { ChevronLeftIcon } from "../components/icons";

export default function Admin() {
  const [verification, setVerification] = useState(true);
  const [estConnecte, setEstConnecte] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurConnexion, setErreurConnexion] = useState("");
  const [connexionEnCours, setConnexionEnCours] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [brouillons, setBrouillons] = useState({});
  const [envoiEnCours, setEnvoiEnCours] = useState({});

  useEffect(() => {
    adminSession()
      .then(({ isAdmin }) => {
        setEstConnecte(isAdmin);
        if (isAdmin) chargerQuestions();
      })
      .finally(() => setVerification(false));
  }, []);

  function chargerQuestions() {
    adminFetchQuestions().then(setQuestions).catch(() => {});
  }

  async function handleConnexion() {
    setConnexionEnCours(true);
    setErreurConnexion("");
    try {
      await adminLogin(email, motDePasse);
      setEstConnecte(true);
      chargerQuestions();
    } catch (err) {
      setErreurConnexion(err.message);
    } finally {
      setConnexionEnCours(false);
    }
  }

  async function handleDeconnexion() {
    await adminLogout();
    setEstConnecte(false);
    setQuestions([]);
  }

  async function handleRepondre(id) {
    const reponse = (brouillons[id] || "").trim();
    if (!reponse) return;
    setEnvoiEnCours((s) => ({ ...s, [id]: true }));
    try {
      await adminRepondreQuestion(id, reponse);
      chargerQuestions();
      setBrouillons((b) => ({ ...b, [id]: "" }));
    } catch (err) {
      alert(err.message);
    } finally {
      setEnvoiEnCours((s) => ({ ...s, [id]: false }));
    }
  }

  if (verification) {
    return <main className="mx-auto max-w-md px-5 pt-10 text-sm text-muted">Chargement…</main>;
  }

  if (!estConnecte) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-glow px-5">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-primary">
            <ChevronLeftIcon className="h-4 w-4" /> Accueil
          </Link>
        </div>
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Espace équipe</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Connexion</h1>
          <p className="mt-0.5 text-sm text-muted">Réservé aux membres de l'équipe.</p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnexion()}
            placeholder="Email"
            autoComplete="username"
            className="mt-5 w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnexion()}
            placeholder="Mot de passe"
            autoComplete="current-password"
            className="mt-3 w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleConnexion}
            disabled={connexionEnCours}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark hover:shadow-card-hover disabled:opacity-60"
          >
            {connexionEnCours ? "Connexion…" : "Se connecter"}
          </button>
          {erreurConnexion && <p className="mt-3 text-sm text-danger">{erreurConnexion}</p>}
        </div>
      </main>
    );
  }

  const enAttente = questions.filter((q) => q.statut === "en_attente");
  const repondues = questions.filter((q) => q.statut === "repondu");

  return (
    <main className="mx-auto max-w-3xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-primary">
          <ChevronLeftIcon className="h-4 w-4" /> Accueil
        </Link>
        <button onClick={handleDeconnexion} className="text-sm font-medium text-muted hover:text-ink">
          Déconnexion
        </button>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Espace équipe</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Questions reçues</h1>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
        En attente ({enAttente.length})
      </p>
      {enAttente.length === 0 && <p className="mt-2 text-sm text-muted">Aucune question en attente.</p>}
      <div className="mt-2 space-y-3">
        {enAttente.map((q) => (
          <div key={q.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <p className="text-sm text-ink">{q.texte}</p>
            <p className="mt-1 text-xs text-muted">{new Date(q.date).toLocaleString("fr-FR")}</p>
            <textarea
              value={brouillons[q.id] || ""}
              onChange={(e) => setBrouillons((b) => ({ ...b, [q.id]: e.target.value }))}
              placeholder="Votre réponse…"
              rows={2}
              className="mt-3 w-full rounded-lg border border-line bg-canvas p-2 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => handleRepondre(q.id)}
              disabled={envoiEnCours[q.id]}
              className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:opacity-60"
            >
              {envoiEnCours[q.id] ? "Envoi…" : "Répondre"}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted">
        Répondues ({repondues.length})
      </p>
      <div className="mt-2 space-y-3">
        {repondues.map((q) => (
          <div key={q.id} className="rounded-card border border-line bg-canvas p-4">
            <p className="text-sm text-ink">{q.texte}</p>
            <p className="mt-2 border-l-2 border-accent pl-3 text-sm text-muted">{q.reponse}</p>
          </div>
        ))}
      </div>

      <AdminOpportunites />
    </main>
  );
}
