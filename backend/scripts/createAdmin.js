// Gestion des comptes de l'espace équipe (ceux qui peuvent valider et publier les opportunités).
//
//   node scripts/createAdmin.js ton.email@exemple.com        crée le compte ou remplace son mot de passe
//                                                            (le mot de passe est demandé ensuite, masqué : il ne reste
//                                                             ni dans l'historique du terminal ni à l'écran)
//   node scripts/createAdmin.js --liste                      affiche les comptes existants (emails seulement)
//   node scripts/createAdmin.js --supprimer ton.email@...    supprime un compte (le dernier compte ne peut pas l'être)
//
// Utilise la base indiquée dans backend/.env : vérifiez que c'est bien la base voulue avant de lancer la commande.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { validerEmail, validerMotDePasse, ouvrirSaisie } = require("./adminLib");

async function lister() {
  const [comptes] = await pool.query("SELECT email, created_at FROM admin_user ORDER BY id");
  if (comptes.length === 0) console.log("Aucun compte. Créez-en un : node scripts/createAdmin.js ton.email@exemple.com");
  comptes.forEach((c) => console.log(` - ${c.email}  (créé le ${new Date(c.created_at).toLocaleDateString("fr-FR")})`));
  console.log(`${comptes.length} compte(s).`);
}

async function supprimer(adresse) {
  const e = validerEmail(adresse);
  if (!e.ok) throw new Error(e.erreur);
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM admin_user");
  if (Number(total) <= 1) throw new Error("Impossible : c'est le dernier compte, il faut toujours en garder un.");
  const [res] = await pool.query("DELETE FROM admin_user WHERE email = ?", [e.email]);
  console.log(res.affectedRows ? `Compte ${e.email} supprimé.` : `Aucun compte ${e.email}.`);
}

async function creer(adresse, motDePasseFourni) {
  const e = validerEmail(adresse);
  if (!e.ok) throw new Error(e.erreur);

  let mdp = motDePasseFourni;
  if (mdp === undefined) {
    const saisie = ouvrirSaisie();
    try {
      mdp = await saisie.demander(`Mot de passe pour ${e.email} (12 caractères minimum) : `, true);
      const confirmation = await saisie.demander("Retapez-le pour confirmer : ", true);
      if (mdp !== confirmation) throw new Error("Les deux saisies sont différentes : rien n'a été modifié.");
    } finally {
      saisie.fermer();
    }
  } else {
    console.warn("Attention : un mot de passe tapé dans la commande reste dans l'historique du terminal. Préférez la saisie masquée (sans le 2e argument).");
  }
  const v = validerMotDePasse(mdp, e.email);
  if (!v.ok) throw new Error(v.erreur);

  const hash = await bcrypt.hash(mdp, 12);
  const [res] = await pool.query(
    `INSERT INTO admin_user (email, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [e.email, hash],
  );
  console.log(res.affectedRows === 1 ? `Compte créé pour ${e.email}.` : `Mot de passe de ${e.email} remplacé.`);
}

async function main() {
  const [a, b, c] = process.argv.slice(2);
  if (a === "--liste") return lister();
  if (a === "--supprimer") return supprimer(b);
  if (!a || a.startsWith("--")) {
    console.error("Usage :\n  node scripts/createAdmin.js ton.email@exemple.com\n  node scripts/createAdmin.js --liste\n  node scripts/createAdmin.js --supprimer ton.email@exemple.com");
    process.exitCode = 1;
    return undefined;
  }
  return creer(a, b);
}

main()
  .catch((err) => {
    console.error(`Erreur : ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
