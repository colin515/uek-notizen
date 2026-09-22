import { describe, expect, it } from "vitest";
import { sampleNote } from "./storage";

describe("sampleNote", () => {
  it("creates a complete starter note", () => {
    const note = sampleNote();
    expect(note.id).toBeTruthy();
    expect(note.title).toContain("Willkommen");
    expect(note.course).toBe("Beispiel-ÜK");
    expect(note.content).toContain("lokal");
    expect(note.favorite).toBe(true);
  });
});
