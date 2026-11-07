import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import OpportuniteImage from "./OpportuniteImage";

const base = { id: 1, type: "bourse" };

describe("OpportuniteImage", () => {
  it("affiche l'image de l'organisme quand elle existe, sans révéler la page d'origine", () => {
    const { container } = render(<OpportuniteImage opportunite={{ ...base, imageUrl: "https://org.example/a.jpg" }} />);
    const img = container.querySelector("img");
    expect(img.getAttribute("src")).toBe("https://org.example/a.jpg");
    expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("retombe sur la photo de la catégorie si l'image de l'organisme ne charge pas", () => {
    const { container } = render(<OpportuniteImage opportunite={{ ...base, imageUrl: "https://org.example/cassee.jpg" }} />);
    fireEvent.error(container.querySelector("img"));
    expect(container.querySelector("img").getAttribute("src")).toMatch(/^\/images\/.+\.jpg$/);
  });

  it("utilise la photo de la catégorie quand aucune image n'est fournie", () => {
    const { container } = render(<OpportuniteImage opportunite={{ ...base, imageUrl: null }} />);
    expect(container.querySelector("img").getAttribute("src")).toMatch(/^\/images\/.+\.jpg$/);
  });
});
