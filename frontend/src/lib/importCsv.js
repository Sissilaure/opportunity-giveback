// Lecture d'un tableur collé ou d'un fichier CSV/TSV pour l'import en lot d'opportunités.
// Tolérant sur la forme (Excel français avec « ; », Google Sheets avec tabulations, noms de colonnes en français ou sans
// accents, dates JJ/MM/AAAA), strict sur le fond : chaque ligne est contrôlée comme le fera le serveur, avant l'envoi.

export const TYPES = ["bourse", "stage", "emploi", "concours", "autre"];
export const MAX_LIGNES = 100;

const simplifier = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Nom de colonne (simplifié) → champ attendu par l'API.
const COLONNES = {
  titre: "titre", intitule: "titre", nom: "titre",
  type: "type", categorie: "type",
  organisme: "organisme", organisation: "organisme", structure: "organisme",
  siteweb: "siteWeb", site: "siteWeb", siteofficiel: "siteWeb",
  publiceligible: "publicEligible", public: "publicEligible", eligibles: "publicEligible", beneficiaires: "publicEligible",
  criteres: "criteres", criteresprincipaux: "criteres",
  pieces: "piecesRequises", piecesrequises: "piecesRequises", documents: "piecesRequises",
  dateecheance: "dateEcheance", echeance: "dateEcheance", datelimite: "dateEcheance", date: "dateEcheance", datelimitedepot: "dateEcheance",
  liensource: "lienSource", lien: "lienSource", source: "lienSource", url: "lienSource", lienofficiel: "lienSource",
  image: "imageUrl", imageurl: "imageUrl", illustration: "imageUrl",
};
const OBLIGATOIRES = ["titre", "type", "organisme", "lienSource"];
export const LIBELLES = { titre: "Titre", type: "Type", organisme: "Organisme", lienSource: "Lien source" };

const TYPES_ALIAS = {
  bourse: "bourse", bourses: "bourse", stage: "stage", stages: "stage", emploi: "emploi", emplois: "emploi", job: "emploi",
  concours: "concours", autre: "autre", autres: "autre", formation: "autre", formations: "autre", programme: "autre",
};

function detecterSeparateur(texte) {
  const premiere = texte.split(/\r?\n/).find((l) => l.trim()) || "";
  const compte = (c) => premiere.split(c).length - 1;
  const candidats = [["\t", compte("\t")], [";", compte(";")], [",", compte(",")]].sort((a, b) => b[1] - a[1]);
  return candidats[0][1] > 0 ? candidats[0][0] : ";";
}

