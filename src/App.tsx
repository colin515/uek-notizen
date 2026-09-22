import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, Bot, BookOpen, Check, ChevronDown, Download, FilePlus2, FolderOpen,
  Heart, Layers3, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search,
  Settings as SettingsIcon, Sparkles, Sun, Tag, Trash2, X
} from "lucide-react";
import { askGroq } from "./ai";
import { exportCourseDocx } from "./docxExport";
import { createId, loadData, sampleCourse, sampleNote, saveData } from "./storage";
import type { AppData, Course, Note } from "./types";

type Filter = "course" | "favorites" | "archive";
type AiAction = "summary" | "explain" | "improve" | "quiz";

function stripHtml(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function createNote(courseId: string): Note {
  const now = new Date().toISOString();
  return {
    id: createId(),
    courseId,
    title: "Unbenannte Notiz",
    content: "<p></p>",
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
  onChange
}: {
  note: Note;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onChange: (html: string) => void;
}) {
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.content;
  }, [note.id, editorRef]);

  return (
    <div
      ref={editorRef}
      className="editor"
      contentEditable
      suppressContentEditableWarning
      onInput={event => onChange(event.currentTarget.innerHTML)}
    />
  );
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("course");
  const [sidebar, setSidebar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseDraft, setCourseDraft] = useState({ number: "", title: "" });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [setup, setSetup] = useState({ name: data.settings.name, apiKey: data.settings.apiKey });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveData(data);
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const selectedCourse = data.courses.find(course => course.id === data.selectedCourseId) ?? null;
  const selected = data.notes.find(note => note.id === data.selectedNoteId) ?? null;
  const courseLabel = (courseId: string) => {
    const course = data.courses.find(item => item.id === courseId);
    return course ? `${course.number} · ${course.title}` : "Unbekannter ÜK";
  };

  const visible = useMemo(() => data.notes.filter(note => {
    if (filter === "course" && (note.courseId !== data.selectedCourseId || note.archived)) return false;
    if (filter === "favorites" && (!note.favorite || note.archived)) return false;
    if (filter === "archive" && !note.archived) return false;
    const course = data.courses.find(item => item.id === note.courseId);
    const haystack = `${note.title} ${stripHtml(note.content)} ${course?.number ?? ""} ${course?.title ?? ""} ${note.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [data.notes, data.courses, data.selectedCourseId, filter, query]);

  const patchNote = (patch: Partial<Note>) => {
    if (!selected) return;
    setData(current => ({
      ...current,
      notes: current.notes.map(note => note.id === selected.id
        ? { ...note, ...patch, updatedAt: new Date().toISOString() }
        : note)
    }));
  };

  const selectCourse = (course: Course) => {
    const firstNote = data.notes
      .filter(note => note.courseId === course.id && !note.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    setData(current => ({ ...current, selectedCourseId: course.id, selectedNoteId: firstNote?.id ?? null }));
    setFilter("course");
  };

  const addCourse = () => {
    if (!courseDraft.number.trim() || !courseDraft.title.trim()) return;
    const course: Course = {
      id: createId(),
      number: courseDraft.number.trim(),
      title: courseDraft.title.trim(),
      createdAt: new Date().toISOString()
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
    setToast("ÜK wurde erstellt");
  };

  const addNote = () => {
    if (!selectedCourse) {
      setCourseModalOpen(true);
      return;
    }
    const note = createNote(selectedCourse.id);
    setData(current => ({ ...current, notes: [note, ...current.notes], selectedNoteId: note.id }));
    setFilter("course");
  };

  const removeNote = () => {
    if (!selected || !confirm(`„${selected.title}“ wirklich löschen?`)) return;
    setData(current => {
      const notes = current.notes.filter(note => note.id !== selected.id);
      const next = notes.find(note => note.courseId === current.selectedCourseId && !note.archived);
      return { ...current, notes, selectedNoteId: next?.id ?? null };
    });
  };

  const format = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    patchNote({ content: editorRef.current?.innerHTML ?? "" });
  };

  const runAi = async (action: AiAction) => {
    if (!selected) return;
    setAiOpen(true);
    setAiLoading(true);
    setAiText("");
    try {
      setAiText(await askGroq(data.settings.apiKey, action, selected.content));
    } catch (error) {
      setAiText(error instanceof Error ? error.message : String(error));
    } finally {
      setAiLoading(false);
    }
  };

  const exportCourse = async () => {
    if (!selectedCourse) return;
    await exportCourseDocx(selectedCourse, data.notes, data.settings.name);
    setToast("ÜK-Dokument wurde exportiert");
  };

  if (!data.settings.onboarded) {
    return <Onboarding setup={setup} setSetup={setSetup} finish={() => {
      const course = sampleCourse();
      const note = sampleNote(course.id);
      setData({
        settings: { ...data.settings, ...setup, onboarded: true },
        courses: [course],
        notes: [note],
        selectedCourseId: course.id,
        selectedNoteId: note.id
      });
    }} />;
  }

  return <div className="app-shell">
    {sidebar && <aside className="sidebar">
      <div className="brand"><div className="brand-mark">ÜK</div><div><strong>ÜK Notizen</strong><span>{data.settings.name}</span></div></div>
      <button className="new-note" onClick={() => setCourseModalOpen(true)}><Plus size={17}/> Neuen ÜK erstellen</button>
      <label className="search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Alles durchsuchen…"/></label>
      <nav className="nav-list">
        <button className={filter === "favorites" ? "active" : ""} onClick={() => setFilter("favorites")}><Heart size={16}/> Favoriten</button>
        <button className={filter === "archive" ? "active" : ""} onClick={() => setFilter("archive")}><Archive size={16}/> Archiv</button>
      </nav>
      <div className="course-heading"><span>DEINE ÜKS</span><button title="ÜK erstellen" onClick={() => setCourseModalOpen(true)}><Plus size={14}/></button></div>
      <div className="course-list">
        {data.courses.map(course => <button key={course.id} className={filter === "course" && course.id === selectedCourse?.id ? "course-card active" : "course-card"} onClick={() => selectCourse(course)}>
          <span className="course-icon"><Layers3 size={15}/></span>
          <span><strong>{course.number}</strong><small>{course.title}</small></span>
          <b>{data.notes.filter(note => note.courseId === course.id && !note.archived).length}</b>
        </button>)}
      </div>
      <div className="note-list">
        {visible.map(note => <button key={note.id} className={`note-card ${note.id === selected?.id ? "selected" : ""}`} onClick={() => setData(current => ({ ...current, selectedNoteId: note.id, selectedCourseId: note.courseId }))}>
          <strong>{note.title}</strong><span>{courseLabel(note.courseId)} · {new Date(note.updatedAt).toLocaleDateString("de-CH")}</span><p>{stripHtml(note.content).slice(0, 88) || "Leere Notiz"}</p>
        </button>)}
      </div>
      <button className="settings-link" onClick={() => setSettingsOpen(true)}><SettingsIcon size={16}/> Einstellungen</button>
    </aside>}

    <main className="workspace">
      <header className="topbar">
        <button className="icon-button" title="Seitenleiste" onClick={() => setSidebar(value => !value)}>{sidebar ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}</button>
        <div className="breadcrumbs"><span>{selectedCourse ? `${selectedCourse.number} · ${selectedCourse.title}` : "ÜK Notizen"}</span>{selected && <><span>/</span><strong>{selected.title}</strong></>}</div>
        <div className="top-actions">
          <button className="icon-button" title="Darstellung wechseln" onClick={() => setData(current => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === "light" ? "dark" : "light" } }))}>{data.settings.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}</button>
          {selected && <button className="secondary ai-top-btn" title="KI-Assistent öffnen" onClick={() => { setAiOpen(true); setAiText(""); }}><Sparkles size={16} color="var(--accent)"/> <strong>KI-Assistent</strong></button>}
          {selectedCourse && <button className="secondary" onClick={exportCourse}><Download size={16}/> Ganzen ÜK als Word</button>}
          {selectedCourse && <button className="primary" onClick={addNote}><FilePlus2 size={16}/> Neue Notiz</button>}
        </div>
      </header>

      {!selected ? <section className="empty-state">
        <div>{selectedCourse ? <BookOpen size={34}/> : <Layers3 size={34}/>}</div>
        <h1>{selectedCourse ? `${selectedCourse.number} – ${selectedCourse.title}` : "Erstelle deinen ersten ÜK"}</h1>
        <p>{selectedCourse ? "Dieser ÜK ist bereit für deine Notizen." : "Lege zuerst Nummer und Titel fest. Danach sammelst du alle zugehörigen Notizen an einem Ort."}</p>
        <button className="primary" onClick={selectedCourse ? addNote : () => setCourseModalOpen(true)}>{selectedCourse ? <FilePlus2 size={17}/> : <Plus size={17}/>} {selectedCourse ? "Erste Notiz erstellen" : "ÜK erstellen"}</button>
      </section> : <section className="editor-wrap">
        <input className="title-input" value={selected.title} onChange={event => patchNote({ title: event.target.value })} placeholder="Titel"/>
        <div className="meta-row">
          <label><FolderOpen size={15}/><select value={selected.courseId} onChange={event => {
            const courseId = event.target.value;
            patchNote({ courseId });
            setData(current => ({ ...current, selectedCourseId: courseId }));
          }}>{data.courses.map(course => <option key={course.id} value={course.id}>{course.number} · {course.title}</option>)}</select></label>
          <label><Tag size={15}/><input value={selected.tags.join(", ")} onChange={event => patchNote({ tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="Tags mit Komma trennen"/></label>
          <span>Bearbeitet {new Date(selected.updatedAt).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
        <div className="toolbar">
          <button onClick={() => format("bold")}><b>B</b></button><button onClick={() => format("italic")}><i>I</i></button><button onClick={() => format("underline")}><u>U</u></button>
          <span/><button onClick={() => format("formatBlock", "h2")}>H2</button><button onClick={() => format("insertUnorderedList")}>• Liste</button><button onClick={() => format("insertOrderedList")}>1. Liste</button><button onClick={() => format("formatBlock", "blockquote")}>❝</button>
          <div className="toolbar-spacer"/>
          <button title="Favorit" onClick={() => patchNote({ favorite: !selected.favorite })}><Heart size={16} fill={selected.favorite ? "currentColor" : "none"}/></button>
          <button className="toolbar-ai-btn" title="KI-Assistent" onClick={() => { setAiOpen(true); setAiText(""); }}><Sparkles size={15}/> <span>KI-Assistent</span></button>
          <button title="Archivieren" onClick={() => patchNote({ archived: !selected.archived })}><Archive size={16}/></button>
          <button className="danger" title="Löschen" onClick={removeNote}><Trash2 size={16}/></button>
        </div>
        <StableEditor note={selected} editorRef={editorRef} onChange={html => patchNote({ content: html })}/>
      </section>}
    </main>

    {aiOpen && <div className="drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && setAiOpen(false)}><aside className="ai-drawer">
      <div className="drawer-header"><div><Bot size={20}/><strong>KI-Assistent</strong></div><button className="icon-button" onClick={() => setAiOpen(false)}><X size={19}/></button></div>
      <p className="muted">Der Inhalt der aktuellen Notiz wird nur für deine Anfrage an Groq gesendet.</p>
      <div className="ai-grid"><button onClick={() => runAi("summary")}>Zusammenfassen</button><button onClick={() => runAi("explain")}>Einfach erklären</button><button onClick={() => runAi("improve")}>Text verbessern</button><button onClick={() => runAi("quiz")}>Lernfragen erstellen</button></div>
      <div className="ai-output">{aiLoading ? <div className="thinking"><Sparkles size={18}/> KI denkt nach…</div> : aiText ? <pre>{aiText}</pre> : <div className="ai-placeholder">Wähle eine Aktion aus.</div>}</div>
      {aiText && !aiLoading && <button className="secondary full" onClick={() => { navigator.clipboard.writeText(aiText); setToast("KI-Antwort kopiert"); }}><Check size={16}/> Antwort kopieren</button>}
    </aside></div>}

    {courseModalOpen && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setCourseModalOpen(false)}><div className="modal">
      <div className="drawer-header"><strong>Neuen ÜK erstellen</strong><button className="icon-button" onClick={() => setCourseModalOpen(false)}><X size={19}/></button></div>
      <label className="field">ÜK-Nummer<input autoFocus value={courseDraft.number} onChange={event => setCourseDraft({ ...courseDraft, number: event.target.value })} placeholder="z. B. ÜK 187"/></label>
      <label className="field">ÜK-Titel<input value={courseDraft.title} onChange={event => setCourseDraft({ ...courseDraft, title: event.target.value })} placeholder="z. B. ICT-Arbeitsplatz in Betrieb nehmen"/></label>
      <button className="primary full" disabled={!courseDraft.number.trim() || !courseDraft.title.trim()} onClick={addCourse}><Plus size={16}/> ÜK erstellen</button>
    </div></div>}

    {settingsOpen && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSettingsOpen(false)}><div className="modal">
      <div className="drawer-header"><strong>Einstellungen</strong><button className="icon-button" onClick={() => setSettingsOpen(false)}><X size={19}/></button></div>
      <label className="field">Dein Name<input value={data.settings.name} onChange={event => setData(current => ({ ...current, settings: { ...current.settings, name: event.target.value } }))}/></label>
      <label className="field">Groq API-Key<input type="password" value={data.settings.apiKey} onChange={event => setData(current => ({ ...current, settings: { ...current.settings, apiKey: event.target.value } }))} placeholder="gsk_…"/><small>Wird nur lokal auf deinem Gerät gespeichert.</small></label>
      <button className="primary full" onClick={() => { setSettingsOpen(false); setToast("Einstellungen gespeichert"); }}>Speichern</button>
    </div></div>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Onboarding({ setup, setSetup, finish }: { setup: { name: string; apiKey: string }; setSetup: (value: { name: string; apiKey: string }) => void; finish: () => void }) {
  const [step, setStep] = useState(0);
  return <div className="onboarding"><div className="setup-card"><div className="setup-logo">ÜK</div>
    {step === 0 && <><span className="eyebrow">Willkommen</span><h1>Deine Notizen.<br/>Einfach organisiert.</h1><p>Erstelle deine ÜKs, sammle alle Notizen und exportiere am Ende ein vollständiges Word-Dokument.</p><button className="primary full" onClick={() => setStep(1)}>Einrichten <ChevronDown size={17}/></button></>}
    {step === 1 && <><span className="eyebrow">Schritt 1 von 2</span><h1>Wie heisst du?</h1><p>Dein Name erscheint auch in exportierten ÜK-Dokumenten.</p><label className="field">Name<input autoFocus value={setup.name} onChange={event => setSetup({ ...setup, name: event.target.value })} placeholder="Dein Name"/></label><button className="primary full" disabled={!setup.name.trim()} onClick={() => setStep(2)}>Weiter</button></>}
    {step === 2 && <><span className="eyebrow">Schritt 2 von 2</span><h1>KI verbinden</h1><p>Füge deinen Groq API-Key ein. Du kannst ihn später ändern.</p><label className="field">Groq API-Key<input autoFocus type="password" value={setup.apiKey} onChange={event => setSetup({ ...setup, apiKey: event.target.value })} placeholder="gsk_…"/><small>Der Schlüssel bleibt lokal auf deinem Gerät.</small></label><button className="primary full" onClick={finish}>App starten <Check size={17}/></button><button className="text-button" onClick={finish}>Ohne KI fortfahren</button></>}
  </div><div className="setup-footer">Offline nutzbar · Keine Anmeldung · Deine Daten bleiben bei dir</div></div>;
}
