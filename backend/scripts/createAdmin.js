// Crée ou met à jour un compte de l'espace équipe.
// Usage : node scripts/createAdmin.js email@exemple.com "mot de passe"
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

async function main() {
  const [email, motDePasse] = process.argv.slice(2);

  if (!email || !motDePasse) {
    console.error("Usage : node scripts/createAdmin.js email@exemple.com \"mot de passe\"");
    process.exitCode = 1;
    return;
  }

  if (motDePasse.length < 12) {
    console.error("Mot de passe trop court : 12 caractères minimum (une phrase de passe fait très bien l'affaire).");
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(motDePasse, 12);

  await pool.query(
    `INSERT INTO admin_user (email, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [email.trim().toLowerCase(), passwordHash],
  );

  console.log(`Compte admin prêt pour ${email}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
