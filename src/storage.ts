import type { AppData, Course, Note } from "./types";

const KEY = "uek-notizen-data-v1";

export const emptyData: AppData = {
  settings: { name: "", apiKey: "", theme: "light", onboarded: false, tutorialSeen: false },
  courses: [],
  notes: [],
  selectedCourseId: null,
  selectedNoteId: null
};

export function createId(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

export function sampleCourse(): Course {
  return {
    id: createId(),
    number: "ÜK 187",
    title: "ICT-Arbeitsplatz mit Betriebssystem in Betrieb nehmen",
    createdAt: new Date().toISOString()
  };
}

export function sampleNote(courseId: string): Note {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "Willkommen bei ÜK Notizen",
    courseId,
    content: `<h2>Deine erste Notiz</h2><p>Hier kannst du alles festhalten, was du im ÜK lernst.</p><ul><li>Formatiere Text mit der Leiste oben.</li><li>Ordne Notizen einem ÜK und Tags zu.</li><li>Nutze <strong>/</strong> für Tabellen, Infoboxen, Flowcharts und mehr.</li><li>Lass dir Inhalte mit der KI erklären oder zusammenfassen.</li><li>Exportiere deine ÜK-Notizen als DOCX.</li></ul><p>Für spontane Gedanken kannst du jederzeit eine Schnellnotiz ohne ÜK erstellen.</p>`,
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

    const parsed = JSON.parse(raw) as Partial<AppData> & {
      notes?: Array<Partial<Note> & { course?: string }>;
    };

    const existingCourses = Array.isArray(parsed.courses) ? parsed.courses : [];
    const courseByLegacyName = new Map<string, Course>();
    for (const course of existingCourses) {
      courseByLegacyName.set(`${course.number} ${course.title}`.trim(), course);
    }

    const migratedNotes = (Array.isArray(parsed.notes) ? parsed.notes : []).map(rawNote => {
      const hasCourseId = Object.prototype.hasOwnProperty.call(rawNote, "courseId");
      let courseId: string | null | undefined = hasCourseId ? (rawNote.courseId ?? null) : undefined;

      // Old app versions stored a legacy course name instead of courseId.
      // A real null is intentionally preserved as a Schnellnotiz.
      if (courseId === undefined) {
        const legacyName = rawNote.course?.trim() || "Allgemein";
        let course = courseByLegacyName.get(legacyName);
        if (!course) {
          course = {
            id: createId(),
            number: legacyName.startsWith("ÜK") ? legacyName : "ÜK",
            title: legacyName.startsWith("ÜK") ? "Importierter ÜK" : legacyName,
            createdAt: new Date().toISOString()
          };
          courseByLegacyName.set(legacyName, course);
        }
        courseId = course.id;
      }

      return {
        id: rawNote.id || createId(),
        title: rawNote.title || "Unbenannte Notiz",
        content: rawNote.content || "<p></p>",
        courseId,
        tags: Array.isArray(rawNote.tags) ? rawNote.tags : [],
        favorite: Boolean(rawNote.favorite),
        archived: Boolean(rawNote.archived),
        createdAt: rawNote.createdAt || new Date().toISOString(),
        updatedAt: rawNote.updatedAt || rawNote.createdAt || new Date().toISOString()
      } satisfies Note;
    });

    const courses = Array.from(new Map(
      [...existingCourses, ...courseByLegacyName.values()].map(course => [course.id, course])
    ).values());

    const selectedCourseId = parsed.selectedCourseId && courses.some(course => course.id === parsed.selectedCourseId)
      ? parsed.selectedCourseId
      : null;

    const selectedNoteId = parsed.selectedNoteId && migratedNotes.some(note => note.id === parsed.selectedNoteId)
      ? parsed.selectedNoteId
      : null;

    return {
      ...emptyData,
      ...parsed,
      settings: { ...emptyData.settings, ...parsed.settings },
      courses,
      notes: migratedNotes,
      selectedCourseId,
      selectedNoteId
    };
  } catch {
    return structuredClone(emptyData);
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}
