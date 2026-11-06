import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEquipe } from "../lib/api";
import useTitre from "../hooks/useTitre";

function initiales(nom) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}

export default function Equipe() {
  useTitre("L'équipe");
  const [membres, setMembres] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    fetchEquipe()
      .then(setMembres)
      .catch(() => setErreur("Impossible de charger l'équipe."))
      .finally(() => setChargement(false));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Notre équipe</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Une petite équipe, une grande mission
      </h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Des anciens boursiers, des chargés de veille et des développeurs, tous bénévoles et convaincus que
        l'information change des destins.
      </p>

      {chargement && <p className="mt-6 text-sm text-muted">Chargement…</p>}
      {erreur && <p className="mt-6 text-sm text-danger">{erreur}</p>}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {membres.map((m, i) => (
          <article key={m.id} style={{ "--delay": `${i * 70}ms` }} className="animate-fade-up rounded-card border border-line bg-surface p-5 shadow-card">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-lg font-semibold text-white"
              aria-hidden="true"
            >
              {initiales(m.nom)}
            </div>
            <h2 className="mt-3 font-display text-lg font-semibold text-ink">{m.nom}</h2>
            <p className="text-sm font-medium text-accent-dark">{m.role}</p>
            <p className="mt-2 text-sm text-muted">{m.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-card border border-line bg-accent-light p-5">
        <h2 className="font-display text-xl font-semibold text-ink">Une question ? Contactez-nous</h2>
        <p className="mt-1 text-sm text-ink/80">
          Posez-la depuis la page Aide : un membre de l'équipe vous répond, et la réponse enrichit la FAQ pour les
          autres candidats.
        </p>
        <Link
          to="/aide"
          className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Poser une question
        </Link>
      </div>
    </main>
  );
}
