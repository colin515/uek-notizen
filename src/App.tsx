
import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Bot, BookOpen, Check, ChevronDown, Download, FilePlus2, FolderOpen, GraduationCap, Heart, HelpCircle, ImagePlus, Layers3, ListChecks, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings as SettingsIcon, Sparkles, Sun, Tag, Trash2, Workflow, X, Zap } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { askGroq, askGroqChat, type AiAction, type AiChatResult } from "./ai";
import { exportCourseDocx } from "./docxExport";
import { exportCourseTxt } from "./txtExport";
import { createId, loadData, sampleCourse, sampleNote, saveData } from "./storage";
import { slashCommands, slashCommandMatches, slashReplacement } from "./editorBlocks";
import FlowchartEditor, { createFlowchart, parseFlowchartElement, renderFlowchartHtml, type FlowchartData } from "./FlowchartEditor";
import ModuleHub from "./ModuleHub";
import { ICT_PROFILES, findIctModule, moduleStarterHtml, normalizeModuleNumber, type IctModule } from "./moduleCatalog";
import { fetchOfficialModuleBundle } from "./officialModuleData";
import type { AppData, Course, Note } from "./types";

type Filter = "course" | "quick" | "favorites" | "archive";
type ChatMessage = { role: "user" | "assistant"; content: string };
type ContextMenu = { x: number; y: number; noteId: string } | null;


const SEARCH_GROUPS = [
  ["kabel", "kabels", "usb", "usb-c", "usbc", "hdmi", "displayport", "display", "monitor", "bildschirm", "anschluss", "anschlüsse", "video", "signal", "adapter", "siplay"],
  ["netzwerk", "netzwerke", "lan", "wlan", "ethernet", "ip", "router", "switch", "tcp", "udp"],
  ["betriebssystem", "windows", "linux", "macos", "os", "treiber", "installation"],
  ["sicherheit", "passwort", "phishing", "malware", "virus", "firewall", "schutz"]
];

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("de-CH")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöü\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTerms(value: string): string[] {
  return normalizeSearch(value)
    .split(" ")
    .filter(Boolean)
    .map(term => term.length > 5 && term.endsWith("en") ? term.slice(0, -2) : term.endsWith("s") && term.length > 4 ? term.slice(0, -1) : term);
}

function searchScore(note: Note, course: Course | undefined, query: string): number {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 1;
  const haystack = normalizeSearch(
    [note.title, stripHtml(note.content), note.tags.join(" "), course?.number ?? "", course?.title ?? ""].join(" ")
  );
  const haystackWords = new Set(haystack.split(" ").filter(Boolean));
  if (haystack.includes(normalizedQuery)) return 20;

  let score = 0;
  for (const term of searchTerms(query)) {
    if (haystack.includes(term)) {
      score += 6;
      continue;
    }

    for (const group of SEARCH_GROUPS) {
      if (group.some(item => item.includes(term) || term.includes(item))) {
        if (group.some(item => haystack.includes(item))) score += 4;
      }
    }

    if (term.length >= 4 && Array.from(haystackWords).some(word =>
      word.startsWith(term.slice(0, Math.max(3, term.length - 1)))
    )) {
      score += 2;
    }
  }
  return score;
}

