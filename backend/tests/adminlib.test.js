import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { validerEmail, validerMotDePasse } from "../scripts/adminLib";

describe("validerEmail", () => {
  it("normalise et accepte une adresse correcte", () => {
    expect(validerEmail("  Awa.Traore@Exemple.ORG ")).toEqual({ ok: true, email: "awa.traore@exemple.org" });
  });
  it("refuse une adresse invalide", () => {
    for (const mauvais of ["", "pasunemail", "a@b", "a b@c.org", null, "x".repeat(260) + "@a.org"]) expect(validerEmail(mauvais).ok, String(mauvais)).toBe(false);
  });
});

describe("validerMotDePasse (compte qui peut publier)", () => {
  it("accepte une phrase de passe", () => {
    expect(validerMotDePasse("quatre mots sans rapport 7", "awa@exemple.org").ok).toBe(true);
  });
  it("refuse un mot de passe de moins de 12 caractères", () => {
    expect(validerMotDePasse("Court1!").erreur).toMatch(/12 caractères/);
    expect(validerMotDePasse("onzeonzeonz").ok).toBe(false);
  });
  it("refuse les mots de passe courants, répétés ou contenant le début de l'email", () => {
    expect(validerMotDePasse("MotDePasse123").erreur).toMatch(/courant/);
    expect(validerMotDePasse("aaaaaaaaaaaaaa").erreur).toMatch(/prévisible/);
    expect(validerMotDePasse("awatraore-2026-ok", "awatraore@exemple.org").erreur).toMatch(/début de l'adresse/);
  });
  it("refuse l'absence de mot de passe", () => {
    for (const v of [undefined, null, ""]) expect(validerMotDePasse(v).ok).toBe(false);
  });
});

describe("ouvrirSaisie (saisie du mot de passe)", () => {
  const lancer = (entree) =>
    execFileSync(process.execPath, ["-e", "const { ouvrirSaisie } = require('./scripts/adminLib'); (async () => { const s = ouvrirSaisie(); const a = await s.demander('Mot de passe : ', true); const b = await s.demander('Confirmation : ', true); s.fermer(); console.log('RESULTAT=' + JSON.stringify([a, b])); })()"], { input: entree, encoding: "utf8", cwd: process.cwd(), timeout: 15000 });

  it("lit deux saisies successives (mot de passe puis confirmation)", () => {
    const sortie = lancer(["ma phrase de passe 12", "ma phrase de passe 12", ""].join("\n"));
    expect(sortie).toContain('RESULTAT=["ma phrase de passe 12","ma phrase de passe 12"]');
  });
  it("affiche les questions mais jamais le mot de passe tapé", () => {
    const sortie = lancer(["secret-tres-confidentiel", "secret-tres-confidentiel", ""].join("\n"));
    expect(sortie).toContain("Mot de passe :");
    expect(sortie.replace(/RESULTAT=.*/, "")).not.toContain("secret-tres-confidentiel");
  });
});
