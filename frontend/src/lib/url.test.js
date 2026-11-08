import { describe, it, expect } from "vitest";
import { lienSur } from "./url";

describe("lienSur", () => {
  it("accepte http et https", () => {
    expect(lienSur("https://exemple.org/a")).toBe("https://exemple.org/a");
    expect(lienSur("http://exemple.org")).toBe("http://exemple.org");
  });

  it("refuse les schémas dangereux et les valeurs invalides", () => {
    expect(lienSur("javascript:alert(1)")).toBeNull();
    expect(lienSur("data:text/html,x")).toBeNull();
    expect(lienSur("n'importe quoi")).toBeNull();
    expect(lienSur(null)).toBeNull();
    expect(lienSur(undefined)).toBeNull();
  });
});
