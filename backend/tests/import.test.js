import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import createApp from "../app";
import { enrichirImages, normaliserTitre } from "../importOpportunites";

const pool = { query: vi.fn() };
const enrichir = vi.fn(async () => {}); // jamais de vrai site web dans les tests
const app = createApp({ pool, enrichirImages: enrichir });
const HASH = bcrypt.hashSync("motdepasse", 4);

const ligne = (titre, extra = {}) => ({
  titre,
  type: "bourse",
  organisme: "Fondation Test",
  siteWeb: "https://fondation.example",
  publicEligible: "Étudiants",
  criteres: "Licence\nMoins de 30 ans",
  piecesRequises: "CV",
  dateEcheance: "2027-03-15",
  lienSource: "https://fondation.example/" + encodeURIComponent(titre),
  ...extra,
});

let n = 0;
// Une adresse différente par appel : la limite « 10 imports / 10 min » est partagée par tous les tests du fichier.
let m = 0;
const importer = (agent) => agent.post("/api/admin/opportunites/importer").set("X-Forwarded-For", `10.88.0.${++m}`);
async function admin() {
  const agent = request.agent(app);
  pool.query.mockResolvedValueOnce([[{ id: 1, email: "admin@test.org", password_hash: HASH }], []]);
  const res = await agent.post("/api/admin/login").set("X-Forwarded-For", `10.77.0.${++n}`).send({ email: `admin${n}@test.org`, motDePasse: "motdepasse" });
  expect(res.status).toBe(200);
  pool.query.mockReset();
  return agent;
}

// Faux pool : titres déjà en base + compteur d'identifiants ; mémorise les INSERT pour les inspecter.
function brancherBase({ titresExistants = [] } = {}) {
  const insertions = [];
  let id = 100;
  pool.query.mockImplementation(async (sql, params) => {
    if (/SELECT titre FROM opportunite/.test(sql)) return [titresExistants.map((titre) => ({ titre })), []];
    if (/SELECT id_structure/.test(sql)) return [[{ id_structure: 5 }], []];
    if (/INSERT INTO opportunite/.test(sql)) {
      insertions.push({ sql, params });
      return [{ insertId: ++id }, []];
    }
    return [[], []];
  });
  return insertions;
}

beforeEach(() => {
  pool.query.mockReset();
  enrichir.mockClear();
});

