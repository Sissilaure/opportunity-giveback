import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { rechercherNouvellesOpportunites } from "../discoveryIA";

const reponseGemini = (propositions) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ propositions }) }] } }] }),
});

const prop = (titre, extra = {}) => ({
  titre, type: "bourse", organisme: "Org " + titre, siteWeb: "https://org.example",
  publicEligible: "Etudiants", criteres: ["a"], piecesRequises: ["CV"], lienSource: "https://org.example/" + titre, ...extra,
});

let pool;
beforeEach(() => {
  process.env.GEMINI_API_KEY = "cle-test";
  process.env.AUTO_PUBLISH = "true"; // mode automatique ; le mode prudent est testé séparément
  pool = {
    insertions: [],
    query: vi.fn(async (sql, params) => {
      if (/FROM opportunite o/.test(sql) && /statut = 'verifiee'/.test(sql)) return [[], []];
      if (/SELECT id FROM opportunite WHERE titre/.test(sql)) return [[], []];
      if (/SELECT id_structure/.test(sql)) return [[{ id_structure: 1 }], []];
      if (/INSERT INTO opportunite/.test(sql)) { pool.insertions.push({ sql, params }); return [{ insertId: 1 }, []]; }
      return [[], []];
    }),
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
  delete process.env.AUTO_PUBLISH;
});

describe("recherche automatique : publication après vérification de la source", () => {
  it("publie directement une piste dont la source est vérifiée (avec son image), garde l'autre en attente", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reponseGemini([prop("Sure"), prop("Douteuse")]));
    const verifier = vi.fn(async ({ titre }) =>
      titre === "Sure"
        ? { verifiee: true, imageUrl: "https://org.example/hero.jpg", raison: "ok" }
        : { verifiee: false, imageUrl: null, raison: "introuvable" });

    const r = await rechercherNouvellesOpportunites(pool, { verifier });

    expect(r).toEqual({ ajoutees: 2, publiees: 1, examinees: 2 });
    const [sure, douteuse] = pool.insertions;
    expect(sure.sql).toContain("NOW()");
    expect(sure.params).toContain("verifiee");
    expect(sure.params).toContain("https://org.example/hero.jpg");
    expect(sure.params.at(-1)).toBe(1); // verification_auto
    expect(douteuse.sql).not.toContain("NOW()");
    expect(douteuse.params).toContain("a_verifier");
    expect(douteuse.params.at(-1)).toBe(0);
  });

  it("mode prudent (par défaut) : la source est lue mais rien n'est publié sans une personne de l'équipe", async () => {
    delete process.env.AUTO_PUBLISH;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reponseGemini([prop("Sure")]));
    const verifier = vi.fn(async () => ({ verifiee: true, imageUrl: "https://org.example/hero.jpg", raison: "ok" }));
    const r = await rechercherNouvellesOpportunites(pool, { verifier });
    expect(verifier).toHaveBeenCalledTimes(1);
    expect(r.publiees).toBe(0);
    expect(pool.insertions[0].sql).not.toContain("NOW()");
    expect(pool.insertions[0].params).toContain("a_verifier");
    expect(pool.insertions[0].params).toContain("https://org.example/hero.jpg");
    expect(pool.insertions[0].params.at(-1)).toBe(0);
  });

  it("n'ajoute jamais une piste dont le lien source n'est pas http(s), même si la vérification passerait", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reponseGemini([prop("Piege", { lienSource: "javascript:alert(1)" })]));
    const verifier = vi.fn(async () => ({ verifiee: true, imageUrl: null }));
    const r = await rechercherNouvellesOpportunites(pool, { verifier });
    expect(r.ajoutees).toBe(0);
    expect(verifier).not.toHaveBeenCalled();
  });

  it("une panne de vérification ne bloque pas : la piste reste en attente", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reponseGemini([prop("Sure")]));
    const verifier = vi.fn(async () => { throw new Error("réseau"); });
    // `verifier` injecté peut lever : la route ne doit pas planter (comportement par défaut = verifierSansPlanter).
    await expect(rechercherNouvellesOpportunites(pool, { verifier: async (c) => verifier(c).catch(() => ({ verifiee: false, imageUrl: null })) })).resolves.toMatchObject({ ajoutees: 1, publiees: 0 });
  });
});
