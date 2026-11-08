import { describe, it, expect } from "vitest";
import { lireTableau, preparerImport, normaliserDate, MODELE_CSV } from "./importCsv";

const EN_TETE = "titre;type;organisme;lien_source;date_limite;criteres";

describe("lireTableau", () => {
  it("devine le séparateur : point-virgule, tabulation ou virgule", () => {
    expect(lireTableau("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(lireTableau("a\tb\tc\n1\t2\t3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(lireTableau("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
  it("gère les guillemets, les guillemets doublés et les retours à la ligne dans une cellule", () => {
    const t = lireTableau('titre;note\n"Bourse ; spéciale";"Il a dit ""oui"""\n"Deux\nlignes";x');
    expect(t[1]).toEqual(["Bourse ; spéciale", 'Il a dit "oui"']);
    expect(t[2]).toEqual(["Deux\nlignes", "x"]);
  });
  it("ignore les lignes vides, accepte les fins de ligne Windows et le BOM d'Excel", () => {
    expect(lireTableau("﻿a;b\r\n\r\n1;2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("normaliserDate", () => {
  it("convertit JJ/MM/AAAA, JJ-MM-AAAA et accepte AAAA-MM-JJ", () => {
    expect(normaliserDate("05/03/2027")).toBe("2027-03-05");
    expect(normaliserDate("5-3-2027")).toBe("2027-03-05");
    expect(normaliserDate("2027-03-05")).toBe("2027-03-05");
    expect(normaliserDate("")).toBe("");
  });
  it("refuse les dates qui n'existent pas ou mal écrites", () => {
    for (const d of ["31/02/2027", "45/13/2027", "2027-02-30", "demain", "12/2027"]) expect(normaliserDate(d), d).toBeNull();
  });
});

describe("preparerImport", () => {
  it("lit des lignes valides, normalise le type, les dates et les listes", () => {
    const r = preparerImport(`${EN_TETE}\nBourse Alpha;Bourses;Fondation A;https://a.org/x;31/12/2027;Licence | Moins de 30 ans`);
    expect(r.lignes).toHaveLength(1);
    expect(r.lignes[0].erreurs).toEqual([]);
    expect(r.lignes[0].donnees).toMatchObject({ titre: "Bourse Alpha", type: "bourse", dateEcheance: "2027-12-31", criteres: "Licence\nMoins de 30 ans" });
  });

  it("reconnaît les noms de colonnes en français, avec ou sans accents", () => {
    const r = preparerImport("Intitulé;Catégorie;Organisation;Échéance;Lien officiel\nStage X;stage;Org Y;01/01/2028;https://o.org");
    expect(r.manquantes).toEqual([]);
    expect(r.lignes[0].donnees).toMatchObject({ titre: "Stage X", type: "stage", organisme: "Org Y", dateEcheance: "2028-01-01" });
  });

  it("signale les colonnes obligatoires manquantes et les colonnes ignorées", () => {
    const r = preparerImport("titre;organisme;commentaire\nA;B;C");
    expect(r.manquantes).toEqual(["Type", "Lien source"]);
    expect(r.ignorees).toEqual(["commentaire"]);
    expect(r.lignes).toEqual([]);
  });

  it("explique chaque erreur ligne par ligne sans bloquer les autres", () => {
    const r = preparerImport(
      `${EN_TETE}\nOK Titre;bourse;Org;https://o.org;;\nAb;bourse;Org;https://o.org;;\nTitre ok;cadeau;Org;https://o.org;;\nTitre ok;bourse;Org;javascript:alert(1);;\nTitre ok;bourse;;https://o.org;;\nTitre ok;bourse;Org;https://o.org;31/02/2027;`,
    );
    const erreurs = r.lignes.map((l) => l.erreurs.length);
    expect(erreurs).toEqual([0, 1, 1, 1, 1, 1]);
    expect(r.lignes[1].erreurs[0]).toMatch(/trop court/);
    expect(r.lignes[2].erreurs[0]).toMatch(/Type inconnu/);
    expect(r.lignes[3].erreurs[0]).toMatch(/Lien source invalide/);
    expect(r.lignes[4].erreurs[0]).toMatch(/Organisme/);
    expect(r.lignes[5].erreurs[0]).toMatch(/Date limite invalide/);
  });

  it("refuse une image qui n'est pas en https", () => {
    const r = preparerImport("titre;type;organisme;lien;image\nBourse Z;bourse;Org;https://o.org;http://x.org/a.jpg");
    expect(r.lignes[0].erreurs[0]).toMatch(/https/);
  });

  it("traite un texte vide", () => {
    expect(preparerImport("   \n  ").vide).toBe(true);
  });

  it("le modèle proposé au téléchargement s'importe sans aucune erreur", () => {
    const r = preparerImport(MODELE_CSV);
    expect(r.manquantes).toEqual([]);
    expect(r.lignes).toHaveLength(1);
    expect(r.lignes[0].erreurs).toEqual([]);
    expect(r.lignes[0].donnees.criteres).toBe("Moins de 25 ans\nBonnes notes");
    expect(r.lignes[0].donnees.dateEcheance).toBe("2027-12-31");
  });
});
