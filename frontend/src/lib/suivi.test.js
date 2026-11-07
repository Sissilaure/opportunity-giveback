import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSuivi, toggleSuivi, estSuivi } from "./suivi";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("suivi", () => {
  it("ajoute puis retire une opportunité", () => {
    expect(toggleSuivi(3)).toBe(true);
    expect(estSuivi("3")).toBe(true);
    expect(toggleSuivi(3)).toBe(false);
    expect(getSuivi()).toEqual([]);
  });

  it("ne plante pas si le contenu stocké est corrompu ou n'est pas une liste", () => {
    localStorage.setItem("yeelen_suivi", "{pas du json");
    expect(getSuivi()).toEqual([]);
    localStorage.setItem("yeelen_suivi", '{"a":1}');
    expect(getSuivi()).toEqual([]);
    localStorage.setItem("yeelen_suivi", '[1,"2","x",null,-4,2.5]');
    expect(getSuivi()).toEqual([1, 2]);
  });

  it("reprend le suivi enregistré sous l'ancien nom du site, sans rien perdre", () => {
    localStorage.setItem("opportunity_hub_suivi", "[4,7]");
    expect(getSuivi()).toEqual([4, 7]);
    expect(localStorage.getItem("yeelen_suivi")).toBe("[4,7]");
    expect(localStorage.getItem("opportunity_hub_suivi")).toBeNull();
  });

  it("garde l'état précédent si le navigateur refuse l'écriture (navigation privée, quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(toggleSuivi(5)).toBe(false);
  });

  it("ignore un identifiant invalide", () => {
    expect(toggleSuivi("abc")).toBe(false);
    expect(toggleSuivi(-2)).toBe(false);
    expect(getSuivi()).toEqual([]);
  });

  it("est vide par défaut", () => {
    expect(getSuivi()).toEqual([]);
    expect(estSuivi(1)).toBe(false);
  });

  it("ignore aussi un contenu corrompu sous l'ancienne clé", () => {
    localStorage.setItem("opportunity_hub_suivi", "{ pas du json valide");
    expect(getSuivi()).toEqual([]);
  });
});
