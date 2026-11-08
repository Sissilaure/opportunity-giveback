import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MenuIcon, CloseIcon, BellIcon } from "./icons";
import { useAuth } from "../context/AuthContext";

const LIENS = [
  { href: "/opportunites", label: "Opportunités" },
  { href: "/ressources", label: "Ressources" },
  { href: "/equipe", label: "Équipe" },
  { href: "/aide", label: "Aide" },
];

// Les sous-pages (ex. /opportunites/12) gardent leur entrée de menu active.
const estActif = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

export default function NavBar() {
  const location = useLocation();
  const { utilisateur, nonLues, deconnexion } = useAuth();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const fermerMenu = () => setMenuOuvert(false);
  const [defile, setDefile] = useState(false);

  // Échap ferme le menu mobile ; le menu se referme aussi à chaque changement de page.
  useEffect(() => {
    if (!menuOuvert) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOuvert(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOuvert]);

  useEffect(() => {
    const onScroll = () => setDefile(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur transition-shadow duration-300 ${defile ? "shadow-header" : ""}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4">
        <Link to="/" aria-label="Yeelen, accueil" onClick={fermerMenu} className="group -my-1 flex items-center py-1.5">
          <img src="/brand/logo-header.svg" alt="Yeelen" width="205" height="40" className="h-8 w-auto sm:h-10" />
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {LIENS.map((lien) => {
            const actif = estActif(location.pathname, lien.href);
            return (
              <Link
                key={lien.href}
                to={lien.href}
                className={`relative pb-1 text-sm font-medium transition-colors ${
                  actif ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {lien.label}
                {actif && <span className="absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
          {utilisateur ? (
            <>
              <Link
                to="/notifications"
                aria-label={nonLues > 0 ? `Notifications : ${nonLues} non lue${nonLues > 1 ? "s" : ""}` : "Notifications"}
                className="relative -mr-2 rounded-lg p-2 text-ink transition hover:text-primary"
              >
                <BellIcon className="h-6 w-6" />
                {nonLues > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-white">
                    {nonLues > 9 ? "9+" : nonLues}
                  </span>
                )}
              </Link>
              <Link to="/suivi" className="text-sm font-medium text-muted transition-colors hover:text-ink">
                Mon suivi
              </Link>
            </>
          ) : (
            <Link to="/connexion" className="text-sm font-medium text-muted transition-colors hover:text-ink">
              Se connecter
            </Link>
          )}
          <Link
            to="/opportunites"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            Explorer
          </Link>
        </nav>

        <button
          onClick={() => setMenuOuvert((v) => !v)}
          aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOuvert}
          aria-controls="menu-mobile"
          className="-mr-2 rounded-lg p-3 text-ink sm:hidden"
        >
          {menuOuvert ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {menuOuvert && (
        <nav id="menu-mobile" aria-label="Menu principal" className="animate-fade-up border-t border-line bg-canvas px-5 pb-4 pt-2 sm:hidden">
          <div className="flex flex-col">
            {LIENS.map((lien) => {
              const actif = estActif(location.pathname, lien.href);
              return (
                <Link
                  key={lien.href}
                  to={lien.href}
                  onClick={fermerMenu}
                  aria-current={actif ? "page" : undefined}
                  className={`rounded-lg px-2 py-3.5 text-base font-medium ${
                    actif ? "bg-primary-light text-primary" : "text-ink"
                  }`}
                >
                  {lien.label}
                </Link>
              );
            })}
            <Link to="/suivi" onClick={fermerMenu} className="rounded-lg px-2 py-3.5 text-base font-medium text-ink">
              Mon suivi
            </Link>
            {utilisateur ? (
              <>
                <Link to="/notifications" onClick={fermerMenu} className="flex items-center gap-2 rounded-lg px-2 py-3.5 text-base font-medium text-ink">
                  Notifications
                  {nonLues > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">{nonLues}</span>}
                </Link>
                <button
                  onClick={() => {
                    fermerMenu();
                    deconnexion();
                  }}
                  className="rounded-lg px-2 py-3.5 text-left text-base font-medium text-muted"
                >
                  Me déconnecter
                </button>
              </>
            ) : (
              <Link to="/connexion" onClick={fermerMenu} className="rounded-lg px-2 py-3.5 text-base font-medium text-ink">
                Se connecter
              </Link>
            )}
            <Link
              to="/opportunites"
              onClick={fermerMenu}
              className="mt-2 rounded-xl bg-primary px-4 py-3.5 text-center text-base font-semibold text-white"
            >
              Explorer les opportunités
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
