// Gestion du suivi personnel : stocké uniquement sur l'appareil, sans compte (RG8, RG9).
// Le stockage peut être absent ou refusé (navigation privée, quota plein) et son contenu peut être corrompu :
// rien ici ne doit jamais faire planter la page.
const CLE_STOCKAGE = "yeelen_suivi";
const ANCIENNE_CLE = "opportunity_hub_suivi"; // avant le changement de nom : on la reprend pour ne rien faire perdre

function lire(cle) {
  try {
    const valeur = JSON.parse(localStorage.getItem(cle) || "[]");
    return Array.isArray(valeur) ? valeur.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

function ecrire(ids) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

export function getSuivi() {
  const actuel = lire(CLE_STOCKAGE);
  if (actuel.length > 0) return actuel;
  const ancien = lire(ANCIENNE_CLE);
  if (ancien.length > 0) {
    ecrire(ancien);
    try {
      localStorage.removeItem(ANCIENNE_CLE);
    } catch {
      /* sans importance */
    }
  }
  return ancien;
}

export function estSuivi(id) {
  return getSuivi().includes(Number(id));
}

// Retourne l'état final (true = suivi). Si le stockage refuse l'écriture, l'état reste inchangé.
export function toggleSuivi(id) {
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) return false;
  const suivis = getSuivi();
  const dejaSuivi = suivis.includes(idNum);
  const nouveaux = dejaSuivi ? suivis.filter((i) => i !== idNum) : [...suivis, idNum];
  return ecrire(nouveaux) ? !dejaSuivi : dejaSuivi;
}
