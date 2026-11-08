// Ne rend cliquable qu'un lien http(s) : un `javascript:` ou `data:` venu de la base
// s'exécuterait au clic sur un <a href>. Renvoie null si le lien n'est pas sûr.
export function lienSur(valeur) {
  if (typeof valeur !== "string") return null;
  try {
    const { protocol } = new URL(valeur.trim());
    return protocol === "http:" || protocol === "https:" ? valeur.trim() : null;
  } catch {
    return null;
  }
}
