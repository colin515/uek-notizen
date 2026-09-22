import type { AppData, Note } from "./types";

const KEY = "uek-notizen-data-v1";

export const emptyData: AppData = {
  settings: { name: "", apiKey: "", theme: "light", onboarded: false },
  notes: [],
  selectedNoteId: null
};

export function createId(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

export function sampleNote(): Note {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "Willkommen bei ÜK Notizen",
    course: "Beispiel-ÜK",
    content: `<h2>Deine erste Notiz</h2><p>Hier kannst du alles festhalten, was du im ÜK lernst.</p><ul><li>Formatiere Text mit der Leiste oben.</li><li>Ordne Notizen einem ÜK und Tags zu.</li><li>Lass dir Inhalte mit der KI erklären oder zusammenfassen.</li><li>Exportiere deine Notizen als DOCX.</li></ul><p>Alles wird lokal auf diesem Gerät gespeichert.</p>`,
    tags: ["Start", "Beispiel"],
    favorite: true,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(emptyData);
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...emptyData,
      ...parsed,
      settings: { ...emptyData.settings, ...parsed.settings },
      notes: Array.isArray(parsed.notes) ? parsed.notes : []
    };
  } catch {
    return structuredClone(emptyData);
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

