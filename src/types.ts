export type Theme = "light" | "dark";

export interface Settings {
  name: string;
  apiKey: string;
  theme: Theme;
  onboarded: boolean;
  tutorialSeen: boolean;
  educationProfileId: string;
}

export interface CourseAssessment {
  id: string;
  title: string;
  topic: string;
  weight: number;
  grade: number | null;
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
  isCustom?: boolean;
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
