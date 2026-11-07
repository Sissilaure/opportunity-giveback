import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Connexion from "./Connexion";
import { AuthProvider } from "../context/AuthContext";
import * as api from "../lib/api";

vi.mock("../lib/api");

function rendre(url = "/connexion") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/suivi" element={<p>page suivi</p>} />
          <Route path="/opportunites/3" element={<p>fiche 3</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  api.compteMoi.mockResolvedValue({ utilisateur: null });
  api.fetchNotifications.mockResolvedValue({ notifications: [], nonLues: 0 });
});

describe("Connexion", () => {
  it("connecte puis renvoie vers la page de retour demandée", async () => {
    api.compteConnexion.mockResolvedValue({ utilisateur: { id: 1, email: "a@b.org", prenom: "" } });
    rendre("/connexion?retour=/opportunites/3");
    fireEvent.change(await screen.findByLabelText("Adresse email"), { target: { value: "a@b.org" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "une-phrase-de-passe" } });
    fireEvent.click(screen.getByRole("button", { name: "Me connecter" }));
    expect(await screen.findByText("fiche 3")).toBeInTheDocument();
    expect(api.compteConnexion).toHaveBeenCalledWith({ email: "a@b.org", motDePasse: "une-phrase-de-passe" });
  });

  it("affiche l'erreur du serveur sans quitter la page", async () => {
    api.compteConnexion.mockRejectedValue(new Error("Email ou mot de passe incorrect."));
    rendre();
    fireEvent.change(await screen.findByLabelText("Adresse email"), { target: { value: "a@b.org" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Me connecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
  });

  it("crée un compte et reprend le suivi gardé sur l'appareil", async () => {
    localStorage.setItem("yeelen_suivi", "[4,9]");
    api.compteInscription.mockResolvedValue({ utilisateur: { id: 2, email: "n@b.org", prenom: "Awa" } });
    api.importerSuiviCompte.mockResolvedValue({ importes: 2 });
    rendre("/connexion?mode=inscription");
    fireEvent.change(await screen.findByLabelText(/Adresse email/), { target: { value: "n@b.org" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "une-phrase-de-passe" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText("page suivi")).toBeInTheDocument();
    await waitFor(() => expect(api.importerSuiviCompte).toHaveBeenCalledWith([4, 9]));
  });

  it("ne redirige jamais vers un autre site", async () => {
    api.compteConnexion.mockResolvedValue({ utilisateur: { id: 1, email: "a@b.org", prenom: "" } });
    rendre("/connexion?retour=https://site-pirate.example");
    fireEvent.change(await screen.findByLabelText("Adresse email"), { target: { value: "a@b.org" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "une-phrase-de-passe" } });
    fireEvent.click(screen.getByRole("button", { name: "Me connecter" }));
    expect(await screen.findByText("page suivi")).toBeInTheDocument();
  });

  it("le champ mot de passe peut être affiché ou masqué", async () => {
    rendre();
    const champ = await screen.findByLabelText("Mot de passe");
    expect(champ).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Afficher" }));
    expect(champ).toHaveAttribute("type", "text");
  });
});
