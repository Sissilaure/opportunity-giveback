import { describe, it, expect, vi, afterEach } from "vitest";
import { generateJson } from "../gemini";

const ok = (texte) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: texte }] } }] }) });
const echec = (status) => ({ ok: false, status, text: async () => "erreur" });

afterEach(() => vi.restoreAllMocks());

describe("generateJson (résilience)", () => {
  it("réessaie après un 503 de surcharge puis réussit", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(echec(503)).mockResolvedValueOnce(ok("{}"));
    await expect(generateJson({ prompt: "x", apiKey: "k", pause: 0 })).resolves.toBe("{}");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("bascule sur le modèle de secours si le principal reste saturé", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(echec(503)).mockResolvedValueOnce(echec(503)).mockResolvedValueOnce(ok("{}"));
    await generateJson({ prompt: "x", apiKey: "k", model: "gemini-flash-lite-latest", pause: 0 });
    expect(f.mock.calls[2][0]).toContain("gemini-flash-latest:generateContent");
  });

  it("ne réessaie pas une erreur définitive (clé invalide)", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(echec(403));
    await expect(generateJson({ prompt: "x", apiKey: "k", pause: 0 })).rejects.toThrow(/403/);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("échoue proprement quand tous les essais sont saturés", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(echec(503));
    await expect(generateJson({ prompt: "x", apiKey: "k", pause: 0 })).rejects.toThrow(/503/);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("réessaie quand Google ne répond pas dans le délai (au lieu de bloquer le visiteur)", async () => {
    const delaiDepasse = Object.assign(new Error("timeout"), { name: "TimeoutError" });
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(delaiDepasse).mockResolvedValueOnce(ok("{}"));
    await expect(generateJson({ prompt: "x", apiKey: "k", pause: 0 })).resolves.toBe("{}");
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[0][1].signal).toBeDefined();
  });
});
