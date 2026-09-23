export type Theme = "light" | "dark";

export interface Settings {
  name: string;
  apiKey: string;
  theme: Theme;
  onboarded: boolean;
  tutorialSeen: boolean;
}

export interface Course {
  id: string;
  number: string;
  title: string;
  createdAt: string;
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
