import { describe, expect, it } from "vitest";
import { courseGrade, overallCourseAverage } from "./ModuleHub";
import { moduleStarterHtml, type IctModule } from "./moduleCatalog";
import type { Course } from "./types";

function course(id: string, grades: Array<{ weight: number; grade: number | null }>): Course {
  return {
    id,
    number: "M188",
    title: "Services betreiben",
    createdAt: new Date(0).toISOString(),
    isCustom: false,
    assessments: grades.map((item, index) => ({
      id: String(index),
      title: "Element " + (index + 1),
      topic: "Prüfungsstoff",
      weight: item.weight,
      grade: item.grade,
      source: "official",
      locked: true
    }))
  };
}

describe("official grade tracking", () => {
  it("calculates an official weighted module grade", () => {
    const result = courseGrade(course("1", [
      { weight: 60, grade: 5 },
      { weight: 40, grade: 4 }
    ]));
    expect(result.grade).toBeCloseTo(4.6);
    expect(result.coverage).toBe(100);
  });

  it("marks partial grade coverage as an intermediate result", () => {
    const result = courseGrade(course("1", [
      { weight: 60, grade: 5 },
      { weight: 40, grade: null }
    ]));
    expect(result.grade).toBeCloseTo(5);
    expect(result.coverage).toBe(60);
  });

  it("calculates the average across graded modules", () => {
    const average = overallCourseAverage([
      course("1", [{ weight: 100, grade: 5 }]),
      course("2", [{ weight: 100, grade: 4 }])
    ]);
    expect(average).toBeCloseTo(4.5);
  });
});

describe("complete module starter note", () => {
  it("includes goals, knowledge and official LBV weights", () => {
    const module: IctModule = {
      number: "188",
      title: "Services betreiben, warten und überwachen",
      field: "System Management",
      profiles: ["informatik-pe"],
      summary: "Services sicher betreiben.",
      topics: ["Monitoring"],
      competence: "Betreibt und aktualisiert Services.",
      object: "Server und Netzwerkdienste.",
      actionGoals: ["Systeme analysieren", "Services überwachen"],
      knowledge: ["Kennt Betriebsdokumentationen", "Kennt Monitoring-Techniken"],
      sourceUrl: "https://example.test/module/188",
      assessmentVariants: [{
        id: "LBV 188-1",
        title: "LBV 188-1",
        totalDuration: "3,00h",
        assessments: [
          { id: "a", title: "Praktischer Teil", topic: "Systemumgebung", weight: 60, grade: null, locked: true, source: "official" },
          { id: "b", title: "Schriftlicher Teil", topic: "Praxisfragen", weight: 40, grade: null, locked: true, source: "official" }
        ]
      }]
    };
    const html = moduleStarterHtml(module);
    expect(html).toContain("Handlungsziele");
    expect(html).toContain("Handlungsnotwendige Kenntnisse");
    expect(html).toContain("60%");
    expect(html).toContain("40%");
  });
});