describe("POST /api/admin/opportunites/importer : accès", () => {
  it("refuse sans session d'équipe, sans lire le moindre corps ni toucher la base", async () => {
    const res = await request(app).post("/api/admin/opportunites/importer").send({ mode: "publier", lignes: [ligne("A")] });
    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("refuse une écriture venue d'un autre site (CSRF)", async () => {
    const agent = await admin();
    const res = await importer(agent).set("Origin", "https://site-pirate.example").send({ mode: "publier", lignes: [ligne("A")] });
    expect(res.status).toBe(403);
  });

  it("garde la limite de 20 Ko partout ailleurs (seul l'import a une limite plus large)", async () => {
    const res = await request(app).post("/api/newsletter").send({ email: "a@b.org", x: "y".repeat(30000) });
    expect(res.status).toBe(413);
  });
});

describe("POST /api/admin/opportunites/importer : import", () => {
  it("publie directement les lignes valides et rend compte des lignes en échec", async () => {
    const agent = await admin();
    const insertions = brancherBase({ titresExistants: ["Bourse Déjà Là"] });
    const res = await importer(agent).send({
      mode: "publier",
      lignes: [
        ligne("Bourse Nouvelle"),
        ligne("Bourse Déjà Là"), // déjà en base
        ligne("Mauvais type", { type: "cadeau" }),
        ligne("Lien piégé", { lienSource: "javascript:alert(1)" }),
        ligne("Image http", { imageUrl: "http://x.example/a.jpg" }),
        ligne("Sans organisme", { organisme: "" }),
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ajoutees: 1, doublons: 1, invalides: 4, mode: "publier" });
    expect(res.body.resultats.map((r) => [r.ligne, r.statut])).toEqual([[1, "ajoutee"], [2, "doublon"], [3, "invalide"], [4, "invalide"], [5, "invalide"], [6, "invalide"]]);
    expect(res.body.resultats[2].raison).toMatch(/Type/);
    expect(res.body.resultats[3].raison).toMatch(/Lien source/);
    expect(JSON.stringify(res.body)).not.toMatch(/Invalid|Required/);
    expect(insertions).toHaveLength(1);
    expect(insertions[0].sql).toContain("NOW()");
    expect(insertions[0].params).toContain("verifiee");
    expect(insertions[0].params).toContain("2027-03-15");
  });

  it("met en attente sans date de vérification quand on choisit « à vérifier »", async () => {
    const agent = await admin();
    const insertions = brancherBase();
    const res = await importer(agent).send({ mode: "a_verifier", lignes: [ligne("Piste X")] });
    expect(res.status).toBe(201);
    expect(insertions[0].sql).not.toContain("NOW()");
    expect(insertions[0].params).toContain("a_verifier");
    expect(insertions[0].params).not.toContain("verifiee");
  });

  it("repère les doublons à l'intérieur du fichier, accents et majuscules ignorés", async () => {
    const agent = await admin();
    const insertions = brancherBase();
    const res = await importer(agent).send({
      mode: "publier",
      lignes: [ligne("Bourse d'Excellence Éducation"), ligne("  bourse d'excellence   education ")],
    });
    expect(res.body).toMatchObject({ ajoutees: 1, doublons: 1 });
    expect(insertions).toHaveLength(1);
  });

  it("crée chaque organisme une seule fois par import", async () => {
    const agent = await admin();
    brancherBase();
    await importer(agent).send({ mode: "publier", lignes: [ligne("Opportunité A1"), ligne("Opportunité A2"), ligne("Opportunité A3")] });
    const recherches = pool.query.mock.calls.filter(([sql]) => /SELECT id_structure/.test(sql));
    expect(recherches).toHaveLength(1);
  });

  it("accepte un gros import (100 lignes, bien au-delà de 20 Ko) mais refuse 101 lignes", async () => {
    const agent = await admin();
    brancherBase();
    const grosse = (i) => ligne(`Opportunité numéro ${i}`, { criteres: "x".repeat(600), publicEligible: "y".repeat(600) });
    const cent = Array.from({ length: 100 }, (_, i) => grosse(i));
    expect(JSON.stringify(cent).length).toBeGreaterThan(60000);
    const ok = await importer(agent).send({ mode: "publier", lignes: cent });
    expect(ok.status).toBe(201);
    expect(ok.body.ajoutees).toBe(100);

    brancherBase();
    const trop = await importer(agent).send({ mode: "publier", lignes: [...cent, grosse(101)] });
    expect(trop.status).toBe(400);
    expect(trop.body.error).toMatch(/100 lignes maximum/);
  });

  it("refuse un envoi vide, un mode inconnu ou un format incorrect", async () => {
    const agent = await admin();
    brancherBase();
    expect((await importer(agent).send({ mode: "publier", lignes: [] })).status).toBe(400);
    expect((await importer(agent).send({ mode: "tout-casser", lignes: [ligne("A")] })).status).toBe(400);
    expect((await importer(agent).send({ mode: "publier", lignes: ["pas un objet"] })).status).toBe(400);
    expect((await importer(agent).send({ mode: "publier" })).status).toBe(400);
  });

  it("lance la récupération des images après coup, pour les seules lignes ajoutées sans image", async () => {
    const agent = await admin();
    brancherBase();
    await importer(agent).send({
      mode: "publier",
      lignes: [ligne("Sans image"), ligne("Avec image", { imageUrl: "https://cdn.example/a.jpg" }), ligne("Invalide", { type: "?" })],
    });
    expect(enrichir).toHaveBeenCalledTimes(1);
    const [, elements] = enrichir.mock.calls[0];
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({ lienSource: expect.stringContaining("Sans%20image") });
  });

  it("un échec de la récupération d'images ne fait pas échouer l'import", async () => {
    const agent = await admin();
    brancherBase();
    enrichir.mockRejectedValueOnce(new Error("réseau"));
    const res = await importer(agent).send({ mode: "publier", lignes: [ligne("A")] });
    expect(res.status).toBe(201);
  });
});

describe("enrichirImages", () => {
  const page = (img) => ({ url: "https://org.example/p", status: 200, html: `<meta property="og:image" content="${img}">` });

  it("enregistre l'image d'aperçu trouvée sur la page, sans écraser une image existante", async () => {
    const db = { query: vi.fn(async () => [{ affectedRows: 1 }, []]) };
    await enrichirImages(db, [{ id: 7, lienSource: "https://org.example/p" }], { lire: async () => page("/hero.jpg") });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/image_url IS NULL/);
    expect(params).toEqual(["https://org.example/hero.jpg", 7]);
  });

  it("ignore les pages en erreur, illisibles ou sans image, et continue avec les suivantes", async () => {
    const db = { query: vi.fn(async () => [{ affectedRows: 1 }, []]) };
    const lire = vi.fn(async (url) => {
      if (url.includes("panne")) throw new Error("Adresse interne refusée.");
      if (url.includes("404")) return { url, status: 404, html: "x" };
      if (url.includes("vide")) return { url, status: 200, html: "<html></html>" };
      return page("https://cdn.example/ok.jpg");
    });
    await enrichirImages(db, [
      { id: 1, lienSource: "https://a.example/panne" },
      { id: 2, lienSource: "https://a.example/404" },
      { id: 3, lienSource: "https://a.example/vide" },
      { id: 4, lienSource: "https://a.example/bien" },
    ], { lire });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(["https://cdn.example/ok.jpg", 4]);
  });

  it("limite le nombre de sites lus en même temps", async () => {
    let actifs = 0, maxActifs = 0;
    const lire = async () => {
      actifs++; maxActifs = Math.max(maxActifs, actifs);
      await new Promise((r) => setTimeout(r, 15));
      actifs--;
      return { url: "https://x.example", status: 404, html: "" };
    };
    await enrichirImages({ query: vi.fn() }, Array.from({ length: 12 }, (_, i) => ({ id: i, lienSource: "https://x.example/" + i })), { lire, concurrence: 3 });
    expect(maxActifs).toBeLessThanOrEqual(3);
  });
});

describe("normaliserTitre", () => {
  it("ignore la casse, les accents et les espaces multiples", () => {
    expect(normaliserTitre("  Bourse   d'Éducation ")).toBe(normaliserTitre("bourse d'education"));
  });
});
