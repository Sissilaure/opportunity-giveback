import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Repertoire from "./Repertoire";
import * as api from "../lib/api";

vi.mock("../lib/api");
vi.mock("../components/RechercheIA", () => ({ default: () => null }));

const opp = (id, titre) => ({
  id, titre, type: "bourse", organisme: "Org", criteres: [], piecesRequises: [],
  dateVerification: "2026-01-01", statutEcheance: "ouverte", joursRestants: 30,
});

function rendre() {
  return render(
    <MemoryRouter initialEntries={["/opportunites"]}>
      <Repertoire />
    </MemoryRouter>
  );
}

beforeEach(() => vi.resetAllMocks());

describe("Repertoire", () => {
  it("affiche les opportunités reçues", async () => {
    api.fetchOpportunites.mockResolvedValue({ opportunites: [opp(1, "Bourse A")] });
    rendre();
    expect(await screen.findByText("Bourse A")).toBeInTheDocument();
  });

  it("propose de réessayer après une erreur réseau, puis affiche les résultats", async () => {
    api.fetchOpportunites.mockRejectedValueOnce(new Error("réseau")).mockResolvedValueOnce({ opportunites: [opp(2, "Bourse B")] });
    rendre();
    const bouton = await screen.findByRole("button", { name: "Réessayer" });
    fireEvent.click(bouton);
    expect(await screen.findByText("Bourse B")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ignore une réponse lente arrivée après une recherche plus récente", async () => {
    let finLente;
    api.fetchOpportunites
      .mockImplementationOnce(() => new Promise((r) => (finLente = r))) // chargement initial, lent
      .mockResolvedValueOnce({ opportunites: [opp(3, "Résultat récent")] });
    rendre();
    await waitFor(() => expect(api.fetchOpportunites).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Rechercher une opportunité"), { target: { value: "stage" } });
    expect(await screen.findByText("Résultat récent")).toBeInTheDocument();
    finLente({ opportunites: [opp(4, "Résultat périmé")] });
    await waitFor(() => expect(screen.queryByText("Résultat périmé")).toBeNull());
    expect(screen.getByText("Résultat récent")).toBeInTheDocument();
  });

  it("affiche un état vide avec réinitialisation quand rien ne correspond", async () => {
    api.fetchOpportunites.mockResolvedValue({ opportunites: [] });
    rendre();
    fireEvent.change(screen.getByLabelText("Rechercher une opportunité"), { target: { value: "zzz" } });
    expect(await screen.findByText("Aucune opportunité ne correspond")).toBeInTheDocument();
    api.fetchOpportunites.mockResolvedValue({ opportunites: [opp(9, "Retour")] });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }));
    expect(await screen.findByText("Retour")).toBeInTheDocument();
  });
});
