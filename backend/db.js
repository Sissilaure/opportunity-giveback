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
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.query("INSERT INTO admin_user (email, password_hash) VALUES (?, ?)", [
      process.env.ADMIN_EMAIL.trim().toLowerCase(),
      passwordHash,
    ]);
    console.log(`Compte admin initial créé pour ${process.env.ADMIN_EMAIL}.`);
  }
}

module.exports = { pool, initializeQuestionsTable, initializeAdminTable, initializeNewsletterTable };