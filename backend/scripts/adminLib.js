// Outils des comptes de l'espace équipe, sans base de données (donc testables) : règles de validation et saisie masquée.
const readline = require("readline");

const MOTS_DE_PASSE_FAIBLES = new Set([
  "administrateur", "motdepasse123", "motdepasse1234", "password1234", "azertyuiop123", "giveback12345", "yeelen123456",
  "123456789012", "qwertyuiop123", "bienvenue1234", "changeme1234",
]);

function validerEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (e.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { ok: false, erreur: "Adresse email invalide." };
  return { ok: true, email: e };
}

/** Mot de passe d'un compte qui peut PUBLIER sur le site : exigences plus strictes que pour un visiteur. */
function validerMotDePasse(motDePasse, email = "") {
  const m = String(motDePasse ?? "");
  const debutEmail = String(email).split("@")[0].toLowerCase();
  if (m.length < 12) return { ok: false, erreur: "Mot de passe trop court : 12 caractères minimum (une phrase de passe fait très bien l'affaire)." };
  if (m.length > 200) return { ok: false, erreur: "Mot de passe trop long (200 caractères maximum)." };
  if (/^(.)\1+$/.test(m)) return { ok: false, erreur: "Mot de passe trop prévisible (un seul caractère répété)." };
  if (MOTS_DE_PASSE_FAIBLES.has(m.toLowerCase())) return { ok: false, erreur: "Ce mot de passe est trop courant : choisissez-en un autre." };
  if (debutEmail.length >= 4 && m.toLowerCase().includes(debutEmail)) return { ok: false, erreur: "Le mot de passe ne doit pas contenir le début de l'adresse email." };
  return { ok: true };
}

// Saisie au clavier avec une seule interface pour toutes les questions (sinon, avec une saisie arrivant d'un tube, la
// première question avale les lignes suivantes). `masque` : les caractères tapés ne s'affichent pas.
function ouvrirSaisie() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  rl.stdoutMuted = false;
  const SAUTS = ["\r\n", "\n"];
  rl._writeToOutput = (texte) => rl.output.write(rl.stdoutMuted && !SAUTS.includes(texte) ? "" : texte);
  const lignes = rl[Symbol.asyncIterator]();
  return {
    async demander(question, masque = false) {
      process.stdout.write(question);
      rl.stdoutMuted = masque;
      const { value } = await lignes.next();
      rl.stdoutMuted = false;
      if (masque && process.stdin.isTTY) process.stdout.write("\n");
      return value ?? "";
    },
    fermer: () => rl.close(),
  };
}

module.exports = { validerEmail, validerMotDePasse, ouvrirSaisie };
