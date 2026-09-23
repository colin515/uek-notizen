import { describe, expect, it } from "vitest";
import { courseGrade, effectiveAssessmentWeight } from "./ModuleHub";
import type { Course } from "./types";

function officialCourse(localWeight = 0): Course {
  return {
    id: "course",
    number: "M294",
    title: "Frontend",
    createdAt: "2026-01-01T00:00:00.000Z",
    isCustom: false,
    assessments: [
      { id: "a", title: "Element 1", topic: "", weight: 60, grade: 5, source: "official", locked: true },
      { id: "b", title: "Element 2", topic: "", weight: 40, grade: 4, source: "official", locked: true },
      ...(localWeight ? [{ id: "local", title: "Lokaler Nachweis", topic: "", weight: localWeight, grade: 6, source: "local" as const }] : [])
    ]
  };
}

describe("official LBV grade weighting", () => {
  it("uses official LBV percentages unchanged when there is no local element", () => {
    const course = officialCourse();
    expect(effectiveAssessmentWeight(course, course.assessments![0])).toBeCloseTo(60);
    expect(effectiveAssessmentWeight(course, course.assessments![1])).toBeCloseTo(40);
    expect(courseGrade(course).grade).toBeCloseTo(4.6);
    expect(courseGrade(course).coverage).toBeCloseTo(100);
  });

  it("scales the official LBV to the remaining share when a 20 percent local element exists", () => {
    const course = officialCourse(20);
    expect(effectiveAssessmentWeight(course, course.assessments![0])).toBeCloseTo(48);
    expect(effectiveAssessmentWeight(course, course.assessments![1])).toBeCloseTo(32);
    expect(effectiveAssessmentWeight(course, course.assessments![2])).toBeCloseTo(20);
    expect(courseGrade(course).grade).toBeCloseTo(4.88);
    expect(courseGrade(course).coverage).toBeCloseTo(100);
  });

  it("caps local influence at 20 percent in the effective calculation", () => {
    const course = officialCourse(35);
    expect(effectiveAssessmentWeight(course, course.assessments![0])).toBeCloseTo(48);
    expect(effectiveAssessmentWeight(course, course.assessments![1])).toBeCloseTo(32);
  });
});
