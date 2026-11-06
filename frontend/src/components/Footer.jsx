import { Link } from "react-router-dom";

const COLONNES = [
  {
    titre: "Explorer",
    liens: [
      { to: "/opportunites", label: "Opportunités" },
      { to: "/opportunites?type=bourse", label: "Bourses" },
      { to: "/opportunites?type=stage", label: "Stages" },
      { to: "/opportunites?type=concours", label: "Concours" },
      { to: "/suivi", label: "Mon suivi" },
    ],
  },
  {
    titre: "Ressources",
    liens: [
      { to: "/ressources", label: "Guides et modèles" },
      { to: "/aide", label: "FAQ et questions" },
      { to: "/#comment-ca-marche", label: "Comment ça marche" },
    ],
  },
  {
    titre: "À propos",
    liens: [
      { to: "/equipe", label: "L'équipe" },
      { to: "/confidentialite", label: "Confidentialité" },
      { to: "/admin", label: "Espace équipe" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-4">
        <div>
          <p className="font-display text-xl font-semibold text-ink">
            Opportunity <span className="text-accent">Hub</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Bourses, stages et opportunités vérifiés pour les étudiant·e·s et jeunes diplômé·e·s africain·e·s. Projet
            Give Back, 2iE.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:contents">
        {COLONNES.map((col) => (
          <div key={col.titre}>
            <p className="text-xs font-bold uppercase tracking-widest text-muted">{col.titre}</p>
            <ul className="mt-2">
              {col.liens.map((lien) => (
                <li key={lien.label}>
                  <Link to={lien.to} className="inline-block py-2.5 text-sm text-ink hover:text-primary hover:underline">
                    {lien.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-muted sm:px-8">
          © {new Date().getFullYear()} Opportunity Hub. La plateforme ne garantit pas l'obtention d'une bourse et ne
          remplace pas les sites officiels des organismes.
        </p>
      </div>
    </footer>
  );
}
