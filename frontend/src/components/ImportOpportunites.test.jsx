import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImportOpportunites from "./ImportOpportunites";
import * as api from "../lib/api";

vi.mock("../lib/api");

const CSV = [
  "titre;type;organisme;lien_source;date_limite",
  "Bourse Alpha;bourse;Fondation A;https://a.org/x;31/12/2027",
  "Mauvaise date;bourse;Org;https://o.org;31/02/2027",
  "Stage Beta;stage;Entreprise B;https://b.org/s;",
].join("\n");

function ouvrir() {
  render(<ImportOpportunites onImporte={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Importer plusieurs opportunités" }));
}
const coller = (texte) => fireEvent.change(screen.getByLabelText("Tableau à importer"), { target: { value: texte } });

beforeEach(() => vi.resetAllMocks());

describe("ImportOpportunites", () => {
  it("affiche l'aperçu avec le nombre de lignes valides et à corriger", () => {
    ouvrir();
    coller(CSV);
    expect(screen.getByText(/3 lignes/)).toHaveTextContent("3 lignes : 2 valides, 1 à corriger");
    expect(screen.getAllByText(/Date limite invalide/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Importer 2 opportunités" })).toBeEnabled();
  });

  it("n'envoie que les lignes valides, avec le mode choisi", async () => {
    api.adminImporterOpportunites.mockResolvedValue({ ajoutees: 2, doublons: 0, invalides: 0, mode: "a_verifier", resultats: [{ ligne: 1, statut: "ajoutee" }, { ligne: 3, statut: "ajoutee" }] });
    ouvrir();
    coller(CSV);
    fireEvent.click(screen.getByLabelText(/Mettre en attente/));
    fireEvent.click(screen.getByRole("button", { name: "Importer 2 opportunités" }));
    expect(await screen.findByText(/2 opportunités ajoutées, en attente de vérification/)).toBeInTheDocument();
    const [lignes, mode] = api.adminImporterOpportunites.mock.calls[0];
    expect(mode).toBe("a_verifier");
    expect(lignes.map((l) => l.titre)).toEqual(["Bourse Alpha", "Stage Beta"]);
    expect(lignes[0]).toMatchObject({ type: "bourse", dateEcheance: "2027-12-31" });
  });

  it("explique les lignes refusées ou déjà présentes dans le compte rendu", async () => {
    api.adminImporterOpportunites.mockResolvedValue({
      ajoutees: 1, doublons: 1, invalides: 0, mode: "publier",
      resultats: [{ ligne: 1, statut: "ajoutee", titre: "Bourse Alpha" }, { ligne: 3, statut: "doublon", titre: "Stage Beta", raison: "Une opportunité avec ce titre existe déjà." }],
    });
    ouvrir();
    coller(CSV);
    fireEvent.click(screen.getByRole("button", { name: "Importer 2 opportunités" }));
    expect(await screen.findByText(/1 opportunité ajoutée et publiée/)).toBeInTheDocument();
    expect(screen.getByText(/existe déjà/)).toBeInTheDocument();
  });

  it("affiche l'erreur du serveur sans perdre le tableau collé", async () => {
    api.adminImporterOpportunites.mockRejectedValue(new Error("Trop d'imports lancés, réessayez dans quelques minutes."));
    ouvrir();
    coller(CSV);
    fireEvent.click(screen.getByRole("button", { name: "Importer 2 opportunités" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Trop d'imports");
    expect(screen.getByLabelText("Tableau à importer")).toHaveValue(CSV);
  });

  it("bloque l'import sans ligne valide et signale les colonnes manquantes", () => {
    ouvrir();
    coller("titre;organisme\nA;B");
    expect(screen.getByRole("alert")).toHaveTextContent("Type, Lien source");
    expect(screen.getByRole("button", { name: "Importer" })).toBeDisabled();
  });

  it("refuse plus de 100 lignes avec un message clair", () => {
    ouvrir();
    const lignes = Array.from({ length: 101 }, (_, i) => `Opportunité numéro ${i};bourse;Org;https://o.org/${i}`);
    coller(["titre;type;organisme;lien_source", ...lignes].join("\n"));
    expect(screen.getByRole("alert")).toHaveTextContent("100 lignes maximum par import");
    expect(screen.getByRole("button", { name: /Importer/ })).toBeDisabled();
  });

  it("lit un fichier CSV choisi par l'utilisateur", async () => {
    ouvrir();
    const fichier = new File(["titre,type,organisme,lien\nBourse Gamma,bourse,Org G,https://g.org"], "liste.csv", { type: "text/csv" });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [fichier] } });
    // Lecture de fichier asynchrone : délai large pour ne pas dépendre de la charge de la machine.
    await waitFor(() => expect(screen.getByText(/1 ligne :/)).toHaveTextContent("1 ligne : 1 valide"), { timeout: 5000 });
  });
});
