import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import createApp from "../app";

// `pool` est un objet factice injecté directement dans l'app : aucun accès réseau,
// aucune vraie base MySQL nécessaire pour vérifier le contrat HTTP de l'API.
const pool = { query: vi.fn() };
const app = createApp({ pool });

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/health", () => {
  it("répond ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/opportunites", () => {
  it("rejette un type inconnu avant toute requête SQL", async () => {
    const res = await request(app).get("/api/opportunites?type=inexistant");
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("gère des critères/pièces requises NULL sans planter", async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            titre: "Bourse test",
            type: "bourse",
            organisme: "Organisme test",
            site_web: "https://exemple.org",
            public_eligible: "Tous",
            criteres: null,
            pieces_requises: null,
            date_echeance: null,
            lien_source: "https://exemple.org/source",
            date_verification: "2026-01-01",
          },
        ],
        [],
      ]);

    const res = await request(app).get("/api/opportunites");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.opportunites[0].criteres).toEqual([]);
    expect(res.body.opportunites[0].piecesRequises).toEqual([]);
  });
});

describe("GET /api/opportunites/:id", () => {
  it("renvoie 404 quand l'opportunité n'existe pas", async () => {
    pool.query.mockResolvedValueOnce([[], []]);
    const res = await request(app).get("/api/opportunites/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe("POST /api/questions", () => {
  it("refuse une question vide", async () => {
    const res = await request(app).post("/api/questions").send({ texte: "  " });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/login", () => {
  it("refuse un corps de requête incomplet", async () => {
    const res = await request(app).post("/api/admin/login").send({});
    expect(res.status).toBe(400);
  });

  it("refuse un identifiant inconnu sans révéler l'existence du compte", async () => {
    pool.query.mockResolvedValueOnce([[], []]);
    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "inconnu@exemple.org", motDePasse: "quelconque" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Identifiants incorrects.");
  });
});

describe("GET /api/admin/questions", () => {
  it("exige une session admin", async () => {
    const res = await request(app).get("/api/admin/questions");
    expect(res.status).toBe(401);
  });
});

describe("Route inconnue", () => {
  it("renvoie 404 avec la clé error", async () => {
    const res = await request(app).get("/api/route-qui-nexiste-pas");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Route introuvable." });
  });
});

describe("POST /api/recherche-ia", () => {
  const cleApiOriginale = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = cleApiOriginale;
    vi.unstubAllGlobals();
  });

  it("refuse une description trop courte", async () => {
    const res = await request(app).post("/api/recherche-ia").send({ description: "hi" });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("renvoie 503 si aucune clé Gemini n'est configurée", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app)
      .post("/api/recherche-ia")
      .send({ description: "Étudiant en Master, boursier potentiel." });
    expect(res.status).toBe(503);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("classe les opportunités renvoyées par Gemini et ignore les id inconnus", async () => {
    process.env.GEMINI_API_KEY = "cle-de-test";
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          titre: "Bourse test",
          type: "bourse",
          organisme: "Organisme test",
          site_web: "https://exemple.org",
          public_eligible: "Tous",
          criteres: "Critère A",
          pieces_requises: "CV",
          date_echeance: null,
          lien_source: "https://exemple.org/source",
          date_verification: "2026-01-01",
        },
      ],
      [],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      resultats: [
                        { id: 1, raison: "Correspond au profil décrit." },
                        { id: 999, raison: "Ignoré : id inexistant." },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const res = await request(app)
      .post("/api/recherche-ia")
      .send({ description: "Étudiant en Master, boursier potentiel." });

    expect(res.status).toBe(200);
    expect(res.body.resultats).toHaveLength(1);
    expect(res.body.resultats[0]).toMatchObject({ id: 1, raisonIA: "Correspond au profil décrit." });
  });

  it("renvoie 502 si l'appel Gemini échoue", async () => {
    process.env.GEMINI_API_KEY = "cle-de-test";
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          titre: "Bourse test",
          type: "bourse",
          organisme: "Organisme test",
          site_web: "https://exemple.org",
          public_eligible: "Tous",
          criteres: "Critère A",
          pieces_requises: "CV",
          date_echeance: null,
          lien_source: "https://exemple.org/source",
          date_verification: "2026-01-01",
        },
      ],
      [],
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "erreur" }));

    const res = await request(app).post("/api/recherche-ia").send({ description: "Profil quelconque décrit." });
    expect(res.status).toBe(502);
  });
});

