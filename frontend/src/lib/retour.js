// N'accepte qu'un chemin interne comme page de retour : « ?retour=https://site-pirate » ne doit jamais rediriger dehors.
export function retourSur(valeur) {
  return typeof valeur === "string" && /^\/(?![/\\])/.test(valeur) ? valeur : "/suivi";
}
