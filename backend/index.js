require("dotenv").config();
const cron = require("node-cron");
const createApp = require("./app");
const {
  pool,
  initializeQuestionsTable,
  initializeAdminTable,
  initializeNewsletterTable,
  initializeOpportuniteColumns,
  initializeCompteTables,
} = require("./db");
const { rechercherNouvellesOpportunites, verifierEnAttente } = require("./discoveryIA");
const { marquerExpirees } = require("./opportunites");
const MySQLSessionStore = require("./sessionStore");

// Sessions stockées en base (table `sessions`, créée automatiquement) plutôt qu'en
// mémoire : survit aux redémarrages et à la mise en veille du service (hébergement gratuit).
const sessionStore = new MySQLSessionStore(pool);

const app = createApp({ pool, sessionStore });
const PORT = process.env.PORT || 4000;

// Recherche IA de nouvelles opportunités : tout atterrit en statut 'a_verifier', jamais
// publié sans validation d'un membre de l'équipe (voir discoveryIA.js). Sans GEMINI_API_KEY,
// rechercherNouvellesOpportunites() est un no-op silencieux — pas besoin de cliquer sur un
// bouton pour que ça tourne, c'est ce cycle automatique qui alimente la file "à vérifier".
async function cycleAutomatique() {
  try {
    const { ajoutees, publiees, examinees } = await rechercherNouvellesOpportunites(pool);
    if (examinees) {
      console.log(`Recherche IA automatique : ${ajoutees}/${examinees} proposition(s) ajoutée(s), dont ${publiees} publiée(s) après vérification de la source.`);
    }
    const reprises = await verifierEnAttente(pool);
    if (reprises) console.log(`${reprises} proposition(s) en attente publiée(s) après vérification de la source.`);
  } catch (err) {
    console.error("Erreur recherche IA automatique:", err);
  }

  try {
    const purgees = await sessionStore.purge();
    if (purgees) console.log(`${purgees} session(s) expirée(s) supprimée(s).`);
  } catch (err) {
    console.error("Erreur purge des sessions:", err);
  }

  try {
    const archivees = await marquerExpirees(pool, 20);
    if (archivees) {
      console.log(`${archivees} opportunité(s) expirée(s) depuis plus de 20 jours ont été archivées.`);
    }
  } catch (err) {
    console.error("Erreur archivage des opportunités expirées:", err);
  }
}

Promise.all([
  initializeQuestionsTable(),
  initializeAdminTable(),
  initializeNewsletterTable(),
  initializeOpportuniteColumns(),
  initializeCompteTables(),
])
  .then(() => {
    app.listen(PORT, () => console.log(`Backend Yeelen sur http://localhost:${PORT}`));

    // Un premier passage au démarrage (pas besoin d'attendre le lendemain 6h pour voir
    // le système proposer quelque chose), puis un passage quotidien.
    cycleAutomatique();
    cron.schedule("0 6 * * *", cycleAutomatique);
  })
  .catch((err) => {
    console.error("Impossible d'initialiser la base de données:", err);
    process.exitCode = 1;
  });
