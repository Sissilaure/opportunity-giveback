import { describe, it, expect } from "vitest";
import { genererICS } from "./calendrier";

const base = {
  id: 7,
  titre: "Bourse, d'excellence; 2026",
  organisme: "Fondation X",
  dateEcheance: "2026-03-15",
  url: "https://exemple.org/bourse",
};
const T0 = new Date("2026-01-01T10:00:00Z");

describe("genererICS", () => {
  it("produit un événement journée entière avec alerte à J-7", () => {
    const ics = genererICS(base, T0);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260315");
    expect(ics).toContain("DTEND;VALUE=DATE:20260316");
    expect(ics).toContain("TRIGGER:-P7D");
    expect(ics).toContain("DTSTAMP:20260101T100000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("échappe les virgules et points-virgules du titre", () => {
    const ics = genererICS(base, T0);
    expect(ics).toContain("SUMMARY:Échéance : Bourse\\, d'excellence\\; 2026");
  });

  it("replie les lignes de plus de 75 caractères", () => {
    const ics = genererICS({ ...base, titre: "x".repeat(200) }, T0);
    const lignes = ics.split("\r\n");
    expect(lignes.every((l) => l.length <= 75)).toBe(true);
  });

  it("retourne null sans date valide (opportunité permanente ou donnée corrompue)", () => {
    expect(genererICS({ ...base, dateEcheance: null })).toBeNull();
    expect(genererICS({ ...base, dateEcheance: "pas-une-date" })).toBeNull();
  });

  it("accepte une date ISO complète renvoyée par l'API", () => {
    expect(genererICS({ ...base, dateEcheance: "2026-03-15T00:00:00.000Z" }, T0)).toContain("DTSTART;VALUE=DATE:20260315");
  });
});
