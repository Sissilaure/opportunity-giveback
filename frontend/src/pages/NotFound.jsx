import { Link } from "react-router-dom";
import useTitre from "../hooks/useTitre";

export default function NotFound() {
  useTitre("Page introuvable");
  return (
    <main className="mx-auto max-w-xl px-5 py-20 text-center sm:px-8">
      <p className="font-display text-7xl text-primary">404</p>
      <h1 className="mt-2 font-display text-3xl text-ink">Cette page n'existe pas</h1>
      <p className="mt-2 text-muted">Le lien est peut-être ancien ou mal saisi. Reprenez depuis l'accueil.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Retour à l'accueil
        </Link>
        <Link
          to="/opportunites"
          className="rounded-xl border border-ink/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink"
        >
          Voir les opportunités
        </Link>
      </div>
    </main>
  );
}
