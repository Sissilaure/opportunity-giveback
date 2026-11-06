import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MenuIcon, CloseIcon } from "./icons";

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
  const [menuOuvert, setMenuOuvert] = useState(false);
  const fermerMenu = () => setMenuOuvert(false);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 shadow-header backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4">
        <Link to="/" aria-label="Accueil" onClick={fermerMenu} className="group flex items-center gap-2.5 sm:gap-3">
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 shrink-0 rounded-full shadow-card transition-transform duration-300 ease-out group-hover:rotate-6 group-hover:scale-105 sm:h-11 sm:w-11"
          />
          <span className="font-display text-lg font-semibold tracking-tight sm:text-2xl">
            <span className="text-ink">Opportunity</span>{" "}
            <span
              className="bg-[length:200%_auto] bg-gradient-to-r from-accent via-[#EAD08A] to-accent bg-clip-text text-transparent transition-[background-position] duration-700 ease-out group-hover:bg-[position:100%_0]"
              style={{ backgroundPosition: "0% 0" }}
            >
              Hub
            </span>
          </span>
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
          className="rounded-lg p-2 text-ink sm:hidden"
        >
          {menuOuvert ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {menuOuvert && (
        <nav className="border-t border-line bg-surface px-5 py-2 sm:hidden">
          <div className="flex flex-col">
            {LIENS.map((lien) => {
              const actif = estActif(location.pathname, lien.href);
              return (
                <Link
                  key={lien.href}
                  to={lien.href}
                  onClick={fermerMenu}
                  className={`rounded-lg px-2 py-3 text-sm font-medium ${
                    actif ? "text-primary" : "text-ink"
                  }`}
                >
                  {lien.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