// Lecteur CSV : guillemets, guillemets doublés (""), retours à la ligne dans une cellule.
export function lireTableau(texte) {
  const brut = String(texte ?? "").replace(/^﻿/, "");
  const sep = detecterSeparateur(brut);
  const lignes = [];
  let ligne = [];
  let cellule = "";
  let entreGuillemets = false;
  for (let i = 0; i < brut.length; i++) {
    const c = brut[i];
    if (entreGuillemets) {
      if (c === '"' && brut[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else cellule += c;
    } else if (c === '"' && cellule === "") entreGuillemets = true;
    else if (c === sep) { ligne.push(cellule); cellule = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && brut[i + 1] === "\n") i++;
      ligne.push(cellule); cellule = "";
      if (ligne.some((x) => x.trim() !== "")) lignes.push(ligne);
      ligne = [];
    } else cellule += c;
  }
  ligne.push(cellule);
  if (ligne.some((x) => x.trim() !== "")) lignes.push(ligne);
  return lignes;
}

const liste = (v) => String(v ?? "").split(/\s*\|\s*|\r?\n/).map((x) => x.trim()).filter(Boolean).join("\n");
const estHttp = (v) => /^https?:\/\/\S+$/i.test(v);

// JJ/MM/AAAA, JJ-MM-AAAA ou AAAA-MM-JJ → AAAA-MM-JJ ; null si la date n'existe pas (31/02, 45/13…).
export function normaliserDate(valeur) {
  const v = String(valeur ?? "").trim();
  if (!v) return "";
  let a, m, j;
  let r = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) [, a, m, j] = r;
  else if ((r = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, j, m, a] = r;
  else return null;
  const d = new Date(Date.UTC(+a, +m - 1, +j));
  if (d.getUTCFullYear() !== +a || d.getUTCMonth() !== +m - 1 || d.getUTCDate() !== +j) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

function verifierLigne(d) {
  const e = [];
  if (d.titre.length < 3) e.push("Titre trop court (3 caractères minimum).");
  if (d.titre.length > 255) e.push("Titre trop long.");
  if (d.organisme.length < 2) e.push("Organisme manquant.");
  if (!TYPES.includes(d.type)) e.push(`Type inconnu : choisissez parmi ${TYPES.join(", ")}.`);
  if (!estHttp(d.lienSource) || d.lienSource.length > 500) e.push("Lien source invalide (il doit commencer par http:// ou https://).");
  if (d.siteWeb && (!estHttp(d.siteWeb) || d.siteWeb.length > 255)) e.push("Site web invalide.");
  if (d.imageUrl && (!/^https:\/\/\S+$/i.test(d.imageUrl) || d.imageUrl.length > 500)) e.push("L'image doit être une adresse https.");
  if (d.publicEligible.length > 2000 || d.criteres.length > 4000 || d.piecesRequises.length > 4000) e.push("Un texte est trop long.");
  return e;
}

/**
 * @returns {{ vide: boolean, manquantes: string[], ignorees: string[], lignes: {numero:number, donnees:object, erreurs:string[]}[] }}
 */
export function preparerImport(texte) {
  const tableau = lireTableau(texte);
  if (tableau.length === 0) return { vide: true, manquantes: [], ignorees: [], lignes: [] };

  const entetes = tableau[0].map((h) => COLONNES[simplifier(h)] || null);
  const ignorees = tableau[0].filter((_, i) => !entetes[i]).map((h) => h.trim()).filter(Boolean);
  const manquantes = OBLIGATOIRES.filter((c) => !entetes.includes(c));
  if (manquantes.length > 0) return { vide: false, manquantes: manquantes.map((c) => LIBELLES[c]), ignorees, lignes: [] };

  const lignes = tableau.slice(1).map((cellules, i) => {
    const brut = {};
    entetes.forEach((champ, k) => { if (champ) brut[champ] = (cellules[k] ?? "").trim(); });
    const typeSimple = simplifier(brut.type);
    const date = normaliserDate(brut.dateEcheance);
    const donnees = {
      titre: brut.titre || "",
      type: TYPES_ALIAS[typeSimple] || brut.type?.toLowerCase() || "",
      organisme: brut.organisme || "",
      siteWeb: brut.siteWeb || "",
      publicEligible: brut.publicEligible || "",
      criteres: liste(brut.criteres),
      piecesRequises: liste(brut.piecesRequises),
      dateEcheance: date ?? "",
      lienSource: brut.lienSource || "",
      imageUrl: brut.imageUrl || "",
    };
    const erreurs = verifierLigne(donnees);
    if (date === null) erreurs.push("Date limite invalide (utilisez JJ/MM/AAAA ou AAAA-MM-JJ).");
    return { numero: i + 1, donnees, erreurs };
  });
  return { vide: false, manquantes: [], ignorees, lignes };
}

// Modèle à télécharger : séparateur « ; » (Excel en français), BOM pour que les accents s'affichent correctement.
export const MODELE_CSV =
  "﻿titre;type;organisme;site_web;public;criteres;pieces;date_limite;lien_source\r\n" +
  'Bourse d\'excellence exemple;bourse;Fondation Exemple;https://fondation.exemple.org;Étudiants de licence;"Moins de 25 ans | Bonnes notes";"CV | Lettre de motivation";31/12/2027;https://fondation.exemple.org/bourse\r\n';
