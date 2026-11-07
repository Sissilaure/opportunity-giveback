import { describe, it, expect, afterAll, beforeAll } from "vitest";
import http from "node:http";
import { lireHtml, estIpPrivee } from "../safeFetch";
import { verifierSource, extraireImage } from "../verification";

describe("estIpPrivee", () => {
  it("reconnaît les adresses internes à ne jamais contacter", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(estIpPrivee(ip), ip).toBe(true);
    }
  });
  it("laisse passer les adresses publiques", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"]) {
      expect(estIpPrivee(ip), ip).toBe(false);
    }
  });
});

describe("lireHtml : protection SSRF", () => {
  it.each([
    ["http://127.0.0.1/", /interne/],
    ["http://localhost/", /interne/],
    ["http://169.254.169.254/latest/meta-data/", /interne/],
    ["http://[::1]/", /interne/],
    ["http://10.0.0.5/", /interne/],
    ["ftp://exemple.org/", /Schéma/],
    ["file:///etc/passwd", /Schéma/],
    ["http://exemple.org:8080/", /Port/],
    ["http://user:mdp@exemple.org/", /Identifiants/],
  ])("refuse %s", async (url, motif) => {
    await expect(lireHtml(url)).rejects.toThrow(motif);
  });
});

describe("lireHtml : comportement (serveur local, mode test)", () => {
  let serveur;
  let base;
  beforeAll(async () => {
    serveur = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.end("<html><title>Chevening</title><body>Bourse Chevening</body></html>");
      }
      if (req.url === "/redir") {
        res.statusCode = 302;
        res.setHeader("Location", "/ok");
        return res.end();
      }
      if (req.url === "/boucle") {
        res.statusCode = 302;
        res.setHeader("Location", "/boucle");
        return res.end();
      }
      if (req.url === "/gros") {
        res.setHeader("Content-Type", "text/html");
        return res.end("x".repeat(2_000_000));
      }
      if (req.url === "/pdf") {
        res.setHeader("Content-Type", "application/pdf");
        return res.end("%PDF");
      }
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html");
      res.end("introuvable");
    });
    await new Promise((r) => serveur.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${serveur.address().port}`;
  });
  afterAll(() => serveur.close());

  const opts = { autoriserPrive: true };
  it("lit une page HTML", async () => {
    const r = await lireHtml(`${base}/ok`, opts);
    expect(r.status).toBe(200);
    expect(r.html).toContain("Chevening");
  });
  it("suit une redirection", async () => {
    expect((await lireHtml(`${base}/redir`, opts)).url).toBe(`${base}/ok`);
  });
  it("s'arrête sur une boucle de redirections", async () => {
    await expect(lireHtml(`${base}/boucle`, opts)).rejects.toThrow(/redirections/);
  });
  it("tronque une réponse énorme au lieu de saturer la mémoire", async () => {
    const r = await lireHtml(`${base}/gros`, { ...opts, maxOctets: 50_000 });
    expect(r.html.length).toBeLessThanOrEqual(50_000);
  });
  it("ignore un contenu qui n'est pas du HTML", async () => {
    expect((await lireHtml(`${base}/pdf`, opts)).html).toBe("");
  });
  it("remonte le code 404", async () => {
    expect((await lireHtml(`${base}/absent`, opts)).status).toBe(404);
  });
});

const page = (extra = "") => ({
  url: "https://www.chevening.org/scholarships/",
  status: 200,
  html: `<html><head><title>Chevening Scholarships | UK government</title>${extra}</head><body><h1>Chevening</h1><p>Government of the United Kingdom scholarships</p></body></html>`,
});
const candidat = { titre: "Chevening Scholarships", organisme: "Gouvernement britannique", lienSource: "https://www.chevening.org/scholarships/", siteWeb: "https://www.chevening.org" };

describe("verifierSource", () => {
  it("valide une page cohérente et récupère l'image d'aperçu (URL relative résolue)", async () => {
    const r = await verifierSource(candidat, { lire: async () => page('<meta property="og:image" content="/img/hero.jpg">') });
    expect(r.verifiee).toBe(true);
    expect(r.imageUrl).toBe("https://www.chevening.org/img/hero.jpg");
  });

  it("n'accepte jamais une image http, data: ou javascript:", () => {
    expect(extraireImage('<meta property="og:image" content="http://x.org/a.jpg">', "https://x.org/")).toBeNull();
    expect(extraireImage('<meta property="og:image" content="data:image/png;base64,AAA">', "https://x.org/")).toBeNull();
    expect(extraireImage('<meta property="og:image" content="javascript:alert(1)">', "https://x.org/")).toBeNull();
    expect(extraireImage("<html></html>", "https://x.org/")).toBeNull();
  });

  it("refuse si la page est introuvable ou illisible", async () => {
    expect((await verifierSource(candidat, { lire: async () => ({ ...page(), status: 404 }) })).verifiee).toBe(false);
    expect((await verifierSource(candidat, { lire: async () => { throw new Error("Adresse interne refusée."); } })).verifiee).toBe(false);
    expect((await verifierSource(candidat, { lire: async () => ({ ...page(), html: "" }) })).verifiee).toBe(false);
  });

  it("refuse si la page ne parle pas du programme (programme inventé sur un vrai site)", async () => {
    const r = await verifierSource({ ...candidat, titre: "Bourse Excellence Zorglub" }, { lire: async () => page() });
    expect(r.verifiee).toBe(false);
    expect(r.raison).toMatch(/programme/);
  });

  it("refuse si l'organisme n'apparaît pas (lien vers un site sans rapport)", async () => {
    const autre = { url: "https://blog-quelconque.com/", status: 200, html: "<html><title>Recettes</title><body>Gâteau au chocolat</body></html>" };
    const r = await verifierSource({ ...candidat, organisme: "Fondation Tony Elumelu", titre: "Prix innovation" }, { lire: async () => autre });
    expect(r.verifiee).toBe(false);
  });
});
