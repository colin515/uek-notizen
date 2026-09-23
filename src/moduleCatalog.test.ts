import { describe, expect, it } from "vitest";
import { findIctModule, normalizeModuleNumber } from "./moduleCatalog";

describe("ICT module catalog", () => {
  it("recognizes common module number formats", () => {
    expect(normalizeModuleNumber("ÜK 294")).toBe("294");
    expect(normalizeModuleNumber("M295")).toBe("295");
  });

  it("resolves module 294", () => {
    expect(findIctModule("294")?.title).toContain("Frontend");
  });

  it("resolves the current module 187 title", () => {
    expect(findIctModule("187")?.title).toContain("ICT-Benutzerendgeräte");
  });

  it("covers building ICT modules", () => {
    expect(findIctModule("350", "gebaeudeautomation")?.title).toContain("GA-Komponenten");
    expect(findIctModule("390", "gebaeude-kommunikation")?.title).toContain("Multimedia-Systeme");
  });
});
