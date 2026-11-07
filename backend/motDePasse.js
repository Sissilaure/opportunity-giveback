// Hachage des mots de passe des utilisateurs avec scrypt (module crypto de Node, aucune dépendance).
// Pourquoi pas bcryptjs : il calcule en JavaScript sur le fil principal, donc chaque connexion GÈLE tout le serveur
// (mesuré : 10 connexions simultanées = 3,6 s pendant lesquelles les autres visiteurs attendent). crypto.scrypt tourne
// dans le pool de threads de Node : le serveur continue de répondre aux autres pendant le calcul.
// Paramètres N=2^14, r=8, p=5 : l'une des combinaisons équivalentes recommandées par l'OWASP, avec seulement 16 Mo de
// mémoire par calcul (un hébergement gratuit n'a pas la place pour 128 Mo × plusieurs connexions).
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const N = 2 ** 14;
const R = 8;
const P = 5;
const LONGUEUR = 64;

const scrypt = (mdp, sel, n, r, p, longueur) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(mdp, sel, longueur, { N: n, r, p, maxmem: 256 * n * r }, (err, cle) => (err ? reject(err) : resolve(cle))),
  );

async function hashMotDePasse(motDePasse) {
  const sel = crypto.randomBytes(16);
  const cle = await scrypt(motDePasse.normalize("NFKC"), sel, N, R, P, LONGUEUR);
  return `scrypt$${N}$${R}$${P}$${sel.toString("base64")}$${cle.toString("base64")}`;
}

// Accepte aussi d'anciens hachages bcrypt (compatibilité) ; compare en temps constant.
async function verifierMotDePasse(motDePasse, stocke) {
  if (typeof stocke !== "string") return false;
  if (stocke.startsWith("$2")) return bcrypt.compare(motDePasse, stocke);
  const [schema, n, r, p, sel, attendu] = stocke.split("$");
  if (schema !== "scrypt" || !attendu) return false;
  const attenduBuf = Buffer.from(attendu, "base64");
  const cle = await scrypt(motDePasse.normalize("NFKC"), Buffer.from(sel, "base64"), Number(n), Number(r), Number(p), attenduBuf.length);
  return crypto.timingSafeEqual(cle, attenduBuf);
}

// Hachage factice, comparé quand le compte n'existe pas : même durée de réponse, donc pas de fuite par le temps.
let factice;
const hashFactice = () => (factice ??= hashMotDePasse("mot-de-passe-inexistant-yeelen"));

module.exports = { hashMotDePasse, verifierMotDePasse, hashFactice };
