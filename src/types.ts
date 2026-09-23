export type Theme = "light" | "dark";

export interface Settings {
  name: string;
  apiKey: string;
  theme: Theme;
  onboarded: boolean;
  tutorialSeen: boolean;
  educationProfileId: string;
}

export interface CourseAssessmentCriterion {
  title: string;
  weight?: string;
}

export interface CourseAssessment {
  id: string;
  title: string;
  topic: string;
  weight: number;
  grade: number | null;
  source?: "official" | "custom";
  locked?: boolean;
  format?: string;
  duration?: string;
  aids?: string;
  socialForm?: string;
  criteria?: CourseAssessmentCriterion[];
}

export interface CourseAssessmentVariant {
  id: string;
  title: string;
  description?: string;
  totalDuration?: string;
  sourceUrl?: string;
  assessments: CourseAssessment[];
}

export interface Course {
  id: string;
  number: string;
  title: string;
  createdAt: string;
  catalogModuleNumber?: string;
  moduleField?: string;
  moduleTopics?: string[];
  moduleSummary?: string;
  moduleCompetence?: string;
  moduleObject?: string;
  moduleActionGoals?: string[];
  moduleKnowledge?: string[];
  moduleDegrees?: string[];
  officialSourceUrl?: string;
  officialDataLoadedAt?: string;
  isCustom?: boolean;
  assessmentVariants?: CourseAssessmentVariant[];
  assessmentVariantId?: string;
  assessments?: CourseAssessment[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  courseId: string | null;
  course?: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  settings: Settings;
  courses: Course[];
  notes: Note[];
  selectedCourseId: string | null;
  selectedNoteId: string | null;
}
