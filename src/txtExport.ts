
import { invoke } from "@tauri-apps/api/core";
import type { Course, Note } from "./types";

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9äöüÄÖÜ_ -]/g, "").replace(/\s+/g, " ").trim() || "Notiz";
}

function htmlToText(html: string): string {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  body.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  body.querySelectorAll("li").forEach(li => li.prepend("• "));
  body.querySelectorAll("p,h1,h2,h3,blockquote,div").forEach(element => element.append("\n"));
  return (body.textContent ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function downloadFallback(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export async function exportCourseTxt(course: Course, notes: Note[]): Promise<void> {
  const activeNotes = notes
    .filter(note => note.courseId === course.id && !note.archived)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const files = activeNotes.map(note => ({
    name: safeFileName(note.title) + ".txt",
    content: course.number + " – " + course.title + "\n\n" + note.title + "\n\n" + htmlToText(note.content) + "\n"
  }));

  const courseFolder = safeFileName(course.number + " - " + course.title);

  if ("__TAURI_INTERNALS__" in window) {
    await invoke("export_course_txt", { courseFolder, files });
    return;
  }

  for (const file of files.length ? files : [{
    name: "Keine_Notizen.txt",
    content: course.number + " – " + course.title + "\n\nDieser ÜK enthält noch keine Notizen.\n"
  }]) {
    downloadFallback(file.name, file.content);
  }
}
