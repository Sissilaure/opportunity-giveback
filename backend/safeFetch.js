// Téléchargement de pages web externes, protégé contre le SSRF.
// Les adresses viennent de la sortie d'une IA : elles ne sont jamais dignes de confiance. Sans protection, une adresse
// comme http://169.254.169.254/ (métadonnées du cloud) ou http://localhost:3306 ferait lire au serveur ses propres
// ressources internes. On résout le nom nous-mêmes, on refuse toute adresse privée, puis on se connecte à l'IP
// validée (pas de seconde résolution possible → pas de « DNS rebinding »).
const dns = require("dns").promises;
const net = require("net");
const http = require("http");
const https = require("https");

function ipv4Privee(ip) {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || // partage d'adresses opérateur
    (a === 169 && b === 254) || // lien local + métadonnées cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function estIpPrivee(ip) {
  const v = net.isIP(ip);
  if (v === 4) return ipv4Privee(ip);
  if (v === 6) {
    const bas = ip.toLowerCase();
    const mappee = bas.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappee) return ipv4Privee(mappee[1]);
    return bas === "::" || bas === "::1" || /^f[cd]/.test(bas) || /^fe[89ab]/.test(bas) || bas.startsWith("ff");
  }
  return true; // pas une IP valide : on refuse par prudence
}

async function resoudreSure(hostname, autoriserPrive) {
  if (net.isIP(hostname)) {
    if (!autoriserPrive && estIpPrivee(hostname)) throw new Error("Adresse interne refusée.");
    return { address: hostname, family: net.isIP(hostname) };
  }
  const adresses = await dns.lookup(hostname, { all: true });
  if (adresses.length === 0) throw new Error("Nom de domaine introuvable.");
  if (!autoriserPrive && adresses.some((a) => estIpPrivee(a.address))) throw new Error("Adresse interne refusée.");
  return adresses[0];
}

const REDIRECTIONS = new Set([301, 302, 303, 307, 308]);

/**
 * Télécharge une page HTML. Refuse : schémas non http(s), ports inhabituels, adresses privées (y compris après
 * redirection), contenus non HTML, réponses trop lourdes, lenteur.
 * `autoriserPrive` n'existe que pour les tests (serveur local) : ne jamais l'activer en production.
 */
async function lireHtml(url, { delai = 8000, maxOctets = 400_000, maxRedirections = 3, autoriserPrive = false } = {}) {
  let courante = url;
  for (let saut = 0; saut <= maxRedirections; saut++) {
    const u = new URL(courante);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Schéma non autorisé.");
    if (u.port && !["80", "443"].includes(u.port) && !autoriserPrive) throw new Error("Port non autorisé.");
    if (u.username || u.password) throw new Error("Identifiants dans l'adresse refusés.");

    const cible = await resoudreSure(u.hostname.replace(/^\[|\]$/g, ""), autoriserPrive);
    const reponse = await new Promise((resolve, reject) => {
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.request(
        u,
        {
          method: "GET",
          timeout: delai,
          headers: {
            "User-Agent": "YeelenBot/1.0 (+vérification de sources d'opportunités)",
            Accept: "text/html,application/xhtml+xml",
          },
          // Connexion forcée vers l'IP déjà validée.
          lookup: (_h, _o, cb) => cb(null, cible.address, cible.family || net.isIP(cible.address)),
        },
        (res) => resolve({ res, req }),
      );
      req.on("timeout", () => req.destroy(new Error("Délai dépassé.")));
      req.on("error", reject);
      req.end();
    });

    const { res, req } = reponse;
    if (REDIRECTIONS.has(res.statusCode) && res.headers.location) {
      res.resume();
      courante = new URL(res.headers.location, u).toString();
      continue;
    }

    const type = String(res.headers["content-type"] || "");
    if (!/text\/html|application\/xhtml/i.test(type)) {
      res.resume();
      return { url: courante, status: res.statusCode, html: "" };
    }

    const morceaux = [];
    let total = 0;
    await new Promise((resolve, reject) => {
      res.on("data", (c) => {
        total += c.length;
        morceaux.push(c);
        if (total > maxOctets) {
          req.destroy();
          resolve();
        }
      });
      res.on("end", resolve);
      res.on("error", (e) => (total > maxOctets ? resolve() : reject(e)));
      res.on("close", resolve);
    });
    return { url: courante, status: res.statusCode, html: Buffer.concat(morceaux).toString("utf8").slice(0, maxOctets) };
  }
  throw new Error("Trop de redirections.");
}

module.exports = { lireHtml, estIpPrivee };