describe("Admin - opportunités", () => {
  const cleApiOriginale = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = cleApiOriginale;
  });

  async function connexionAdmin() {
    const agent = request.agent(app);
    const hash = await bcrypt.hash("motdepasse", 10);
    pool.query.mockResolvedValueOnce([[{ id: 1, email: "admin@test.org", password_hash: hash }], []]);
    await agent.post("/api/admin/login").send({ email: "admin@test.org", motDePasse: "motdepasse" });
    return agent;
  }

  it("exige une session admin pour lister", async () => {
    const res = await request(app).get("/api/admin/opportunites");
    expect(res.status).toBe(401);
  });

  it("crée une opportunité et la publie immédiatement (statut verifiee)", async () => {
    const agent = await connexionAdmin();
    pool.query.mockResolvedValueOnce([[{ id_structure: 5 }], []]); // organisme déjà connu
    pool.query.mockResolvedValueOnce([{ insertId: 42 }, []]); // insertion de l'opportunité

    const res = await agent.post("/api/admin/opportunites").send({
      titre: "Nouvelle opportunité",
      type: "bourse",
      organisme: "Organisme Test",
      siteWeb: "https://exemple.org",
      publicEligible: "Tous",
      criteres: "Critère A",
      piecesRequises: "CV",
      dateEcheance: "",
      lienSource: "https://exemple.org/candidature",
    });
    expect(res.status).toBe(201);
  });

  it("refuse une opportunité avec une URL source invalide", async () => {
    const agent = await connexionAdmin();
    const res = await agent.post("/api/admin/opportunites").send({
      titre: "Nouvelle opportunité",
      type: "bourse",
      organisme: "Organisme Test",
      lienSource: "pas-une-url",
    });
    expect(res.status).toBe(400);
  });

  it("approuve une opportunité en attente de vérification", async () => {
    const agent = await connexionAdmin();
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    const res = await agent.post("/api/admin/opportunites/99/approuver");
    expect(res.status).toBe(200);
  });

  it("renvoie 404 en approuvant une opportunité inexistante", async () => {
    const agent = await connexionAdmin();
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    const res = await agent.post("/api/admin/opportunites/999/approuver");
    expect(res.status).toBe(404);
  });

  it("supprime une opportunité", async () => {
    const agent = await connexionAdmin();
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    const res = await agent.delete("/api/admin/opportunites/99");
    expect(res.status).toBe(200);
  });

  it("la recherche IA renvoie 503 sans clé Gemini configurée", async () => {
    const agent = await connexionAdmin();
    delete process.env.GEMINI_API_KEY;
    const res = await agent.post("/api/admin/opportunites/rechercher-ia");
    expect(res.status).toBe(503);
  });
});

describe("GET /api/stats", () => {
  it("renvoie les totaux réels des opportunités publiées", async () => {
    pool.query
      .mockResolvedValueOnce([[{ type: "bourse", total: 4 }, { type: "stage", total: 2 }], []])
      .mockResolvedValueOnce([[{ organismes: 5 }], []]);
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 6, organismes: 5, parType: { bourse: 4, stage: 2 } });
  });
});

describe("Contenu éditorial", () => {
  it("renvoie l'équipe", async () => {
    const res = await request(app).get("/api/equipe");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("nom");
  });

  it("renvoie les témoignages", async () => {
    const res = await request(app).get("/api/temoignages");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("texte");
  });
});

describe("POST /api/newsletter", () => {
  it("rejette une adresse invalide avant toute requête SQL", async () => {
    const res = await request(app).post("/api/newsletter").send({ email: "pas-un-email" });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("enregistre l'inscription, fréquence hebdomadaire par défaut", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    const res = await request(app).post("/api/newsletter").send({ email: " Test@Exemple.org " });
    expect(res.status).toBe(201);
    expect(pool.query.mock.calls[0][1]).toEqual(["test@exemple.org", "hebdomadaire"]);
  });
});
