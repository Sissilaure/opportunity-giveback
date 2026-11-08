import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { hashMotDePasse, verifierMotDePasse, hashFactice } from "../motDePasse";

describe("hachage des mots de passe (scrypt)", () => {
  it("vérifie le bon mot de passe et refuse les autres", async () => {
    const h = await hashMotDePasse("une-phrase-de-passe-solide");
    expect(await verifierMotDePasse("une-phrase-de-passe-solide", h)).toBe(true);
    expect(await verifierMotDePasse("une-phrase-de-passe-solidE", h)).toBe(false);
    expect(await verifierMotDePasse("", h)).toBe(false);
  });
  it("ne stocke jamais le mot de passe et sale chaque hachage", async () => {
    const [a, b] = await Promise.all([hashMotDePasse("meme-mot-de-passe-12"), hashMotDePasse("meme-mot-de-passe-12")]);
    expect(a).not.toBe(b);
    expect(a).not.toContain("meme-mot-de-passe-12");
    expect(a).toMatch(/^scrypt\$16384\$8\$5\$/);
  });
  it("accepte les accents sous leurs deux formes Unicode (é composé ou décomposé)", async () => {
    const h = await hashMotDePasse("café-au-lait-chaud");
    expect(await verifierMotDePasse("café-au-lait-chaud", h)).toBe(true);
  });
  it("reste compatible avec d'anciens hachages bcrypt", async () => {
    const ancien = bcrypt.hashSync("ancien-mot-de-passe", 4);
    expect(await verifierMotDePasse("ancien-mot-de-passe", ancien)).toBe(true);
    expect(await verifierMotDePasse("autre", ancien)).toBe(false);
  });
  it("refuse proprement une valeur stockée illisible ou absente", async () => {
    for (const mauvais of [null, undefined, "", "scrypt$", "scrypt$1$2$3$4", "n-importe-quoi", 42]) {
      expect(await verifierMotDePasse("x", mauvais), String(mauvais)).toBe(false);
    }
  });
  it("ne bloque pas le serveur pendant le calcul (le fil principal reste disponible)", async () => {
    let battements = 0;
    const horloge = setInterval(() => battements++, 5);
    await Promise.all(Array.from({ length: 4 }, (_, i) => hashMotDePasse("mot-de-passe-numero-" + i)));
    clearInterval(horloge);
    expect(battements).toBeGreaterThan(3); // avec bcryptjs, le fil principal était gelé : 0 battement
  });
  it("fournit un hachage factice du même type (durée de réponse identique si le compte n'existe pas)", async () => {
    expect(await hashFactice()).toMatch(/^scrypt\$/);
  });
});
