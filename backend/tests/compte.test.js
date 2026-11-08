import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { hashMotDePasse } from "../motDePasse";
import createApp from "../app";
import { construireNotifications } from "../compteRoutes";

const pool = { query: vi.fn() };
let n = 0;
// Chaque test utilise sa propre application et une adresse IP distincte : les limiteurs de débit sont par instance/IP.
const nouvelleApp = () => createApp({ pool });
const ip = () => `10.20.30.${++n}`;
const HASH = await hashMotDePasse("une-phrase-de-passe-solide");

beforeEach(() => pool.query.mockReset());

async function connecter(app, adresse = ip()) {
  // Email unique par appel : le verrou par compte est partagé entre les tests (état du module).
  const email = `u${++n}@b.org`;
  pool.query.mockResolvedValueOnce([[{ id: 7, email, prenom: "Awa", password_hash: HASH }], []]);
  const agent = request.agent(app);
  const res = await agent.post("/api/compte/connexion").set("X-Forwarded-For", adresse).send({ email, motDePasse: "une-phrase-de-passe-solide" });
  expect(res.status).toBe(200);
  pool.query.mockReset();
  return agent;
}

describe("POST /api/compte/inscription", () => {
  it("crée un compte, ouvre la session et ne renvoie jamais le hash", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 12 }, []]);
    const res = await request(nouvelleApp()).post("/api/compte/inscription").set("X-Forwarded-For", ip())
      .send({ email: "  Awa@Exemple.ORG ", motDePasse: "une-phrase-de-passe-solide", prenom: "Awa" });
    expect(res.status).toBe(201);
    expect(res.body.utilisateur).toEqual({ id: 12, email: "awa@exemple.org", prenom: "Awa" });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|\$2/);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO utilisateur/);
    expect(params[0]).toBe("awa@exemple.org");
    expect(params[1]).toMatch(/^scrypt\$16384\$8\$5\$/); // scrypt, jamais le mot de passe en clair
    expect(params[1]).not.toContain("solide");
  });

  it("refuse un mot de passe trop court, trop faible, ou identique à l'email", async () => {
    const app = nouvelleApp();
    for (const motDePasse of ["court", "1234567", "12345678", "azerty123", "Password1", "aaaaaaaaaaaa", "motdepasse"]) {
      const res = await request(app).post("/api/compte/inscription").set("X-Forwarded-For", ip()).send({ email: "a@b.org", motDePasse });
      expect(res.status, motDePasse).toBe(400);
    }
    const memeQueEmail = await request(app).post("/api/compte/inscription").set("X-Forwarded-For", ip()).send({ email: "longueadresse@b.org", motDePasse: "longueadresse@b.org" });
    expect(memeQueEmail.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("refuse un email invalide avec un message en français", async () => {
    const res = await request(nouvelleApp()).post("/api/compte/inscription").set("X-Forwarded-For", ip()).send({ email: "pasunemail", motDePasse: "une-phrase-de-passe-solide" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Adresse email invalide.");
  });

  it("répond 409 si le compte existe déjà", async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY", errno: 1062 }));
    const res = await request(nouvelleApp()).post("/api/compte/inscription").set("X-Forwarded-For", ip()).send({ email: "a@b.org", motDePasse: "une-phrase-de-passe-solide" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/existe déjà/);
  });

  it("limite les créations de compte par adresse IP (40 par heure : un campus partage une adresse)", async () => {
    const app = nouvelleApp();
    const adresse = ip();
    const statuts = [];
    for (let i = 0; i < 41; i++) {
      // Mot de passe trop court : refusé avant toute écriture, mais chaque tentative compte dans la limite.
      const r = await request(app).post("/api/compte/inscription").set("X-Forwarded-For", adresse).send({ email: `u${i}@b.org`, motDePasse: "court" });
      statuts.push(r.status);
    }
    expect(statuts.slice(0, 40).every((s) => s === 400)).toBe(true);
    expect(statuts[40]).toBe(429);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("POST /api/compte/connexion", () => {
  it("connecte avec les bons identifiants et pose un cookie de session httpOnly", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 7, email: "a@b.org", prenom: "Awa", password_hash: HASH }], []]);
    const res = await request(nouvelleApp()).post("/api/compte/connexion").set("X-Forwarded-For", ip()).send({ email: "A@B.org", motDePasse: "une-phrase-de-passe-solide" });
    expect(res.status).toBe(200);
    expect(res.body.utilisateur.email).toBe("a@b.org");
    expect(res.headers["set-cookie"].join(";")).toMatch(/HttpOnly/i);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("donne le même message pour un mauvais mot de passe et un compte inconnu (pas de fuite)", async () => {
    const app = nouvelleApp();
    pool.query.mockResolvedValueOnce([[{ id: 7, email: "a@b.org", password_hash: HASH }], []]);
    const mauvais = await request(app).post("/api/compte/connexion").set("X-Forwarded-For", ip()).send({ email: "a@b.org", motDePasse: "mauvais-mot-de-passe" });
    pool.query.mockResolvedValueOnce([[], []]);
    const inconnu = await request(app).post("/api/compte/connexion").set("X-Forwarded-For", ip()).send({ email: "zz@b.org", motDePasse: "mauvais-mot-de-passe" });
    expect(mauvais.status).toBe(401);
    expect(inconnu.status).toBe(401);
    expect(mauvais.body.error).toBe(inconnu.body.error);
  });

  it("verrouille un compte ciblé même si l'attaquant change d'adresse IP", async () => {
    const app = nouvelleApp();
    pool.query.mockResolvedValue([[], []]);
    let dernier;
    for (let i = 0; i < 9; i++) {
      dernier = await request(app).post("/api/compte/connexion").set("X-Forwarded-For", ip()).send({ email: "cible@b.org", motDePasse: "essai-numero-" + i });
    }
    expect(dernier.status).toBe(429);
    expect(dernier.body.error).toMatch(/ce compte/);
  });
});

describe("accès protégé", () => {
  it("refuse sans connexion", async () => {
    const app = nouvelleApp();
    for (const [methode, url] of [["get", "/api/compte/suivi"], ["get", "/api/compte/notifications"], ["put", "/api/compte/suivi/3"], ["delete", "/api/compte/suivi/3"], ["post", "/api/compte/suivi/importer"], ["delete", "/api/compte/moi"]]) {
      const res = await request(app)[methode](url).send({});
      expect(res.status, `${methode} ${url}`).toBe(401);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("GET /moi renvoie null sans session, sans erreur", async () => {
    const res = await request(nouvelleApp()).get("/api/compte/moi");
    expect(res.status).toBe(200);
    expect(res.body.utilisateur).toBeNull();
  });

  it("une session d'utilisateur ne donne pas accès à l'espace équipe", async () => {
    const app = nouvelleApp();
    const agent = await connecter(app);
    const res = await agent.get("/api/admin/questions");
    expect(res.status).toBe(401);
  });

  it("refuse une écriture venant d'un autre site (CSRF)", async () => {
    const app = nouvelleApp();
    const agent = await connecter(app);
    const res = await agent.put("/api/compte/suivi/3").set("Origin", "https://site-pirate.example").send({ statut: "en_cours" });
    expect(res.status).toBe(403);
  });
});

describe("suivi de candidatures", () => {
  it("n'agit que sur les données de l'utilisateur connecté (id pris dans la session, jamais dans la requête)", async () => {
    const app = nouvelleApp();
    const agent = await connecter(app);
    pool.query
      .mockResolvedValueOnce([[{ id: 3 }], []]) // l'opportunité existe
      .mockResolvedValueOnce([[{ total: 0 }], []]) // nombre de suivis
      .mockResolvedValueOnce([[], []]) // pas encore suivi
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    const res = await agent.put("/api/compte/suivi/3").send({ statut: "en_cours", id_utilisateur: 999 });
    expect(res.status).toBe(200);
    const ecriture = pool.query.mock.calls.at(-1);
    expect(ecriture[1][0]).toBe(7);
    expect(ecriture[1]).not.toContain(999);
  });

  it("refuse un statut inconnu, une note trop longue, un identifiant invalide, une mise à jour vide", async () => {
    const app = nouvelleApp();
    const agent = await connecter(app);
    expect((await agent.put("/api/compte/suivi/3").send({ statut: "gagne" })).status).toBe(400);
    expect((await agent.put("/api/compte/suivi/3").send({ note: "x".repeat(501) })).status).toBe(400);
    expect((await agent.put("/api/compte/suivi/abc").send({ statut: "a_faire" })).status).toBe(400);
    expect((await agent.put("/api/compte/suivi/3").send({})).status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("répond 404 pour une opportunité inexistante ou non publiée", async () => {
    const agent = await connecter(nouvelleApp());
    pool.query.mockResolvedValueOnce([[], []]);
    expect((await agent.put("/api/compte/suivi/999").send({ statut: "a_faire" })).status).toBe(404);
  });

  it("plafonne le nombre d'opportunités suivies", async () => {
    const agent = await connecter(nouvelleApp());
    pool.query.mockResolvedValueOnce([[{ id: 3 }], []]).mockResolvedValueOnce([[{ total: 200 }], []]).mockResolvedValueOnce([[], []]);
    const res = await agent.put("/api/compte/suivi/3").send({ statut: "a_faire" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/200/);
  });

  it("liste le suivi avec le statut de candidature et l'image de l'organisme", async () => {
    const agent = await connecter(nouvelleApp());
    pool.query.mockResolvedValueOnce([[{
      id: 3, titre: "Bourse X", type: "bourse", organisme: "Org", site_web: null, public_eligible: "", criteres: "", pieces_requises: "",
      date_echeance: null, lien_source: "https://org.example", date_verification: new Date(), statut: "verifiee",
      image_url: "https://org.example/a.jpg", verification_auto: 1, suivi_statut: "soumise", suivi_note: "envoyé le 3", suivi_maj: new Date(),
    }], []]);
    const res = await agent.get("/api/compte/suivi");
    expect(res.status).toBe(200);
    expect(res.body.suivis[0]).toMatchObject({ id: 3, suiviStatut: "soumise", note: "envoyé le 3", imageUrl: "https://org.example/a.jpg", verificationAuto: true });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/WHERE c\.id_utilisateur = \?/);
    expect(params).toEqual([7]);
  });

  it("importe le suivi local en ignorant les identifiants inexistants et en dédoublonnant", async () => {
    const agent = await connecter(nouvelleApp());
    pool.query.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }], []]).mockResolvedValue([{ affectedRows: 1 }, []]);
    const res = await agent.post("/api/compte/suivi/importer").send({ ids: [1, 2, 2, 99999] });
    expect(res.status).toBe(200);
    expect(res.body.importes).toBe(2);
    const select = pool.query.mock.calls[0];
    expect(select[1]).toEqual([1, 2, 99999]);
    expect((await agent.post("/api/compte/suivi/importer").send({ ids: ["abc"] })).status).toBe(400);
  });
});

describe("notifications dans l'application", () => {
  const maintenant = new Date("2026-11-10T10:00:00");
  const suivi = (id, jours, statut = "a_faire") => ({
    id, titre: `Opp ${id}`, suivi_statut: statut,
    date_echeance: new Date(new Date("2026-11-10T00:00:00").getTime() + jours * 86400000),
  });

  it("choisit le bon palier selon les jours restants", () => {
    const r = construireNotifications([suivi(1, 6), suivi(2, 3), suivi(3, 1), suivi(4, 0), suivi(5, -2), suivi(6, 30), suivi(7, -20)], 0, maintenant);
    expect(r.map((x) => x.cle).sort()).toEqual(["1:j7", "2:j3", "3:j1", "4:j1", "5:depassee"]);
    expect(r.find((x) => x.cle === "4:j1").message).toBe("La date limite est aujourd'hui.");
    expect(r.find((x) => x.cle === "3:j1").message).toBe("Plus que 1 jour pour candidater.");
    expect(r.find((x) => x.cle === "2:j3").niveau).toBe("urgent");
    expect(r.find((x) => x.cle === "1:j7").niveau).toBe("info");
  });

  it("ne rappelle pas une candidature déjà envoyée, acceptée ou refusée", () => {
    const r = construireNotifications([suivi(1, 2, "soumise"), suivi(2, 2, "acceptee"), suivi(3, 2, "refusee"), suivi(4, 2, "en_cours")], 0, maintenant);
    expect(r.map((x) => x.cle)).toEqual(["4:j3"]);
  });

  it("annonce les nouveautés une fois par semaine", () => {
    expect(construireNotifications([], 3, maintenant)[0].message).toBe("3 opportunités ont été ajoutées cette semaine.");
    expect(construireNotifications([], 1, maintenant)[0].message).toBe("1 opportunité a été ajoutée cette semaine.");
    expect(construireNotifications([], 0, maintenant)).toEqual([]);
  });

  it("renvoie les notifications avec leur état lu / non lu et le compteur", async () => {
    const agent = await connecter(nouvelleApp());
    const demain = new Date(Date.now() + 86400000);
    pool.query
      .mockResolvedValueOnce([[{ id: 5, titre: "Bourse Y", date_echeance: demain, suivi_statut: "a_faire" }], []])
      .mockResolvedValueOnce([[{ n: 0 }], []])
      .mockResolvedValueOnce([[], []]);
    const res = await agent.get("/api/compte/notifications");
    expect(res.status).toBe(200);
    expect(res.body.nonLues).toBe(1);
    expect(res.body.notifications[0]).toMatchObject({ type: "echeance", titre: "Bourse Y", lue: false, idOpportunite: 5 });

    pool.query
      .mockResolvedValueOnce([[{ id: 5, titre: "Bourse Y", date_echeance: demain, suivi_statut: "a_faire" }], []])
      .mockResolvedValueOnce([[{ n: 0 }], []])
      .mockResolvedValueOnce([[{ cle: res.body.notifications[0].cle }], []]);
    const apres = await agent.get("/api/compte/notifications");
    expect(apres.body.nonLues).toBe(0);
  });

  it("marque des notifications comme lues pour l'utilisateur connecté uniquement", async () => {
    const agent = await connecter(nouvelleApp());
    pool.query.mockResolvedValue([{ affectedRows: 1 }, []]);
    const res = await agent.post("/api/compte/notifications/lues").send({ cles: ["5:j3", "5:j3", "nouv:99"] });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls.every(([, p]) => p[0] === 7)).toBe(true);
    expect((await agent.post("/api/compte/notifications/lues").send({ cles: ["x".repeat(81)] })).status).toBe(400);
  });
});

describe("suppression du compte", () => {
  it("exige le bon mot de passe puis efface toutes les données de l'utilisateur", async () => {
    const agent = await connecter(nouvelleApp());
    pool.query.mockResolvedValueOnce([[{ password_hash: HASH }], []]);
    const refus = await agent.delete("/api/compte/moi").send({ motDePasse: "mauvais-mot-de-passe" });
    expect(refus.status).toBe(401);

    pool.query.mockReset();
    pool.query.mockResolvedValueOnce([[{ password_hash: HASH }], []]).mockResolvedValue([{ affectedRows: 1 }, []]);
    const ok = await agent.delete("/api/compte/moi").send({ motDePasse: "une-phrase-de-passe-solide" });
    expect(ok.status).toBe(200);
    const sqls = pool.query.mock.calls.map(([s]) => s);
    expect(sqls.some((s) => /DELETE FROM suivi_candidature/.test(s))).toBe(true);
    expect(sqls.some((s) => /DELETE FROM notification_lue/.test(s))).toBe(true);
    expect(sqls.some((s) => /DELETE FROM utilisateur/.test(s))).toBe(true);
    const apres = await agent.get("/api/compte/suivi");
    expect(apres.status).toBe(401); // session détruite
  });

  it("accepte exactement 8 caractères quand le mot de passe n'est pas courant", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 31 }, []]);
    const res = await request(nouvelleApp()).post("/api/compte/inscription").set("X-Forwarded-For", ip()).send({ email: "huit@exemple.org", motDePasse: "pluie-7x" });
    expect(res.status).toBe(201);
  });
});