function stripHtml(html: string): string {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdownToHtml(value: string): string {
  let text = value.replace(/\\\*/g, "*").replace(/\\_/g, "_").replace(/\\~/g, "~").trim();
  text = escapeHtml(text);
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
  const tick = String.fromCharCode(96);
  text = text.replace(new RegExp(tick + "([^" + tick + "\\n]+)" + tick, "g"), "<code>$1</code>");
  return text;
}

function plainTextToHtml(value: string): string {
  let cleaned = value.replace(/\r/g, "").trim();
  if (!cleaned) return "<p></p>";

  cleaned = cleaned.replace(/^\s*```(?:markdown|md|text)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```\s*$/i, "").trim();

  const lines = cleaned.split("\n");
  const output: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flush = () => {
    if (bullets.length) {
      output.push("<ul>" + bullets.map(item => "<li>" + inlineMarkdownToHtml(item) + "</li>").join("") + "</ul>");
      bullets = [];
    }
    if (numbers.length) {
      output.push("<ol>" + numbers.map(item => "<li>" + inlineMarkdownToHtml(item) + "</li>").join("") + "</ol>");
      numbers = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      const level = line.startsWith("###") ? 3 : 2;
      output.push("<h" + level + ">" + inlineMarkdownToHtml(heading[1]) + "</h" + level + ">");
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (numbers.length) flush();
      bullets.push(line.replace(/^[-•*]\s+/, ""));
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      if (bullets.length) flush();
      numbers.push(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    if (/^>\s+/.test(line)) {
      flush();
      output.push("<blockquote>" + inlineMarkdownToHtml(line.replace(/^>\s+/, "")) + "</blockquote>");
      continue;
    }

    flush();
    output.push("<p>" + inlineMarkdownToHtml(line) + "</p>");
  }

  flush();
  return output.join("") || "<p></p>";
}
function currentSelectionRange(root: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) return null;
  return selection.getRangeAt(0).cloneRange();
}

function makeTextRange(root: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  if (!nodes.length) return null;

  let offset = 0;
  let startPoint: { node: Text; offset: number } | null = null;
  let endPoint: { node: Text; offset: number } | null = null;

  for (const textNode of nodes) {
    const nextOffset = offset + textNode.length;
    if (!startPoint && start >= offset && start <= nextOffset) {
      startPoint = { node: textNode, offset: start - offset };
    }
    if (!endPoint && end >= offset && end <= nextOffset) {
      endPoint = { node: textNode, offset: end - offset };
    }
    offset = nextOffset;
  }

  if (!startPoint) startPoint = { node: nodes[nodes.length - 1], offset: nodes[nodes.length - 1].length };
  if (!endPoint) endPoint = { node: nodes[nodes.length - 1], offset: nodes[nodes.length - 1].length };

  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  return range;
}

function replaceSlashCommand(root: HTMLElement, replacementHtml: string): boolean {
  const caret = currentSelectionRange(root);
  if (!caret || !caret.collapsed) return false;

  const before = caret.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(caret.endContainer, caret.endOffset);
  const text = before.toString();
  const match = text.match(/\/([^\s/]*)$/);
  if (!match) return false;

  const range = makeTextRange(root, text.length - match[0].length, text.length);
  if (!range) return false;

  range.deleteContents();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.execCommand("insertHTML", false, replacementHtml);
  return true;
}

function getSlashQuery(root: HTMLElement): string | null {
  const caret = currentSelectionRange(root);
  if (!caret || !caret.collapsed) return null;

  const before = caret.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(caret.endContainer, caret.endOffset);
  const match = before.toString().match(/\/([^\s/]*)$/);
  return match ? match[1].toLocaleLowerCase("de-CH") : null;
}

function insertImageAtSelection(root: HTMLElement, dataUrl: string, alt: string): void {
  root.focus();
  document.execCommand(
    "insertHTML",
    false,
    '<img src="' + dataUrl + '" alt="' + escapeHtml(alt) + '" class="note-image" />'
  );
}

function createNote(courseId: string | null, title = "Unbenannte Notiz", content = "<p></p>"): Note {
  const now = new Date().toISOString();
  return {
    id: createId(),
    courseId,
    title,
    content,
    tags: [],
    favorite: false,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
}

function StableEditor({
  note,
  editorRef,
  syncVersion,
  onChange,
  onKeyDown,
  onInput,
  onPaste,
  onDoubleClick
}: {
  note: Note;
  editorRef: React.RefObject<HTMLDivElement | null>;
  syncVersion: number;
  onChange: (html: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onInput: (event: React.FormEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.content;
  }, [note.id, syncVersion, editorRef]);

  return (
    <div
      ref={editorRef}
      className="editor"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onInput={event => {
        onChange(event.currentTarget.innerHTML);
        onInput(event);
      }}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onDoubleClick={onDoubleClick}
    />
  );
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("course");
  const [sidebar, setSidebar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moduleHubOpen, setModuleHubOpen] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseDraft, setCourseDraft] = useState({ number: "", title: "" });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ich kann in ÜK Notizen nicht nur antworten, sondern auch ÜKs und Notizen erstellen, Texte verbessern und Inhalte direkt in deinem Dokument ändern. Sag mir einfach, was ich machen soll." }
  ]);
  const [toast, setToast] = useState("");
  const [setup, setSetup] = useState({ name: data.settings.name, apiKey: data.settings.apiKey, educationProfileId: data.settings.educationProfileId });
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [editorSyncVersion, setEditorSyncVersion] = useState(0);
  const [selectedChatAction, setSelectedChatAction] = useState<AiAction | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [flowchartDraft, setFlowchartDraft] = useState<FlowchartData | null>(null);
  const [editingFlowchartId, setEditingFlowchartId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const moduleEnrichmentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    saveData(data);
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data]);

  useEffect(() => {
    if (data.settings.onboarded && !data.settings.tutorialSeen) {
      setTutorialStep(0);
      setTutorialOpen(true);
    }
  }, [data.settings.onboarded, data.settings.tutorialSeen]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  useEffect(() => {
    const candidates = data.courses.filter(course =>
      course.catalogModuleNumber &&
      !course.isCustom &&
      !course.officialDataLoadedAt &&
      !moduleEnrichmentRef.current.has(course.id)
    );

    for (const course of candidates) {
      const number = course.catalogModuleNumber!;
      moduleEnrichmentRef.current.add(course.id);
      const fallback = findIctModule(number, data.settings.educationProfileId);

      void fetchOfficialModuleBundle(number, fallback)
        .then(official => {
          if (!official) return;
          const variants = official.assessmentVariants ?? [];
          const firstVariant = variants[0];
          const content = moduleStarterHtml(official);

          setData(current => ({
            ...current,
            courses: current.courses.map(item => item.id === course.id
              ? {
                  ...item,
                  number: "M" + official.number,
                  title: official.title,
                  catalogModuleNumber: official.number,
                  moduleField: official.field,
                  moduleTopics: official.topics,
                  moduleSummary: official.summary,
                  moduleCompetence: official.competence,
                  moduleObject: official.object,
                  moduleActionGoals: official.actionGoals,
                  moduleKnowledge: official.knowledge,
                  moduleDegrees: official.degrees,
                  officialSourceUrl: official.sourceUrl,
                  officialDataLoadedAt: new Date().toISOString(),
                  assessmentVariants: variants,
                  assessmentVariantId: item.assessmentVariantId ?? firstVariant?.id,
                  assessments: item.assessments?.some(assessment => assessment.grade !== null)
                    ? item.assessments
                    : firstVariant?.assessments.map(assessment => ({ ...assessment, grade: null })) ?? []
                }
              : item),
            notes: current.notes.map(note =>
              note.courseId === course.id &&
              /^Modul\s+.+\s+·\s+(Überblick|Komplettübersicht)$/.test(note.title)
                ? { ...note, title: "Modul " + official.number + " · Komplettübersicht", content, updatedAt: new Date().toISOString() }
                : note
            )
          }));
        })
        .catch(() => {
          // Existing local data stays intact. The app can try again after a restart.
        });
    }
  }, [data.courses, data.settings.educationProfileId]);

  const selectedCourse = data.courses.find(course => course.id === data.selectedCourseId) ?? null;
  const selected = data.notes.find(note => note.id === data.selectedNoteId) ?? null;
  const quickMode = filter === "quick";
  const recognizedDraftModule = findIctModule(courseDraft.number, data.settings.educationProfileId);

  const courseLabel = (courseId: string | null) => {
    if (!courseId) return "Schnellnotiz";
    const course = data.courses.find(item => item.id === courseId);
    return course ? course.number + " · " + course.title : "Unbekannter ÜK";
  };

  const visible = useMemo(() => {
    return data.notes
      .filter(note => {
        if (filter === "course" && (note.courseId !== data.selectedCourseId || note.archived)) return false;
        if (filter === "quick" && (note.courseId !== null || note.archived)) return false;
        if (filter === "favorites" && (!note.favorite || note.archived)) return false;
        if (filter === "archive" && !note.archived) return false;
        return true;
      })
      .map(note => ({
        note,
        score: searchScore(note, data.courses.find(course => course.id === note.courseId), query)
      }))
      .filter(item => !query.trim() || item.score > 0)
      .sort((a, b) => b.score - a.score || b.note.updatedAt.localeCompare(a.note.updatedAt))
      .map(item => item.note);
  }, [data.notes, data.courses, data.selectedCourseId, filter, query]);

  const patchNote = (patch: Partial<Note>) => {
    if (!selected) return;
    setData(current => ({
      ...current,
      notes: current.notes.map(note =>
        note.id === selected.id
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note
      )
    }));
  };

  const replaceNoteContent = (noteId: string, text: string, title?: string) => {
    const html = plainTextToHtml(text);
    if (noteId === selected?.id && editorRef.current) {
      editorRef.current.innerHTML = html;
      setEditorSyncVersion(value => value + 1);
    }
    setData(current => ({
      ...current,
      notes: current.notes.map(note =>
        note.id === noteId
          ? { ...note, content: html, ...(title ? { title } : {}), updatedAt: new Date().toISOString() }
          : note
      )
    }));
  };

  const selectCourse = (course: Course) => {
    const firstNote = data.notes
      .filter(note => note.courseId === course.id && !note.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    setData(current => ({
      ...current,
      selectedCourseId: course.id,
      selectedNoteId: firstNote?.id ?? null
    }));
    setFilter("course");
  };

  const selectQuickNotes = () => {
    const firstNote = data.notes
      .filter(note => note.courseId === null && !note.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    setData(current => ({
      ...current,
      selectedCourseId: null,
      selectedNoteId: firstNote?.id ?? null
    }));
    setFilter("quick");
  };

  const officialCoursePatch = (module: IctModule): Partial<Course> => {
    const variants = module.assessmentVariants ?? [];
    const firstVariant = variants[0];
    return {
      catalogModuleNumber: module.number,
      moduleField: module.field,
      moduleTopics: module.topics,
      moduleSummary: module.summary,
      moduleCompetence: module.competence,
      moduleObject: module.object,
      moduleActionGoals: module.actionGoals ?? [],
      moduleKnowledge: module.knowledge ?? [],
      moduleDegrees: module.degrees ?? [],
      officialSourceUrl: module.sourceUrl,
      officialDataLoadedAt: new Date().toISOString(),
      isCustom: false,
      assessmentVariants: variants,
      assessmentVariantId: firstVariant?.id,
      assessments: firstVariant?.assessments.map(assessment => ({ ...assessment, grade: null })) ?? []
    };
  };

  const createOfficialCourse = (module: IctModule): string => {
    const course: Course = {
      id: createId(),
      number: "M" + module.number,
      title: module.title,
      createdAt: new Date().toISOString(),
      ...officialCoursePatch(module)
    };
    const starterNote = createNote(
      course.id,
      "Modul " + module.number + " · Komplettübersicht",
      moduleStarterHtml(module)
    );

    setData(current => ({
      ...current,
      courses: [...current.courses, course],
      notes: [starterNote, ...current.notes],
      selectedCourseId: course.id,
      selectedNoteId: starterNote.id
    }));
    setCourseDraft({ number: "", title: "" });
    setCourseModalOpen(false);
    setModuleHubOpen(false);
    setFilter("course");
    setToast(
      "Modul " + module.number + " vollständig geladen" +
      ((module.assessmentVariants?.length ?? 0) ? " · LBV inklusive" : "")
    );
    return course.id;
  };

  const loadAndAddOfficialModule = async (number: string, fallback?: IctModule): Promise<string | null> => {
    const normalized = normalizeModuleNumber(number);
    const existing = data.courses.find(course => normalizeModuleNumber(course.number) === normalized);
    if (existing) {
      selectCourse(existing);
      setCourseModalOpen(false);
      setModuleHubOpen(false);
      setToast("Modul " + normalized + " ist bereits bei deinen ÜKs");
      return existing.id;
    }

    setModuleLoading(true);
    try {
      const official = await fetchOfficialModuleBundle(normalized, fallback);
      if (!official) {
        setToast("Offizielle Daten für Modul " + normalized + " konnten nicht geladen werden.");
        return null;
      }
      return createOfficialCourse(official);
    } catch (error) {
      setToast("Modulbaukasten konnte nicht geladen werden: " + (error instanceof Error ? error.message : String(error)));
      return null;
    } finally {
      setModuleLoading(false);
    }
  };

  const addCourse = async (numberOverride?: string, titleOverride?: string, catalogOverride?: IctModule): Promise<string | null> => {
    const rawNumber = (numberOverride ?? courseDraft.number).trim();
    const fallback = catalogOverride ?? findIctModule(rawNumber, data.settings.educationProfileId);

    if (rawNumber) {
      const officialId = await loadAndAddOfficialModule(rawNumber, fallback);
      if (officialId) return officialId;
      if (fallback) return null;
    }

    const title = (titleOverride ?? courseDraft.title).trim();
    if (!title) {
      setToast("Kein offizielles Modul gefunden. Für einen Custom-ÜK bitte einen Titel eingeben.");
      return null;
    }

    const course: Course = {
      id: createId(),
      number: rawNumber || "Custom",
      title,
      createdAt: new Date().toISOString(),
      isCustom: true,
      assessments: []
    };
    setData(current => ({
      ...current,
      courses: [...current.courses, course],
      selectedCourseId: course.id,
      selectedNoteId: null
    }));
    setCourseDraft({ number: "", title: "" });
    setCourseModalOpen(false);
    setFilter("course");
    setToast("Custom-ÜK wurde erstellt");
    return course.id;
  };

  const addCourseFromModule = async (module: IctModule) => {
    await loadAndAddOfficialModule(module.number, module);
  };

  const addTemplateNote = (courseId: string, title: string, html: string) => {
    const course = data.courses.find(item => item.id === courseId);
    if (!course) return;
    const note = createNote(courseId, title, html);
    setData(current => ({
      ...current,
      notes: [note, ...current.notes],
      selectedCourseId: courseId,
      selectedNoteId: note.id
    }));
    setFilter("course");
    setModuleHubOpen(false);
    setToast("Template als Notiz erstellt");
  };

  const addNote = (title = "Unbenannte Notiz", content = "<p></p>", courseId = selectedCourse?.id): string | null => {
    if (!courseId) {
      setCourseModalOpen(true);
      return null;
    }

    const note = createNote(courseId, title, content);
    setData(current => ({
      ...current,
      notes: [note, ...current.notes],
      selectedNoteId: note.id,
      selectedCourseId: courseId
    }));
    setFilter("course");
    return note.id;
  };

  const addQuickNote = (title = "Schnellnotiz", content = "<p></p>"): string => {
    const note = createNote(null, title, content);
    setData(current => ({
      ...current,
      notes: [note, ...current.notes],
      selectedNoteId: note.id,
      selectedCourseId: null
    }));
    setFilter("quick");
    setToast("Schnellnotiz erstellt");
    return note.id;
  };

  const duplicateNote = (noteId: string) => {
    const original = data.notes.find(note => note.id === noteId);
    if (!original) return;

    const copy = createNote(original.courseId, original.title + " – Kopie", original.content);
    copy.tags = [...original.tags];

    setData(current => ({
      ...current,
      notes: [copy, ...current.notes],
      selectedNoteId: copy.id,
      selectedCourseId: copy.courseId
    }));
    setToast("Notiz dupliziert");
  };

  const removeNote = (noteId = selected?.id) => {
    const target = data.notes.find(note => note.id === noteId);
    if (!target || !confirm("„" + target.title + "“ wirklich löschen?")) return;

    setData(current => {
      const notes = current.notes.filter(note => note.id !== target.id);
      const next = notes.find(note => note.courseId === current.selectedCourseId && !note.archived);
      return { ...current, notes, selectedNoteId: next?.id ?? null };
    });
  };

  const removeCourse = (courseId: string) => {
    const course = data.courses.find(item => item.id === courseId);
    if (!course) return;
    const noteCount = data.notes.filter(note => note.courseId === courseId).length;
    const message = noteCount
      ? "„" + course.number + " · " + course.title + "“ und alle " + noteCount + " zugehörigen Notizen wirklich löschen?"
      : "„" + course.number + " · " + course.title + "“ wirklich löschen?";
    if (!confirm(message)) return;

    setData(current => {
      const courses = current.courses.filter(item => item.id !== courseId);
      const notes = current.notes.filter(note => note.courseId !== courseId);
      const nextCourse = courses[0] ?? null;
      const nextNote = nextCourse
        ? notes
            .filter(note => note.courseId === nextCourse.id && !note.archived)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
        : null;
      return {
        ...current,
        courses,
        notes,
        selectedCourseId: nextCourse?.id ?? null,
        selectedNoteId: nextNote?.id ?? null
      };
    });
    setFilter("course");
    setToast("ÜK wurde gelöscht");
  };

  const format = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    patchNote({ content: editorRef.current?.innerHTML ?? "" });
  };

  const openAi = () => {
    setAiOpen(true);
    setAiText("");
  };

  const runQuickAi = async (action: AiAction) => {
    if (!selected) return;

    setAiOpen(true);
    setAiLoading(true);
    setSelectedChatAction(action);
    setAiText("");

    const labels: Record<AiAction, string> = {
      summary: "Zusammenfassen",
      explain: "Einfach erklären",
      improve: "Text verbessern",
      quiz: "Lernfragen erstellen"
    };

    setChatMessages(messages => [...messages, { role: "user", content: labels[action] + " für die aktuelle Notiz" }]);

    try {
      const result = await askGroq(data.settings.apiKey, action, selected.content);

      if (action === "improve") {
        replaceNoteContent(selected.id, result);
        setAiText(result);
        setChatMessages(messages => [
          ...messages,
          { role: "assistant", content: "Fertig. Der verbesserte Text wurde direkt in die aktuelle Notiz eingesetzt und der alte Inhalt vollständig ersetzt." }
        ]);
        setToast("Text wurde verbessert und ersetzt");
      } else {
        setAiText(result);
        setChatMessages(messages => [...messages, { role: "assistant", content: result }]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAiText(message);
      setChatMessages(messages => [...messages, { role: "assistant", content: message }]);
    } finally {
      setAiLoading(false);
      setSelectedChatAction(null);
    }
  };

  const buildAiContext = () => {
    const currentCourse = selectedCourse
      ? "Aktueller ÜK: " + selectedCourse.number + " · " + selectedCourse.title
      : selected?.courseId === null
        ? "Aktueller Bereich: Schnellnotizen (ohne ÜK)"
        : "Kein ÜK ausgewählt";

    const currentNote = selected
      ? "Aktuelle Notiz: " + selected.title + "\n" + stripHtml(selected.content).slice(0, 7000)
      : "Keine Notiz ausgewählt";

    const courses = data.courses.map(course => ({
      id: course.id,
      number: course.number,
      title: course.title
    }));

    const notes = data.notes
      .filter(note => !note.archived)
      .slice(0, 18)
      .map(note => ({
        id: note.id,
        courseId: note.courseId,
        title: note.title,
        content: stripHtml(note.content).slice(0, 700)
      }));

    return { currentCourse, currentNote, courses, notes };
  };

  const applyAiActions = (result: AiChatResult): string => {
    let createdCourseId: string | null = null;
    let createdNoteId: string | null = null;
    let changedCurrentNote = false;

    setData(current => {
      let courses = [...current.courses];
      let notes = [...current.notes];
      let selectedCourseId = current.selectedCourseId;
      let selectedNoteId = current.selectedNoteId;

      for (const action of result.actions) {
        if (action.type === "create_course") {
          const catalogModule = findIctModule(action.number ?? "", current.settings.educationProfileId);
          const course: Course = {
            id: createId(),
            number: catalogModule ? "M" + catalogModule.number : ((action.number ?? "ÜK").trim() || "ÜK"),
            title: catalogModule?.title ?? (action.title.trim() || "Neuer ÜK"),
            createdAt: new Date().toISOString(),
            ...(catalogModule ? {
              catalogModuleNumber: catalogModule.number,
              moduleField: catalogModule.field,
              moduleTopics: catalogModule.topics,
              moduleSummary: catalogModule.summary,
              assessments: []
            } : { isCustom: true, assessments: [] })
          };
          courses.push(course);
          createdCourseId = course.id;
          selectedCourseId = course.id;
          selectedNoteId = null;
        }

        if (action.type === "create_note") {
          let courseId = action.courseId;
          if (courseId === "quick") courseId = null;
          else if (!courseId || courseId === "current") courseId = selectedCourseId ?? undefined;
          else if (courseId === "newest_created") courseId = createdCourseId ?? selectedCourseId ?? undefined;
          if (courseId === undefined) courseId = createdCourseId ?? selectedCourseId ?? undefined;
          if (courseId === undefined) continue;

          const note: Note = {
            ...createNote(courseId, action.title.trim() || (courseId === null ? "Schnellnotiz" : "Neue Notiz"), plainTextToHtml(action.content)),
            tags: Array.isArray(action.tags) ? action.tags.filter(Boolean).slice(0, 10) : []
          };

          notes.unshift(note);
          createdNoteId = note.id;
          selectedCourseId = courseId;
          selectedNoteId = note.id;
        }

        if (action.type === "replace_note") {
          const noteId = action.noteId || selectedNoteId;
          if (!noteId) continue;
          const html = plainTextToHtml(action.content);
          notes = notes.map(note => note.id === noteId
            ? { ...note, content: html, ...(action.title ? { title: action.title } : {}), updatedAt: new Date().toISOString() }
            : note
          );
          selectedNoteId = noteId;
          changedCurrentNote = noteId === current.selectedNoteId;
        }

        if (action.type === "update_note") {
          const noteId = action.noteId || selectedNoteId;
          if (!noteId) continue;
          notes = notes.map(note => note.id === noteId
            ? {
                ...note,
                ...(action.title ? { title: action.title } : {}),
                ...(action.content !== undefined ? { content: plainTextToHtml(action.content) } : {}),
                updatedAt: new Date().toISOString()
              }
            : note
          );
          selectedNoteId = noteId;
          changedCurrentNote = noteId === current.selectedNoteId;
        }
      }

      return { ...current, courses, notes, selectedCourseId, selectedNoteId };
    });

    if (changedCurrentNote) setEditorSyncVersion(value => value + 1);
    if (createdNoteId) setToast("Notiz wurde von der KI erstellt");
    else if (createdCourseId) setToast("ÜK wurde von der KI erstellt");

    return result.reply;
  };

  const sendAiChat = async () => {
    const message = chatInput.trim();
    if (!message || aiLoading) return;

    setChatInput("");
    setAiLoading(true);
    setAiOpen(true);
    setChatMessages(messages => [...messages, { role: "user", content: message }]);

    try {
      const result = await askGroqChat(data.settings.apiKey, message, buildAiContext());
      const reply = applyAiActions(result);
      setChatMessages(messages => [...messages, { role: "assistant", content: reply }]);
    } catch (error) {
      setChatMessages(messages => [
        ...messages,
        { role: "assistant", content: error instanceof Error ? error.message : String(error) }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const exportCourse = async () => {
    if (!selectedCourse) return;
    try {
      await exportCourseDocx(selectedCourse, data.notes, data.settings.name);
      setToast("ÜK-Dokument wurde als Word exportiert");
    } catch (error) {
      setToast("Word-Export fehlgeschlagen: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const exportTxt = async (course = selectedCourse) => {
    if (!course) return;
    try {
      await exportCourseTxt(course, data.notes);
      setToast("TXT-Dateien wurden in Downloads/" + course.number + " - " + course.title + " gespeichert");
    } catch (error) {
      setToast("TXT-Export fehlgeschlagen: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const saveSelection = () => {
    if (editorRef.current) savedSelectionRef.current = currentSelectionRange(editorRef.current);
  };

  const insertImage = () => {
    saveSelection();
    imageInputRef.current?.click();
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/") || !editorRef.current) return;

    const reader = new FileReader();
    reader.onload = () => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      if (savedSelectionRef.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedSelectionRef.current);
      }

      insertImageAtSelection(editor, String(reader.result), file.name);
      patchNote({ content: editor.innerHTML });
      setToast("Bild eingefügt");
    };
    reader.readAsDataURL(file);
  };

  const runSlashCommand = (command: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (command === "bild") {
      replaceSlashCommand(editor, "");
      insertImage();
    } else if (command === "flowchart") {
      replaceSlashCommand(editor, "");
      savedSelectionRef.current = currentSelectionRange(editor);
      setEditingFlowchartId(null);
      setFlowchartDraft(createFlowchart());
    } else {
      const replacement = slashReplacement(command);
      if (replacement) {
        replaceSlashCommand(editor, replacement);
        patchNote({ content: editor.innerHTML });
      }
    }

    setSlashQuery(null);
  };

  const handleEditorDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const block = target.closest(".flowchart-block") as HTMLElement | null;
    if (!block) return;
    const parsed = parseFlowchartElement(block);
    if (!parsed) return;
    event.preventDefault();
    setEditingFlowchartId(parsed.id);
    setFlowchartDraft(parsed);
  };

  const saveFlowchart = (flowchart: FlowchartData) => {
    const editor = editorRef.current;
    if (!editor) return;

    const html = renderFlowchartHtml(flowchart);
    if (editingFlowchartId) {
      const block = editor.querySelector('.flowchart-block[data-flowchart-id="' + editingFlowchartId + '"]');
      if (block) block.outerHTML = html;
    } else {
      editor.focus();
      if (savedSelectionRef.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedSelectionRef.current);
      }
      document.execCommand("insertHTML", false, html + "<p><br></p>");
    }

    patchNote({ content: editor.innerHTML });
    setFlowchartDraft(null);
    setEditingFlowchartId(null);
    setToast("Flowchart gespeichert");
  };

  const updateSlashMenu = () => {
    if (editorRef.current) setSlashQuery(getSlashQuery(editorRef.current));
  };

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (slashQuery !== null && event.key === "Escape") {
      setSlashQuery(null);
      event.preventDefault();
      return;
    }

    if (slashQuery !== null && event.key === "Enter") {
      const match = slashCommands.find(command => slashCommandMatches(command, slashQuery));
      if (match) {
        event.preventDefault();
        runSlashCommand(match.query);
      }
    }
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.files).find(file => file.type.startsWith("image/"));
    if (!image) return;

    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      if (!editorRef.current) return;
      insertImageAtSelection(editorRef.current, String(reader.result), image.name);
      patchNote({ content: editorRef.current.innerHTML });
    };
    reader.readAsDataURL(image);
  };

  const handleNoteContextMenu = (event: ReactMouseEvent, noteId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 235),
      y: Math.min(event.clientY, window.innerHeight - 260),
      noteId
    });
  };

  if (!data.settings.onboarded) {
    return (
      <Onboarding
        setup={setup}
        setSetup={setSetup}
        finish={() => {
          const course = sampleCourse();
          const note = sampleNote(course.id);
          setData({
            settings: { ...data.settings, ...setup, onboarded: true },
            courses: [course],
            notes: [note],
            selectedCourseId: course.id,
            selectedNoteId: note.id
          });
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      {sidebar && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">ÜK</div>
            <div><strong>ÜK Notizen</strong><span>{data.settings.name}</span></div>
          </div>

          <div className="create-actions">
            <button className="new-note" onClick={() => setCourseModalOpen(true)}>
              <Plus size={17}/> Neuer ÜK
            </button>
            <button className="quick-note-button" onClick={() => addQuickNote()}>
              <Zap size={16}/> Schnellnotiz
            </button>
          </div>

          <label className="search">
            <Search size={16}/>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Alles durchsuchen…"/>
          </label>
          {query.trim() && <div className="search-hint">Schlaue Suche berücksichtigt Themen, Synonyme und ähnliche Begriffe.</div>}

          <nav className="nav-list">
            <button className={filter === "quick" ? "active" : ""} onClick={selectQuickNotes}>
              <Zap size={16}/> Schnellnotizen <span>{data.notes.filter(note => note.courseId === null && !note.archived).length}</span>
            </button>
            <button className={filter === "favorites" ? "active" : ""} onClick={() => setFilter("favorites")}><Heart size={16}/> Favoriten</button>
            <button className={filter === "archive" ? "active" : ""} onClick={() => setFilter("archive")}><Archive size={16}/> Archiv</button>
            <button onClick={() => setModuleHubOpen(true)}><GraduationCap size={16}/> Module & Noten</button>
          </nav>

          <div className="course-heading">
            <span>DEINE ÜKS</span>
            <button title="ÜK erstellen" onClick={() => setCourseModalOpen(true)}><Plus size={14}/></button>
          </div>

          <div className="course-list">
            {data.courses.map(course => (
              <div key={course.id} className={filter === "course" && course.id === selectedCourse?.id ? "course-card active" : "course-card"}>
                <button className="course-main" onClick={() => selectCourse(course)}>
                  <span className="course-icon"><Layers3 size={15}/></span>
                  <span><strong>{course.number}</strong><small>{course.title}</small></span>
                </button>
                <b className="course-count">{data.notes.filter(note => note.courseId === course.id && !note.archived).length}</b>
                <button
                  className="course-delete"
                  title="ÜK löschen"
                  onClick={event => {
                    event.stopPropagation();
                    removeCourse(course.id);
                  }}
                >
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>

          <div className="note-list">
            {visible.map(note => (
              <button
                key={note.id}
                className={"note-card " + (note.id === selected?.id ? "selected" : "")}
                onClick={() => setData(current => ({ ...current, selectedNoteId: note.id, selectedCourseId: note.courseId }))}
                onContextMenu={event => handleNoteContextMenu(event, note.id)}
              >
                <strong>{note.title}</strong>
                <span>{courseLabel(note.courseId)} · {new Date(note.updatedAt).toLocaleDateString("de-CH")}</span>
                <p>{stripHtml(note.content).slice(0, 88) || "Leere Notiz"}</p>
              </button>
            ))}
            {!visible.length && <div className="muted search-empty">Keine passende Notiz gefunden.</div>}
          </div>

          <button className="settings-link" onClick={() => setSettingsOpen(true)}><SettingsIcon size={16}/> Einstellungen</button>
        </aside>
      )}

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button" title="Seitenleiste" onClick={() => setSidebar(value => !value)}>
            {sidebar ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}
          </button>

          <div className="breadcrumbs">
            <span>{selectedCourse ? selectedCourse.number + " · " + selectedCourse.title : selected?.courseId === null || quickMode ? "Schnellnotizen" : "ÜK Notizen"}</span>
            {selected && <><span>/</span><strong>{selected.title}</strong></>}
          </div>

          <div className="top-actions">
            <button className="icon-button" title="Darstellung wechseln" onClick={() => setData(current => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === "light" ? "dark" : "light" } }))}>
              {data.settings.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}
            </button>

            {selected && <button className="secondary ai-top-btn" title="KI-Chat öffnen" onClick={openAi}><Sparkles size={16}/> <strong>KI</strong></button>}
            {selectedCourse && <button className="secondary" onClick={exportCourse}><Download size={16}/> Ganzen ÜK als Word</button>}
            {selectedCourse && <button className="secondary" onClick={() => void exportTxt()}><Download size={16}/> TXT</button>}
            {selectedCourse && <button className="primary" onClick={() => addNote()}><FilePlus2 size={16}/> Neue Notiz</button>}
            {quickMode && <button className="primary" onClick={() => addQuickNote()}><Zap size={16}/> Schnellnotiz</button>}
          </div>
        </header>

        {!selected ? (
          <section className="empty-state">
            <div>{quickMode ? <Zap size={34}/> : selectedCourse ? <BookOpen size={34}/> : <Layers3 size={34}/>}</div>
            <h1>{quickMode ? "Noch keine Schnellnotizen" : selectedCourse ? selectedCourse.number + " – " + selectedCourse.title : "Erstelle deinen ersten ÜK"}</h1>
            <p>{quickMode ? "Für Gedanken, Aufgaben und Infos, die zu keinem bestimmten ÜK gehören." : selectedCourse ? "Dieser ÜK ist bereit für deine Notizen." : "Lege zuerst Nummer und Titel fest. Danach sammelst du alle zugehörigen Notizen an einem Ort."}</p>
            <button className="primary" onClick={quickMode ? () => addQuickNote() : selectedCourse ? () => addNote() : () => setCourseModalOpen(true)}>
              {quickMode ? <Zap size={17}/> : selectedCourse ? <FilePlus2 size={17}/> : <Plus size={17}/>}
              {quickMode ? "Schnellnotiz erstellen" : selectedCourse ? "Erste Notiz erstellen" : "ÜK erstellen"}
            </button>
          </section>
        ) : (
          <section className="editor-wrap">
            <input className="title-input" value={selected.title} onChange={event => patchNote({ title: event.target.value })} placeholder="Titel"/>

            <div className="meta-row">
              <label>
                <FolderOpen size={15}/>
                <select value={selected.courseId ?? "__quick__"} onChange={event => {
                  const courseId = event.target.value === "__quick__" ? null : event.target.value;
                  patchNote({ courseId });
                  setData(current => ({ ...current, selectedCourseId: courseId }));
                  setFilter(courseId === null ? "quick" : "course");
                }}>
                  <option value="__quick__">Schnellnotiz · ohne ÜK</option>
                  {data.courses.map(course => <option key={course.id} value={course.id}>{course.number} · {course.title}</option>)}
                </select>
              </label>
              <label>
                <Tag size={15}/>
                <input value={selected.tags.join(", ")} onChange={event => patchNote({ tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="Tags mit Komma trennen"/>
              </label>
              <span>Bearbeitet {new Date(selected.updatedAt).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>

            <div className="toolbar">
              <button title="Fett" onClick={() => format("bold")}><b>B</b></button>
              <button title="Kursiv" onClick={() => format("italic")}><i>I</i></button>
              <button title="Unterstrichen" onClick={() => format("underline")}><u>U</u></button>
              <span/>
              <button title="Überschrift" onClick={() => format("formatBlock", "h2")}>H2</button>
              <button title="Stichpunkte" onClick={() => format("insertUnorderedList")}>• Liste</button>
              <button title="Nummerierte Liste" onClick={() => format("insertOrderedList")}>1. Liste</button>
              <button title="Zitat" onClick={() => format("formatBlock", "blockquote")}>❝</button>
              <button title="Bild einfügen" onClick={insertImage}><ImagePlus size={16}/></button>
              <button title="Checkliste" onClick={() => {
                editorRef.current?.focus();
                document.execCommand("insertHTML", false, "<p>☐ Aufgabe</p><p></p>");
                patchNote({ content: editorRef.current?.innerHTML ?? "" });
              }}><ListChecks size={16}/></button>

              <div className="toolbar-spacer"/>
              <button title="Favorit" onClick={() => patchNote({ favorite: !selected.favorite })}><Heart size={16} fill={selected.favorite ? "currentColor" : "none"}/></button>
              <button className="toolbar-ai-btn" title="KI-Chat" onClick={openAi}><Sparkles size={15}/> <span>KI</span></button>
              <button title="Archivieren" onClick={() => patchNote({ archived: !selected.archived })}><Archive size={16}/></button>
              <button className="danger" title="Löschen" onClick={() => removeNote()}><Trash2 size={16}/></button>
            </div>

            {slashQuery !== null && (
              <div className="slash-menu">
                <div className="slash-title">/ Schnellbefehle</div>
                {slashCommands
                  .filter(command => slashCommandMatches(command, slashQuery))
                  .map(command => (
                    <button
                      key={command.query}
                      onMouseDown={event => {
                        event.preventDefault();
                        runSlashCommand(command.query);
                      }}
                    >
                      <strong>/{command.query}</strong><span>{command.category} · {command.hint}</span>
                    </button>
                  ))}
              </div>
            )}

            <StableEditor
              note={selected}
              editorRef={editorRef}
              syncVersion={editorSyncVersion}
              onChange={html => patchNote({ content: html })}
              onInput={updateSlashMenu}
              onKeyDown={handleEditorKeyDown}
              onPaste={handleEditorPaste}
              onDoubleClick={handleEditorDoubleClick}
            />
            <input ref={imageInputRef} className="hidden-input" type="file" accept="image/*" onChange={handleImageSelected}/>
          </section>
        )}
      </main>

      {aiOpen && (
        <div className="drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && setAiOpen(false)}>
          <aside className="ai-drawer">
            <div className="drawer-header">
              <div><Bot size={20}/><strong>KI-Assistent</strong></div>
              <button className="icon-button" onClick={() => setAiOpen(false)}><X size={19}/></button>
            </div>

            <div className="ai-quick-heading">Schnellaktionen</div>
            <div className="ai-grid">
              <button onClick={() => void runQuickAi("summary")}>Zusammenfassen</button>
              <button onClick={() => void runQuickAi("explain")}>Einfach erklären</button>
              <button onClick={() => void runQuickAi("improve")}>Text verbessern</button>
              <button onClick={() => void runQuickAi("quiz")}>Lernfragen</button>
            </div>

            <div className="ai-chat">
              {chatMessages.map((message, index) => (
                <div key={index} className={"chat-message " + message.role}>
                  <span className="chat-role">{message.role === "assistant" ? "KI" : "Du"}</span>
                  <div>{message.content}</div>
                </div>
              ))}
              {aiLoading && (
                <div className="chat-message assistant">
                  <span className="chat-role">KI</span>
                  <div className="thinking"><Sparkles size={15}/> KI arbeitet…</div>
                </div>
              )}
            </div>

            {aiText && !aiLoading && selectedChatAction !== "improve" && (
              <div className="ai-output compact"><pre>{aiText}</pre></div>
            )}

            <div className="ai-compose">
              <textarea
                value={chatInput}
                onChange={event => setChatInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendAiChat();
                  }
                }}
                placeholder="z. B. „Erstelle eine Notiz über USB-C, HDMI und DisplayPort“"
              />
              <button className="primary" onClick={() => void sendAiChat()} disabled={aiLoading || !chatInput.trim()}><Sparkles size={16}/> Senden</button>
            </div>

            <div className="ai-chat-hint">
              Beispiele: „Erstelle einen neuen ÜK“, „Mach eine Notiz über USB-C und HDMI“ oder „Verbessere den Text und ersetze ihn direkt“.
            </div>
          </aside>
        </div>
      )}

      {contextMenu && (() => {
        const menuNote = data.notes.find(note => note.id === contextMenu.noteId);
        if (!menuNote) return null;

        return (
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={event => event.stopPropagation()}>
            <button onClick={() => {
              setData(current => ({ ...current, selectedNoteId: menuNote.id, selectedCourseId: menuNote.courseId }));
              setContextMenu(null);
            }}><BookOpen size={15}/> Öffnen</button>
            <button onClick={() => {
              setData(current => ({
                ...current,
                notes: current.notes.map(note => note.id === menuNote.id
                  ? { ...note, favorite: !note.favorite, updatedAt: new Date().toISOString() }
                  : note)
              }));
              setContextMenu(null);
            }}><Heart size={15}/> {menuNote.favorite ? "Favorit entfernen" : "Zu Favoriten"}</button>
            <button onClick={() => { duplicateNote(menuNote.id); setContextMenu(null); }}><FilePlus2 size={15}/> Duplizieren</button>
            {menuNote.courseId && <button onClick={() => { void exportTxt(data.courses.find(course => course.id === menuNote.courseId)); setContextMenu(null); }}><Download size={15}/> ÜK als TXT exportieren</button>}
            <button onClick={() => {
              setData(current => ({
                ...current,
                notes: current.notes.map(note => note.id === menuNote.id
                  ? { ...note, archived: !note.archived, updatedAt: new Date().toISOString() }
                  : note)
              }));
              setContextMenu(null);
            }}><Archive size={15}/> {menuNote.archived ? "Wiederherstellen" : "Archivieren"}</button>
            <button className="context-danger" onClick={() => { removeNote(menuNote.id); setContextMenu(null); }}><Trash2 size={15}/> Löschen</button>
          </div>
        );
      })()}

      {courseModalOpen && (
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setCourseModalOpen(false)}>
          <div className="modal">
            <div className="drawer-header">
              <strong>Neuen ÜK erstellen</strong>
              <button className="icon-button" onClick={() => setCourseModalOpen(false)}><X size={19}/></button>
            </div>
            <div className="current-profile-chip">
              <GraduationCap size={16}/>
              <div>
                <small>Ausbildung</small>
                <strong>{ICT_PROFILES.find(profile => profile.id === data.settings.educationProfileId)?.title ?? "ICT-Ausbildung"}</strong>
              </div>
            </div>
            <label className="field">Modulnummer
              <input
                autoFocus
                value={courseDraft.number}
                onChange={event => {
                  const value = event.target.value;
                  const module = findIctModule(value, data.settings.educationProfileId);
                  setCourseDraft({ number: value, title: module?.title ?? "" });
                }}
                placeholder="z. B. 294"
              />
              <small>Nummer eingeben. Die App lädt danach den vollständigen Modulinhalt und die veröffentlichten LBV-Daten.</small>
            </label>
            {recognizedDraftModule && (
              <div className="module-recognition-inline">
                <span>Erkannt · {recognizedDraftModule.field}</span>
                <strong>M{recognizedDraftModule.number} · {recognizedDraftModule.title}</strong>
                <p>{recognizedDraftModule.topics.slice(0, 5).join(" · ")}</p>
              </div>
            )}
            <label className="field custom-title-field">Custom-Titel <span>(nur für eigene ÜKs)</span><input value={courseDraft.title} onChange={event => setCourseDraft({ ...courseDraft, title: event.target.value })} placeholder="Leer lassen für offizielle ICT-Module"/></label>
            <button className="secondary full" onClick={() => { setCourseModalOpen(false); setModuleHubOpen(true); }}><GraduationCap size={16}/> Modulbaukasten durchsuchen</button>
            <button className="primary full" onClick={() => void addCourse()} disabled={moduleLoading}><Plus size={16}/> {moduleLoading ? "Offizielle Daten werden geladen…" : courseDraft.number.trim() ? "Komplettes Modul laden" : "Custom-ÜK erstellen"}</button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSettingsOpen(false)}>
          <div className="modal">
            <div className="drawer-header">
              <strong>Einstellungen</strong>
              <button className="icon-button" onClick={() => setSettingsOpen(false)}><X size={19}/></button>
            </div>
            <label className="field">Dein Name<input value={data.settings.name} onChange={event => setData(current => ({ ...current, settings: { ...current.settings, name: event.target.value } }))}/></label>
            <label className="field">Ausbildung
              <select value={data.settings.educationProfileId} onChange={event => setData(current => ({ ...current, settings: { ...current.settings, educationProfileId: event.target.value } }))}>
                {ICT_PROFILES.map(profile => <option key={profile.id} value={profile.id}>{profile.title}</option>)}
              </select>
              <small>Damit werden passende Module im Modulbaukasten zuerst angezeigt.</small>
            </label>
            <label className="field">Groq API-Key<input type="password" value={data.settings.apiKey} onChange={event => setData(current => ({ ...current, settings: { ...current.settings, apiKey: event.target.value } }))} placeholder="gsk_…"/><small>Wird nur lokal auf deinem Gerät gespeichert.</small></label>
            <button className="secondary full tutorial-settings-button" onClick={() => { setSettingsOpen(false); setTutorialStep(0); setTutorialOpen(true); }}><HelpCircle size={16}/> Kurzes Tutorial anzeigen</button>
            <button className="primary full" onClick={() => { setSettingsOpen(false); setToast("Einstellungen gespeichert"); }}>Speichern</button>
          </div>
        </div>
      )}

      {moduleHubOpen && (
        <ModuleHub
          data={data}
          setData={setData}
          onClose={() => setModuleHubOpen(false)}
          onOpenCourse={course => {
            selectCourse(course);
            setModuleHubOpen(false);
          }}
          onCreateCourseFromModule={addCourseFromModule}
          onCreateTemplateNote={addTemplateNote}
        />
      )}

      {flowchartDraft && (
        <div className="modal-backdrop flowchart-backdrop">
          <FlowchartEditor
            initial={flowchartDraft}
            onCancel={() => { setFlowchartDraft(null); setEditingFlowchartId(null); }}
            onSave={saveFlowchart}
          />
        </div>
      )}

      {tutorialOpen && (
        <TutorialOverlay
          step={tutorialStep}
          setStep={setTutorialStep}
          onClose={() => {
            setTutorialOpen(false);
            setData(current => ({ ...current, settings: { ...current.settings, tutorialSeen: true } }));
          }}
        />
      )}

      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}


function TutorialOverlay({
  step,
  setStep,
  onClose
}: {
  step: number;
  setStep: (value: number) => void;
  onClose: () => void;
}) {
  const slides = [
    {
      icon: <Layers3 size={30}/>,
      eyebrow: "1 · ÜKs",
      title: "Alles pro ÜK gesammelt",
      text: "Erstelle links einen ÜK und darin beliebig viele Notizen. Am Ende exportierst du den ganzen ÜK als Word-Dokument."
    },
    {
      icon: <GraduationCap size={30}/>,
      eyebrow: "2 · Modulbaukasten",
      title: "Modulnummer eingeben – fertig",
      text: "Wähle deine Ausbildung und gib zum Beispiel 294 ein. Die App erkennt bekannte ICT-Module, erstellt einen passenden Überblick und bietet unter „Module & Noten“ Prüfungen, Gewichtungen und Noten."
    },
    {
      icon: <Zap size={30}/>,
      eyebrow: "3 · Schnellnotizen",
      title: "Nicht alles braucht einen ÜK",
      text: "Mit Schnellnotizen hältst du spontane Gedanken, Aufgaben oder Infos fest. Später kannst du sie über die Auswahl oben einem ÜK zuordnen."
    },
    {
      icon: <Workflow size={30}/>,
      eyebrow: "4 · Slash-Menü",
      title: "Tippe / im Editor",
      text: "Mit / fügst du Tabellen, Checklisten, Infoboxen, Code, Spalten, Bilder und Flowcharts ein. Flowcharts lassen sich per Drag & Drop bearbeiten und verbinden."
    },
    {
      icon: <Sparkles size={30}/>,
      eyebrow: "5 · KI",
      title: "Die KI kann direkt mitarbeiten",
      text: "Sie kann erklären, zusammenfassen, Texte verbessern sowie ÜKs und Notizen anlegen. Du kannst auch ausdrücklich eine Schnellnotiz erstellen lassen."
    }
  ];

  const current = slides[Math.min(step, slides.length - 1)];

  return (
    <div className="modal-backdrop tutorial-backdrop">
      <div className="tutorial-card">
        <div className="tutorial-top">
          <div className="tutorial-icon">{current.icon}</div>
          <button className="icon-button" onClick={onClose} title="Tutorial schliessen"><X size={19}/></button>
        </div>
        <span className="eyebrow">{current.eyebrow}</span>
        <h2>{current.title}</h2>
        <p>{current.text}</p>

        <div className="tutorial-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={index === step ? "active" : ""}
              aria-label={"Tutorial Schritt " + (index + 1)}
              onClick={() => setStep(index)}
            />
          ))}
        </div>

        <div className="tutorial-actions">
          <button className="secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Zurück</button>
          {step < slides.length - 1
            ? <button className="primary" onClick={() => setStep(step + 1)}>Weiter</button>
            : <button className="primary" onClick={onClose}><Check size={16}/> Los geht’s</button>}
        </div>
      </div>
    </div>
  );
}

function Onboarding({
  setup,
  setSetup,
  finish
}: {
  setup: { name: string; apiKey: string; educationProfileId: string };
  setSetup: (value: { name: string; apiKey: string; educationProfileId: string }) => void;
  finish: () => void;
}) {
  const [step, setStep] = useState(0);

  return (
    <div className="onboarding">
      <div className="setup-card">
        <div className="setup-logo">ÜK</div>

        {step === 0 && <>
          <span className="eyebrow">Willkommen</span>
          <h1>Deine Notizen.<br/>Einfach organisiert.</h1>
          <p>Erstelle deine ÜKs, sammle alle Notizen und exportiere am Ende ein vollständiges Word-Dokument.</p>
          <button className="primary full" onClick={() => setStep(1)}>Einrichten <ChevronDown size={17}/></button>
        </>}

        {step === 1 && <>
          <span className="eyebrow">Schritt 1 von 3</span>
          <h1>Wie heisst du?</h1>
          <p>Dein Name erscheint auch in exportierten ÜK-Dokumenten.</p>
          <label className="field">Name<input autoFocus value={setup.name} onChange={event => setSetup({ ...setup, name: event.target.value })} placeholder="Dein Name"/></label>
          <button className="primary full" disabled={!setup.name.trim()} onClick={() => setStep(2)}>Weiter</button>
        </>}

        {step === 2 && <>
          <span className="eyebrow">Schritt 2 von 3</span>
          <h1>Welche Ausbildung machst du?</h1>
          <p>Damit erkennt die App passende ICT-Module schneller und zeigt sie im Modulbaukasten zuerst.</p>
          <label className="field">Ausbildung
            <select value={setup.educationProfileId} onChange={event => setSetup({ ...setup, educationProfileId: event.target.value })}>
              {ICT_PROFILES.map(profile => <option key={profile.id} value={profile.id}>{profile.title}</option>)}
            </select>
          </label>
          <button className="primary full" onClick={() => setStep(3)}>Weiter</button>
        </>}

        {step === 3 && <>
          <span className="eyebrow">Schritt 3 von 3</span>
          <h1>KI verbinden</h1>
          <p>Füge deinen Groq API-Key ein. Du kannst ihn später ändern.</p>
          <label className="field">Groq API-Key<input autoFocus type="password" value={setup.apiKey} onChange={event => setSetup({ ...setup, apiKey: event.target.value })} placeholder="gsk_…"/><small>Der Schlüssel bleibt lokal auf deinem Gerät.</small></label>
          <button className="primary full" onClick={finish}>App starten <Check size={17}/></button>
          <button className="text-button" onClick={finish}>Ohne KI fortfahren</button>
        </>}
      </div>
      <div className="setup-footer">Offline nutzbar · Keine Anmeldung · Deine Daten bleiben bei dir</div>
    </div>
  );
}
