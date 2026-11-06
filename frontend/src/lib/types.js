// Catégories réelles d'opportunités, alignées sur l'ENUM `opportunite.type` en base.
// Chaque type porte sa propre couleur : ça sert de repère visuel dans une grille dense,
// et ça évite que toute la page tourne autour d'une seule teinte.
export const TYPE_LABELS = {
  bourse: "BOURSE",
  stage: "STAGE",
  emploi: "EMPLOI",
  concours: "CONCOURS",
  autre: "AUTRE",
};

export const TYPE_STYLES = {
  bourse: { bar: "bg-primary", badge: "bg-primary-light text-primary" },
  stage: { bar: "bg-accent", badge: "bg-accent-light text-accent" },
  emploi: { bar: "bg-success", badge: "bg-success-bg text-success" },
  concours: { bar: "bg-feature", badge: "bg-feature-bg text-feature" },
  autre: { bar: "bg-muted", badge: "bg-canvas text-muted" },
};

// Visuel par catégorie (photos libres de droits Pexels, hébergées dans /public/images).
export const TYPE_IMAGES = {
  bourse: "/images/bourse.jpg",
  stage: "/images/stage.jpg",
  emploi: "/images/emploi.jpg",
  concours: "/images/concours.jpg",
  autre: "/images/autre.jpg",
};

export const imageDuType = (type) => TYPE_IMAGES[type] || TYPE_IMAGES.autre;

// Quelques variantes par type, choisies selon l'id : une liste de 4 bourses n'affiche pas 4 fois la même photo,
// et une opportunité garde toujours la même image d'une visite à l'autre.
const VARIANTES = {
  bourse: ["bourse", "campus", "accompagnement"],
  stage: ["stage", "emploi"],
  emploi: ["emploi", "stage"],
  concours: ["concours", "autre"],
  autre: ["autre", "campus"],
};

export function imageOpportunite({ id, type }) {
  const noms = VARIANTES[type] || VARIANTES.autre;
  return `/images/${noms[Math.abs(Number(id) || 0) % noms.length]}.jpg`;
}
