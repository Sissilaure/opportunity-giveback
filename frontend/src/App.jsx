import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Accueil from "./pages/Accueil";
import Repertoire from "./pages/Repertoire";
import FicheDetaillee from "./pages/FicheDetaillee";
import Ressources from "./pages/Ressources";
import RessourceDetail from "./pages/RessourceDetail";
import Aide from "./pages/Aide";
import Equipe from "./pages/Equipe";
import Suivi from "./pages/Suivi";
import Connexion from "./pages/Connexion";
import Notifications from "./pages/Notifications";
import Confidentialite from "./pages/Confidentialite";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";

// L'espace équipe n'est utile qu'à quelques personnes : il est chargé à la demande, pas pour chaque visiteur.
const Admin = lazy(() => import("./pages/Admin"));

// Remet la page en haut à chaque changement de route (sauf navigation vers une ancre #...).
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function PagePublique() {
  const { pathname } = useLocation();
  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <NavBar />
      {/* key = chemin : la transition d'entrée rejoue à chaque page, mais pas quand seul un filtre change. */}
      <div id="contenu" key={pathname} className="page-enter">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/opportunites" element={<Repertoire />} />
          <Route path="/opportunites/:id" element={<FicheDetaillee />} />
          <Route path="/ressources" element={<Ressources />} />
          <Route path="/ressources/:id" element={<RessourceDetail />} />
          <Route path="/aide" element={<Aide />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/suivi" element={<Suivi />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </div>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-canvas">
      <ScrollToTop />
      <Routes>
        {/* L'espace équipe a sa propre page de connexion, sans la nav publique */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<p className="p-8 text-center text-sm text-muted">Chargement…</p>}>
              <Admin />
            </Suspense>
          }
        />
        <Route path="*" element={<PagePublique />} />
      </Routes>
    </div>
  );
}
