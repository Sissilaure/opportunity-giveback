import { describe, it, expect } from "vitest";
import { retourSur } from "./retour";

describe("retourSur", () => {
  it("accepte un chemin interne", () => {
    expect(retourSur("/opportunites/3")).toBe("/opportunites/3");
    expect(retourSur("/suivi?x=1")).toBe("/suivi?x=1");
  });
  it("refuse toute redirection vers un autre site (open redirect)", () => {
    for (const piege of ["https://site-pirate.example", "//site-pirate.example", "/\\site-pirate.example", "javascript:alert(1)", "http://localhost", "", null, undefined, 42]) {
      expect(retourSur(piege), String(piege)).toBe("/suivi");
    }
  });
});
