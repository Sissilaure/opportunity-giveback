// Vérifie en LECTURE SEULE que l'API fonctionne avec la vraie base de données (requêtes SQL valides, tables présentes).
// Usage : npm run verifier   (depuis backend/, avec le .env de la base à tester)
// N'écrit rien : pas de cron, pas de création de table, uniquement des routes GET et des SELECT.
// N'affiche aucune donnée personnelle (ni email, ni texte de question) : seulement des compteurs.
require("dotenv").config();
process.env.NODE_ENV = "development";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const request = require("supertest");
const createApp = require("../app");
const { pool } = require("../db");

const ROUTES = [
  "/api/health",
  "/api/opportunites",
  "/api/opportunites?type=bourse",
  "/api/opportunites?q=bourse",
  "/api/stats",
  "/api/resources",
  "/api/faq",
  "/api/questions/answered",
  "/api/equipe",
  "/api/temoignages",
];

function resume(body) {
  if (Array.isArray(body)) return `${body.length} élément(s)`;
  if (body && body.opportunites) return `${body.opportunites.length} opportunité(s)`;
  if (body && body.error) return `erreur : ${body.error}`;
  return "ok";
}

async function main() {
  const app = createApp({ pool });
  let echecs = 0;
  for (const route of ROUTES) {
    try {
      const res = await Promise.race([
        request(app).get(route),
        new Promise((_, rej) => setTimeout(() => rej(new Error("délai de 20 s dépassé")), 20000)),
      ]);
      const ok = res.status === 200;
      if (!ok) echecs += 1;
      console.log(`${ok ? "OK  " : "ÉCHEC"} ${String(res.status).padEnd(4)} ${route.padEnd(34)} ${resume(res.body)}`);
    } catch (err) {
      echecs += 1;
      console.log(`ÉCHEC ---  ${route.padEnd(34)} ${err.message.slice(0, 100)}`);
    }
  }

  const requetes = {
    "opportunités par statut": "SELECT statut, COUNT(*) AS n FROM opportunite GROUP BY statut",
    "publiées : total / sans date / échues": "SELECT COUNT(*) AS total, SUM(date_echeance IS NULL) AS sans_date, SUM(date_echeance < CURDATE()) AS echues FROM opportunite WHERE statut = 'verifiee'",
    "questions en attente / répondues, abonnés, comptes équipe": "SELECT (SELECT COUNT(*) FROM question WHERE statut='en_attente') AS en_attente, (SELECT COUNT(*) FROM question WHERE statut='repondu') AS repondues, (SELECT COUNT(*) FROM newsletter_abonne) AS abonnes, (SELECT COUNT(*) FROM admin_user) AS comptes_equipe",
  };
  for (const [nom, sql] of Object.entries(requetes)) {
    try {
      const [rows] = await pool.query(sql);
      console.log(`OK    ${nom} : ${rows.map((r) => JSON.stringify(r)).join(" ")}`);
    } catch (err) {
      echecs += 1;
      console.log(`ÉCHEC ${nom} : ${err.message.slice(0, 100)}`);
    }
  }

  console.log(echecs === 0 ? "\nTout fonctionne avec cette base." : `\n${echecs} vérification(s) en échec : copiez ces lignes pour diagnostiquer.`);
  await pool.end();
  process.exitCode = echecs === 0 ? 0 : 1;
}

main();
