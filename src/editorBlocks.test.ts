import { describe, expect, it } from "vitest";
import { createEmptyTableHtml, slashReplacement } from "./editorBlocks";

describe("slash block insertion", () => {
  it("creates empty text blocks without demo placeholder content", () => {
    expect(slashReplacement("h1")).not.toContain("Titel");
    expect(slashReplacement("h2")).not.toContain("Überschrift");
    expect(slashReplacement("bullet")).not.toContain("Erster Punkt");
    expect(slashReplacement("number")).not.toContain("Zweiter Punkt");
    expect(slashReplacement("check")).not.toContain("Aufgabe");
    expect(slashReplacement("quote")).not.toContain("Zitat");
    expect(slashReplacement("code")).not.toContain("Code oder Befehl");
    expect(slashReplacement("info")).not.toContain("Wichtige Information");
    expect(slashReplacement("columns")).not.toContain("Linke Spalte");
  });

  it("creates exactly the requested empty table dimensions", () => {
    const html = createEmptyTableHtml(3, 4);
    expect((html.match(/<tr>/g) ?? []).length).toBe(3);
    expect((html.match(/<td>/g) ?? []).length).toBe(12);
    expect((html.match(/<col style=/g) ?? []).length).toBe(4);
    expect(html).toContain('data-rows="3"');
    expect(html).toContain('data-columns="4"');
  });

  it("clamps table dimensions to a safe range", () => {
    const html = createEmptyTableHtml(99, 99);
    expect((html.match(/<tr>/g) ?? []).length).toBe(12);
    expect((html.match(/<td>/g) ?? []).length).toBe(144);
  });
});
