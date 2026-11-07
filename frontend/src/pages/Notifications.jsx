import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchNotifications, marquerNotificationsLues } from "../lib/api";
import useTitre from "../hooks/useTitre";

export default function Notifications() {
  useTitre("Notifications");
  const { utilisateur, rafraichirNotifications } = useAuth();
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    fetchNotifications()
      .then((d) => {
        setListe(d.notifications);
        setErreur("");
      })
      .catch(() => setErreur("Impossible de charger vos notifications. Vérifiez votre connexion."));
  }, []);

  useEffect(() => {
    if (utilisateur) charger();
  }, [utilisateur, charger]);

  if (utilisateur === undefined) return <main className="mx-auto max-w-2xl px-5 pt-10 text-sm text-muted">Chargement…</main>;
  if (utilisateur === null) return <Navigate to="/connexion?retour=/notifications" replace />;

  async function marquer(cles) {
    try {
      await marquerNotificationsLues(cles);
      setListe((l) => l.map((n) => (cles.includes(n.cle) ? { ...n, lue: true } : n)));
      rafraichirNotifications();
    } catch {
      /* sans gravité : le compteur se corrigera au prochain rafraîchissement */
    }
  }

  const nonLues = (liste || []).filter((n) => !n.lue);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-14 pt-6 sm:px-8 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Mon compte</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">Notifications</h1>
        {nonLues.length > 0 && (
          <button onClick={() => marquer(nonLues.map((n) => n.cle))} className="min-h-[40px] py-2 text-sm font-semibold text-primary hover:underline">
            Tout marquer comme lu
          </button>
        )}
      </div>
      <p className="mt-2 font-serif text-xl italic text-muted">Vos rappels d'échéance et les nouveautés.</p>

      {erreur && <p role="alert" className="mt-6 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">{erreur}</p>}
      {!liste && !erreur && <div className="skeleton mt-6 h-24 rounded-card" aria-busy="true" />}

      {liste && liste.length === 0 && (
        <div className="mt-8 rounded-card border border-dashed border-line bg-surface p-10 text-center">
          <p className="font-serif text-2xl text-ink">Rien de nouveau</p>
          <p className="mt-1 text-sm text-muted">
            Ajoutez des opportunités à votre suivi : vous serez prévenu à 7, 3 et 1 jour de la date limite.
          </p>
          <Link to="/opportunites" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
            Explorer les opportunités
          </Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {(liste || []).map((n) => {
          const urgent = n.niveau === "urgent";
          const contenu = (
            <>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.lue ? "bg-line" : urgent ? "bg-danger" : "bg-accent"}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{n.titre}</span>
                <span className={`block text-sm ${urgent && !n.lue ? "font-medium text-danger" : "text-muted"}`}>{n.message}</span>
              </span>
              {!n.lue && <span className="ml-auto shrink-0 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-ink">Nouveau</span>}
            </>
          );
          const classes = `flex items-start gap-3 rounded-card border p-4 transition ${n.lue ? "border-line bg-transparent" : "border-line bg-surface"}`;
          return (
            <li key={n.cle}>
              {n.idOpportunite ? (
                <Link to={`/opportunites/${n.idOpportunite}`} onClick={() => !n.lue && marquer([n.cle])} className={`${classes} hover:border-ink/40`}>
                  {contenu}
                </Link>
              ) : (
                <button type="button" onClick={() => !n.lue && marquer([n.cle])} className={`${classes} w-full text-left`}>
                  {contenu}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
