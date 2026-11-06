import { Component } from "react";

// Filet de sécurité : une erreur de rendu n'affiche plus une page blanche mais un message avec une issue.
export default class ErrorBoundary extends Component {
  state = { erreur: false };

  static getDerivedStateFromError() {
    return { erreur: true };
  }

  componentDidCatch(error) {
    // Pas de télémétrie pour l'instant : la console suffit au débogage.
    console.error("Erreur d'affichage :", error);
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <main role="alert" className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
        <p className="font-display text-3xl font-semibold text-ink">Un problème est survenu</p>
        <p className="mt-2 text-base text-muted">
          Cette page n'a pas pu s'afficher. Rechargez-la ou revenez à l'accueil, vos opportunités suivies sont conservées.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Recharger la page
          </button>
          <a href="/" className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:border-primary">
            Retour à l'accueil
          </a>
        </div>
      </main>
    );
  }
}
