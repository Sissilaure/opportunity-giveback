import { describe, it, expect } from "vitest";
import { renderMarkdownLite } from "./markdown";

describe("renderMarkdownLite", () => {
  it("convertit un titre ## en h2", () => {
    expect(renderMarkdownLite("## Titre")).toBe("<h2>Titre</h2>");
  });

  it("regroupe les puces consécutives dans une seule liste", () => {
    const html = renderMarkdownLite("- un\n- deux");
    expect(html).toBe("<ul><li>un</li><li>deux</li></ul>");
  });

  it("regroupe les listes numérotées", () => {
    const html = renderMarkdownLite("1. un\n2. deux");
    expect(html).toBe("<ol><li>un</li><li>deux</li></ol>");
  });

  it("rend les cases à cocher avec de vrais éléments input", () => {
    const html = renderMarkdownLite("- [x] fait\n- [ ] à faire");
    expect(html).toContain('<input type="checkbox" disabled checked');
    expect(html).toContain('<input type="checkbox" disabled>');
  });

  it("échappe le HTML avant d'appliquer le gras", () => {
    const html = renderMarkdownLite("**gras** et <script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong>gras</strong>");
  });
});
