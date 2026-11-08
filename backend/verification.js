// Vérification automatique d'une opportunité proposée par l'IA.
// L'IA travaille de mémoire et peut inventer un programme ou une adresse. Avant toute publication sans humain, le serveur
// va lire la page officielle indiquée et vérifie que : (1) elle existe, (2) elle parle bien de ce programme et de cet
// organisme. Ça confirme la SOURCE ; ça ne garantit pas chaque critère rédigé par l'IA, d'où la mention « vérifié
// automatiquement » côté interface.
const { lireHtml } = require("./safeFetch");
const { safeHttpUrl } = require("./security");

const MOTS_VIDES = new Set([
  "de", "du", "des", "la", "le", "les", "et", "en", "pour", "the", "for", "and", "of", "in", "a", "an", "to", "program",
  "programme", "programs", "programmes", "scholarship", "scholarships", "bourse", "bourses", "stage", "stages", "concours",
  "award", "awards", "prix", "call", "appel", "pour", "jeunes", "young", "international", "global", "national",
]);

// Les arnaques aux fausses bourses reposent presque toujours sur un site « jetable » dont le nom ressemble à celui d'un vrai
// programme. Une page qui cite le bon nom ne suffit donc pas : on refuse d'office les hébergements gratuits, les liens
// raccourcis, les adresses IP, les noms trompeurs (punycode), les extensions très utilisées pour les escroqueries et le http.
// Conséquence voulue : en cas de doute, la fiche reste « à vérifier » au lieu d'être publiée.
const RACCOURCISSEURS = /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|buff\.ly|is\.gd|cutt\.ly|rebrand\.ly|lnkd\.in|shorturl\.at|tiny\.cc|rb\.gy|forms\.gle)$/i;
const HEBERGEMENTS_GRATUITS = /(^|\.)(blogspot\.[a-z.]+|wordpress\.com|wixsite\.com|weebly\.com|000webhostapp\.com|sites\.google\.com|github\.io|netlify\.app|vercel\.app|pages\.dev|herokuapp\.com|webflow\.io|carrd\.co|linktr\.ee|notion\.site|my\.canva\.site|godaddysites\.com|jimdofree\.com|site123\.me|yolasite\.com|strikingly\.com)$/i;
const EXTENSIONS_RISQUEES = /\.(xyz|top|click|buzz|loan|work|icu|cfd|sbs|rest|monster|cyou|quest|gq|ml|tk|cf|ga|zip|mov|vip|win|bid|stream|gdn|men|party|review|science|trade|webcam)$/i;

/** Raison pour laquelle on ne fait pas confiance à cette adresse, ou null si rien d'anormal. */
function domaineSuspect(adresse) {
  let u;
  try {
    u = new URL(adresse);
  } catch {
    return "adresse illisible";
  }
  const hote = u.hostname.toLowerCase();
  if (u.protocol !== "https:") return "la page n'est pas en https";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote.includes(":") || hote.startsWith("[")) return "adresse IP au lieu d'un nom de domaine";
  if (/(^|\.)xn--/.test(hote)) return "nom de domaine trompeur (caractères imitant un autre nom)";
  if (RACCOURCISSEURS.test(hote)) return "lien raccourci ou formulaire anonyme";
  if (HEBERGEMENTS_GRATUITS.test(hote)) return "site hébergé gratuitement, pas un site d'organisme";
  if (EXTENSIONS_RISQUEES.test(hote)) return "extension de domaine très utilisée pour les arnaques";
  return null;
}

function normaliser(texte) {
  return String(texte || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function mots(texte) {
  return [...new Set(normaliser(texte).split(/[^a-z0-9]+/).filter((m) => m.length >= 4 && !MOTS_VIDES.has(m)))];
}

function texteVisible(html) {
  return normaliser(
    html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#?\w+;/g, " "),
  );
}

function metaContenu(html, nomsPossibles) {
  for (const balise of html.match(/<meta\b[^>]*>/gi) || []) {
    const cle = (balise.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (cle && nomsPossibles.includes(cle.toLowerCase())) {
      const contenu = (balise.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1];
      if (contenu) return contenu.replace(/&amp;/g, "&").trim();
    }
  }
  return null;
}

// Image d'aperçu publiée par l'organisme lui-même (balise Open Graph) : https uniquement, jamais d'URL relative cassée.
function extraireImage(html, urlPage) {
  const brut = metaContenu(html, ["og:image", "og:image:url", "twitter:image"]);
  if (!brut) return null;
  try {
    const absolue = new URL(brut, urlPage);
    if (absolue.protocol !== "https:") return null;
    const sure = safeHttpUrl(absolue.toString());
    return sure && sure.length <= 500 ? sure : null;
  } catch {
    return null;
  }
}

/**
 * @returns {{ verifiee: boolean, raison: string, imageUrl: string|null }}
 */
async function verifierSource({ titre, organisme, lienSource, siteWeb }, { lire = lireHtml } = {}) {
  const doute = domaineSuspect(lienSource);
  if (doute) return { verifiee: false, raison: doute, imageUrl: null };
  let page;
  try {
    page = await lire(lienSource);
  } catch (err) {
    return { verifiee: false, raison: `page illisible (${err.message})`, imageUrl: null };
  }
  // Une redirection peut mener ailleurs que le lien annoncé : l'adresse FINALE est contrôlée à son tour.
  const dernierDoute = domaineSuspect(page.url);
  if (dernierDoute) return { verifiee: false, raison: `après redirection : ${dernierDoute}`, imageUrl: null };
  if (page.status < 200 || page.status >= 300) {
    return { verifiee: false, raison: `la page répond ${page.status}`, imageUrl: null };
  }
  if (!page.html) return { verifiee: false, raison: "la page n'est pas du HTML", imageUrl: null };

  const texte = texteVisible(page.html);
  const titreCourt = normaliser(metaContenu(page.html, ["og:title"]) || (page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const corpus = `${titreCourt} ${texte}`;

  // (a) Le programme est cité : au moins la moitié des mots distinctifs du titre figurent sur la page.
  const motsTitre = mots(titre);
  const domaine = normaliser(`${new URL(page.url).hostname} ${siteWeb || ""}`);
  if (motsTitre.length > 0) {
    const trouves = motsTitre.filter((m) => corpus.includes(m)).length;
    if (trouves < Math.ceil(motsTitre.length / 2)) {
      return { verifiee: false, raison: "le programme n'apparaît pas sur la page", imageUrl: null };
    }
  }

  // (b) La page appartient bien à l'organisme : son nom apparaît (la page peut être en anglais alors que l'organisme est
  // écrit en français : « Gouvernement britannique »), OU le nom du programme figure dans le domaine (chevening.org).
  const motsOrg = mots(organisme);
  const organismeOk =
    motsOrg.length === 0 ||
    motsOrg.some((m) => corpus.includes(m) || domaine.includes(m)) ||
    motsTitre.some((m) => domaine.includes(m));
  if (!organismeOk) return { verifiee: false, raison: "l'organisme n'apparaît pas sur la page", imageUrl: null };

  return { verifiee: true, raison: "source officielle lue et cohérente", imageUrl: extraireImage(page.html, page.url) };
}

module.exports = { domaineSuspect, verifierSource, extraireImage, mots, texteVisible };
