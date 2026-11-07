import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifiedBadge from "./VerifiedBadge";

describe("VerifiedBadge", () => {
  it("indique « Vérifié » pour une relecture humaine", () => {
    render(<VerifiedBadge date="2026-03-15" />);
    expect(screen.getByText(/^Vérifié le/)).toBeInTheDocument();
  });
  it("dit clairement quand la vérification est automatique (pas de fausse promesse de relecture)", () => {
    render(<VerifiedBadge date="2026-03-15" auto />);
    expect(screen.getByText(/Source officielle vérifiée le/)).toBeInTheDocument();
    expect(screen.queryByText(/^Vérifié le/)).toBeNull();
  });
});
