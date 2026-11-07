const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bcrypt = require("bcryptjs");
const { readJson } = require("./jsonStore");

// Récupère le certificat soit depuis un fichier local (dev), soit depuis une variable d'env (prod/Render).
// Renvoie null si aucun des deux n'est fourni (ex. MySQL local sans TLS) au lieu de planter au démarrage.
function getCaCert() {
  if (process.env.DB_CA_CONTENT) {
    const tmpPath = path.join(os.tmpdir(), "aiven-ca.pem");
    fs.writeFileSync(tmpPath, process.env.DB_CA_CONTENT);
    return fs.readFileSync(tmpPath);
  }
  if (process.env.DB_CA_PATH) {
    return fs.readFileSync(path.join(__dirname, process.env.DB_CA_PATH));
  }
  return null;
}

const caCert = getCaCert();

// Trois cas : un CA personnalisé fourni (ex. Aiven), TLS demandé explicitement mais avec
// une autorité déjà reconnue par Node (ex. TiDB Cloud, certificats Let's Encrypt), ou pas
// de TLS du tout (MySQL local en dev).
let sslConfig;
if (caCert) {
  sslConfig = { ca: caCert, rejectUnauthorized: true };
} else if (process.env.DB_SSL === "true") {
  sslConfig = { rejectUnauthorized: true };
} else {
  sslConfig = undefined;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: sslConfig,
});

async function initializeQuestionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS question (
      id CHAR(36) PRIMARY KEY,
      texte TEXT NOT NULL,
      date DATETIME NOT NULL,
      statut ENUM('en_attente', 'repondu') NOT NULL DEFAULT 'en_attente',
      reponse TEXT NULL,
      date_reponse DATETIME NULL,
      INDEX idx_question_statut_date (statut, date)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  const anciennesQuestions = await readJson("questions.json");
  for (const question of anciennesQuestions) {
    await pool.query(
      `INSERT IGNORE INTO question (id, texte, date, statut, reponse, date_reponse)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        question.id,
        question.texte,
        new Date(question.date),
        question.statut,
        question.reponse || null,
        question.dateReponse ? new Date(question.dateReponse) : null,
      ],
    );
  }
}

// Comptes de l'espace équipe : remplace l'ancien mot de passe unique partagé (ADMIN_PASSWORD)
// par de vrais comptes avec mot de passe individuel haché.
async function initializeNewsletterTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_abonne (
      email VARCHAR(255) PRIMARY KEY,
      frequence ENUM('immediate', 'hebdomadaire') NOT NULL DEFAULT 'hebdomadaire',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

async function initializeAdminTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM admin_user");

  // Premier démarrage sans compte : si ADMIN_EMAIL/ADMIN_PASSWORD sont fournis, on crée
  // le premier compte automatiquement. Ensuite, ADMIN_PASSWORD n'est plus utilisé pour l'auth.
  if (total === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 12) {
      console.warn("ADMIN_PASSWORD fait moins de 12 caractères : changez-le dès la première connexion (node scripts/createAdmin.js).");
    }
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.query("INSERT INTO admin_user (email, password_hash) VALUES (?, ?)", [
      process.env.ADMIN_EMAIL.trim().toLowerCase(),
      passwordHash,
    ]);
    console.log(`Compte admin initial créé pour ${process.env.ADMIN_EMAIL}.`);
  }
}

// Ajoute une colonne si elle n'existe pas déjà (MySQL n'a pas « ADD COLUMN IF NOT EXISTS ») : les bases existantes
// se mettent à jour toutes seules au démarrage, sans script manuel. Noms de table/colonne = constantes du code.
async function ajouterColonneSiAbsente(db, table, colonne, definition) {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, colonne],
  );
  if (!rows[0].n) await db.query(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
}

// image_url : image d'aperçu publiée par l'organisme (lue sur sa page officielle).
// verification_auto : 1 si la publication vient de la vérification automatique (pas d'un membre de l'équipe).
async function initializeOpportuniteColumns(db = pool) {
  await ajouterColonneSiAbsente(db, "opportunite", "image_url", "VARCHAR(500) NULL");
  await ajouterColonneSiAbsente(db, "opportunite", "verification_auto", "TINYINT(1) NOT NULL DEFAULT 0");
}

// Comptes des utilisateurs (distincts de admin_user, l'espace équipe) et leur suivi de candidatures.
async function initializeCompteTables(db = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS utilisateur (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      prenom VARCHAR(80) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS suivi_candidature (
      id_utilisateur INT NOT NULL,
      id_opportunite INT NOT NULL,
      statut ENUM('a_faire', 'en_cours', 'soumise', 'acceptee', 'refusee') NOT NULL DEFAULT 'a_faire',
      note VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_utilisateur, id_opportunite)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_lue (
      id_utilisateur INT NOT NULL,
      cle VARCHAR(80) NOT NULL,
      PRIMARY KEY (id_utilisateur, cle)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

module.exports = {
  pool,
  initializeQuestionsTable,
  initializeAdminTable,
  initializeNewsletterTable,
  initializeOpportuniteColumns,
  initializeCompteTables,
};