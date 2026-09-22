export type Theme = "light" | "dark";

export interface Settings {
  name: string;
  apiKey: string;
  theme: Theme;
  onboarded: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  course: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  settings: Settings;
  notes: Note[];
  selectedNoteId: string | null;
}

