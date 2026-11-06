import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function Bombe() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("affiche les enfants quand tout va bien", () => {
    render(
      <ErrorBoundary>
        <p>contenu</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("contenu")).toBeInTheDocument();
  });

  it("remplace une erreur de rendu par un message avec une issue de secours", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bombe />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Un problème est survenu");
    expect(screen.getByRole("link", { name: /accueil/i })).toHaveAttribute("href", "/");
    vi.restoreAllMocks();
  });
});
