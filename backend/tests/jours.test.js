import { describe, it, expect } from "vitest";
import { joursAvant, formatOpportunite } from "../opportunites";

const lundi10h = new Date(2026, 10, 9, 10, 0, 0); // 9 novembre 2026, 10 h (heure locale)

describe("joursAvant : jours calendaires, indépendants du fuseau et du format", () => {
  it("donne le même résultat pour un Date local, un texte AAAA-MM-JJ et un ISO UTC", () => {
    expect(joursAvant(new Date(2026, 10, 11), lundi10h)).toBe(2);
    expect(joursAvant("2026-11-11", lundi10h)).toBe(2);
    expect(joursAvant("2026-11-11T00:00:00.000Z", lundi10h)).toBe(2);
  });
  it("compte 0 le jour même (quelle que soit l'heure) et un nombre négatif après la date", () => {
    expect(joursAvant("2026-11-09", new Date(2026, 10, 9, 23, 59))).toBe(0);
    expect(joursAvant("2026-11-09", new Date(2026, 10, 9, 0, 1))).toBe(0);
    expect(joursAvant("2026-11-08", lundi10h)).toBe(-1);
  });
  it("traverse les changements de mois et d'année", () => {
    expect(joursAvant("2027-01-01", new Date(2026, 11, 30, 18, 0))).toBe(2);
  });
  it("renvoie null pour une valeur illisible", () => {
    expect(joursAvant("pas-une-date", lundi10h)).toBeNull();
  });
});

describe("formatOpportunite : statut d'échéance", () => {
  const base = { id: 1, titre: "x", type: "bourse", organisme: "o", statut: "verifiee" };
  const demain = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; };
  it("classe une échéance proche, lointaine, passée et absente", () => {
    expect(formatOpportunite({ ...base, date_echeance: demain() })).toMatchObject({ joursRestants: 1, statutEcheance: "proche" });
    const loin = new Date(); loin.setDate(loin.getDate() + 60);
    expect(formatOpportunite({ ...base, date_echeance: loin }).statutEcheance).toBe("normale");
    const passe = new Date(); passe.setDate(passe.getDate() - 3);
    expect(formatOpportunite({ ...base, date_echeance: passe })).toMatchObject({ joursRestants: -3, statutEcheance: "depassee" });
    expect(formatOpportunite({ ...base, date_echeance: null })).toMatchObject({ joursRestants: null, statutEcheance: "permanente" });
  });
});
