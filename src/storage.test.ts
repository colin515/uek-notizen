import { describe, expect, it } from "vitest";
import { sampleCourse, sampleNote } from "./storage";

describe("sampleNote", () => {
  it("creates a complete starter note", () => {
    const course = sampleCourse();
    const note = sampleNote(course.id);
    expect(note.id).toBeTruthy();
    expect(note.title).toContain("Willkommen");
    expect(note.courseId).toBe(course.id);
    expect(note.content).toContain("lokal");
    expect(note.favorite).toBe(true);
  });
});
