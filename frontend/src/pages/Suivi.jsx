import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOpportunite } from "../lib/api";
import { getSuivi, toggleSuivi } from "../lib/suivi";
import useTitre from "../hooks/useTitre";
import OpportuniteCard from "../components/OpportuniteCard";

// Liste des opportunités mises de côté. Stockée uniquement sur l'appareil : pas de compte, pas de données envoyées.
export default function Suivi() {
  useTitre("Mon suivi");
  const [opportunites, setOpportunites] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const ids = getSuivi();
    Promise.allSettled(ids.map((id) => fetchOpportunite(id))).then((resultats) => {
      // Une opportunité archivée ou supprimée depuis n'existe plus : on l'ignore silencieusement.
      setOpportunites(resultats.filter((r) => r.status === "fulfilled").map((r) => r.value));
      setChargement(false);
    });
  }, []);

  function retirer(id) {
    toggleSuivi(id);
    setOpportunites((liste) => liste.filter((o) => o.id !== id));
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Mon suivi</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Mes opportunités
      </h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Retrouvez ici les opportunités que vous avez mises de côté. Cette liste reste sur votre appareil : aucun compte,
        aucune donnée envoyée.
      </p>

      {chargement && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-64 rounded-card" />
          ))}
        </div>
      )}

      {!chargement && opportunites.length === 0 && (
        <div className="animate-fade-up mt-10 rounded-card border border-dashed border-line bg-surface p-10 text-center">
          <p className="font-display text-xl font-semibold text-ink">Rien dans votre suivi pour l'instant</p>
          <p className="mt-1 text-sm text-muted">
            Ouvrez une opportunité et utilisez « Ajouter à mon suivi » pour la retrouver ici.
          </p>
          <Link
            to="/opportunites"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Explorer les opportunités
          </Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunites.map((opp, i) => (
          <div key={opp.id} className="animate-fade-up flex flex-col gap-2" style={{ "--delay": `${i * 70}ms` }}>
            <OpportuniteCard opportunite={opp} />
            <button
              onClick={() => retirer(opp.id)}
              className="self-start text-xs font-medium text-muted underline-offset-2 hover:text-danger hover:underline"
            >
              Retirer de mon suivi
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
