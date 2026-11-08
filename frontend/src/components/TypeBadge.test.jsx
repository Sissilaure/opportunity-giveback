import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TypeBadge from "./TypeBadge";

describe("TypeBadge", () => {
  it("affiche le libellé connu pour un type standard", () => {
    render(<TypeBadge type="bourse" />);
    expect(screen.getByText("BOURSE")).toBeInTheDocument();
  });

  it("retombe sur le type en majuscules si le libellé n'est pas connu", () => {
    render(<TypeBadge type="mystere" />);
    expect(screen.getByText("MYSTERE")).toBeInTheDocument();
  });

  it("ne plante pas si le type est absent", () => {
    const { container } = render(<TypeBadge type={undefined} />);
    expect(container.textContent).toBe("");
  });
});
