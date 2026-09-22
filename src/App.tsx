import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Bot, Check, ChevronDown, Download, FilePlus2, FolderOpen, Heart, Moon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, Settings as SettingsIcon, Sparkles, Sun, Tag, Trash2, X } from "lucide-react";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { askGroq } from "./ai";
import { createId, loadData, sampleNote, saveData } from "./storage";
import type { AppData, Note } from "./types";

type Filter = "all" | "favorites" | "archive";
type AiAction = "summary" | "explain" | "improve" | "quiz";

function stripHtml(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function createNote(): Note {
  const now = new Date().toISOString();
  return { id: createId(), title: "Unbenannte Notiz", content: "<p></p>", course: "Allgemein", tags: [], favorite: false, archived: false, createdAt: now, updatedAt: now };
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sidebar, setSidebar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const selected = data.notes.find(n => n.id === data.selectedNoteId) ?? null;
  const courses = useMemo(() => Array.from(new Set(data.notes.map(n => n.course).filter(Boolean))).sort(), [data.notes]);
  const visible = useMemo(() => data.notes.filter(note => {
    if (filter === "favorites" && !note.favorite) return false;
    if (filter === "archive" ? !note.archived : note.archived) return false;
    const haystack = `${note.title} ${stripHtml(note.content)} ${note.course} ${note.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [data.notes, filter, query]);

  const patchNote = (patch: Partial<Note>) => {
    if (!selected) return;
    setData(current => ({ ...current, notes: current.notes.map(n => n.id === selected.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n) }));
  };
  const addNote = () => {
    const note = createNote();
    setData(current => ({ ...current, notes: [note, ...current.notes], selectedNoteId: note.id }));
    setFilter("all");
  };
  const removeNote = () => {
    if (!selected || !confirm(`„${selected.title}“ wirklich löschen?`)) return;
    setData(current => {
      const notes = current.notes.filter(n => n.id !== selected.id);
      return { ...current, notes, selectedNoteId: notes[0]?.id ?? null };
    });
  };
  const format = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    patchNote({ content: editorRef.current?.innerHTML ?? "" });
  };
  const runAi = async (action: AiAction) => {
    if (!selected) return;
    setAiOpen(true); setAiLoading(true); setAiText("");
    try { setAiText(await askGroq(data.settings.apiKey, action, selected.content)); }
    catch (error) { setAiText(error instanceof Error ? error.message : "Unbekannter Fehler"); }
    finally { setAiLoading(false); }
  };
  const exportDocx = async () => {
    if (!selected) return;
    const body = new DOMParser().parseFromString(selected.content, "text/html").body.innerText.split(/\n+/).filter(Boolean);
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: selected.title, heading: HeadingLevel.TITLE }),
      new Paragraph({ children: [new TextRun({ text: `${selected.course} · ${selected.tags.join(", ")}`, color: "666666" })] }),
      ...body.map(line => new Paragraph({ text: line }))
    ] }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${selected.title.replace(/[^a-z0-9äöüß_ -]/gi, "").trim() || "Notiz"}.docx`; a.click(); URL.revokeObjectURL(a.href);
    setToast("DOCX wurde exportiert");
  };

  if (!data.settings.onboarded) return <Onboarding setup={setup} setSetup={setSetup} finish={() => {
    const note = sampleNote();
    setData({ settings: { ...data.settings, ...setup, onboarded: true }, notes: [note], selectedNoteId: note.id });
  }} />;

  return <div className="app-shell">
    {sidebar && <aside className="sidebar">
      <div className="brand"><div className="brand-mark">ÜK</div><div><strong>ÜK Notizen</strong><span>{data.settings.name}</span></div></div>
      <button className="new-note" onClick={addNote}><FilePlus2 size={17}/> Neue Notiz</button>
      <label className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Notizen durchsuchen…"/></label>
      <nav className="nav-list">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><FolderOpen size={16}/> Alle Notizen <span>{data.notes.filter(n=>!n.archived).length}</span></button>
        <button className={filter === "favorites" ? "active" : ""} onClick={() => setFilter("favorites")}><Heart size={16}/> Favoriten</button>
        <button className={filter === "archive" ? "active" : ""} onClick={() => setFilter("archive")}><Archive size={16}/> Archiv</button>
      </nav>
      <div className="note-list">{visible.map(note => <button key={note.id} className={`note-card ${note.id === selected?.id ? "selected" : ""}`} onClick={() => setData(d => ({...d, selectedNoteId: note.id}))}>
        <strong>{note.title}</strong><span>{note.course} · {new Date(note.updatedAt).toLocaleDateString("de-CH")}</span><p>{stripHtml(note.content).slice(0, 88) || "Leere Notiz"}</p>
      </button>)}</div>
      <button className="settings-link" onClick={() => setSettingsOpen(true)}><SettingsIcon size={16}/> Einstellungen</button>
    </aside>}

    <main className="workspace">
      <header className="topbar">
        <button className="icon-button" title="Seitenleiste" onClick={() => setSidebar(v => !v)}>{sidebar ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}</button>
        <div className="breadcrumbs"><span>{selected?.course ?? "ÜK Notizen"}</span><span>/</span><strong>{selected?.title ?? "Keine Notiz gewählt"}</strong></div>
        <div className="top-actions">
          <button className="icon-button" title="Darstellung wechseln" onClick={() => setData(d => ({...d, settings:{...d.settings, theme:d.settings.theme === "light" ? "dark" : "light"}}))}>{data.settings.theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}</button>
          {selected && <><button className="icon-button" title="Favorit" onClick={() => patchNote({favorite: !selected.favorite})}><Heart size={18} fill={selected.favorite ? "currentColor" : "none"}/></button><button className="secondary" onClick={exportDocx}><Download size={16}/> DOCX</button><button className="primary" onClick={() => {setAiOpen(true); setAiText("")}}><Sparkles size={16}/> KI-Assistent</button></>}
        </div>
      </header>

      {!selected ? <section className="empty-state"><div>✦</div><h1>Deine ÜK-Notizen</h1><p>Erstelle eine neue Notiz und halte dein Wissen übersichtlich fest.</p><button className="primary" onClick={addNote}><FilePlus2 size={17}/> Erste Notiz erstellen</button></section> : <section className="editor-wrap">
        <input className="title-input" value={selected.title} onChange={e => patchNote({title: e.target.value})} placeholder="Titel" />
        <div className="meta-row">
          <label><FolderOpen size={15}/><input list="courses" value={selected.course} onChange={e => patchNote({course:e.target.value})}/><datalist id="courses">{courses.map(c=><option key={c} value={c}/>)}</datalist></label>
          <label><Tag size={15}/><input value={selected.tags.join(", ")} onChange={e => patchNote({tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} placeholder="Tags mit Komma trennen"/></label>
          <span>Bearbeitet {new Date(selected.updatedAt).toLocaleString("de-CH", {dateStyle:"short", timeStyle:"short"})}</span>
        </div>
        <div className="toolbar">
          <button onClick={() => format("bold")}><b>B</b></button><button onClick={() => format("italic")}><i>I</i></button><button onClick={() => format("underline")}><u>U</u></button>
          <span></span><button onClick={() => format("formatBlock", "h2")}>H2</button><button onClick={() => format("insertUnorderedList")}>• Liste</button><button onClick={() => format("insertOrderedList")}>1. Liste</button><button onClick={() => format("formatBlock", "blockquote")}>❝</button>
          <div className="toolbar-spacer"/><button title="Archivieren" onClick={() => patchNote({archived:!selected.archived})}><Archive size={16}/></button><button className="danger" title="Löschen" onClick={removeNote}><Trash2 size={16}/></button>
        </div>
        <div key={selected.id} ref={editorRef} className="editor" contentEditable suppressContentEditableWarning onInput={e => patchNote({content:e.currentTarget.innerHTML})} dangerouslySetInnerHTML={{__html:selected.content}} />
      </section>}
    </main>

    {aiOpen && <div className="drawer-backdrop" onMouseDown={e => e.target===e.currentTarget && setAiOpen(false)}><aside className="ai-drawer">
      <div className="drawer-header"><div><Bot size={20}/><strong>KI-Assistent</strong></div><button className="icon-button" onClick={()=>setAiOpen(false)}><X size={19}/></button></div>
      <p className="muted">Arbeite mit deiner aktuellen Notiz. Der Inhalt wird nur für deine Anfrage an Groq gesendet.</p>
      <div className="ai-grid"><button onClick={()=>runAi("summary")}>Zusammenfassen</button><button onClick={()=>runAi("explain")}>Einfach erklären</button><button onClick={()=>runAi("improve")}>Text verbessern</button><button onClick={()=>runAi("quiz")}>Lernfragen erstellen</button></div>
      <div className="ai-output">{aiLoading ? <div className="thinking"><Sparkles size={18}/> KI denkt nach…</div> : aiText ? <pre>{aiText}</pre> : <div className="ai-placeholder">Wähle eine Aktion aus.</div>}</div>
      {aiText && !aiLoading && <button className="secondary full" onClick={() => {navigator.clipboard.writeText(aiText); setToast("KI-Antwort kopiert")}}><Check size={16}/> Antwort kopieren</button>}
    </aside></div>}

    {settingsOpen && <div className="modal-backdrop" onMouseDown={e => e.target===e.currentTarget && setSettingsOpen(false)}><div className="modal">
      <div className="drawer-header"><strong>Einstellungen</strong><button className="icon-button" onClick={()=>setSettingsOpen(false)}><X size={19}/></button></div>
      <label className="field">Dein Name<input value={data.settings.name} onChange={e=>setData(d=>({...d,settings:{...d.settings,name:e.target.value}}))}/></label>
      <label className="field">Groq API-Key<input type="password" value={data.settings.apiKey} onChange={e=>setData(d=>({...d,settings:{...d.settings,apiKey:e.target.value}}))} placeholder="gsk_…"/><small>Wird nur lokal auf deinem Gerät gespeichert.</small></label>
      <button className="primary full" onClick={()=>{setSettingsOpen(false);setToast("Einstellungen gespeichert")}}>Speichern</button>
    </div></div>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Onboarding({setup,setSetup,finish}:{setup:{name:string;apiKey:string};setSetup:(v:{name:string;apiKey:string})=>void;finish:()=>void}) {
  const [step,setStep]=useState(0);
  return <div className="onboarding"><div className="setup-card"><div className="setup-logo">ÜK</div>
    {step===0 && <><span className="eyebrow">Willkommen</span><h1>Deine Notizen.<br/>Einfach organisiert.</h1><p>ÜK Notizen speichert dein Wissen lokal und hilft dir auf Wunsch mit KI.</p><button className="primary full" onClick={()=>setStep(1)}>Einrichten <ChevronDown size={17}/></button></>}
    {step===1 && <><span className="eyebrow">Schritt 1 von 2</span><h1>Wie heisst du?</h1><p>So können wir deine App persönlich gestalten.</p><label className="field">Name<input autoFocus value={setup.name} onChange={e=>setSetup({...setup,name:e.target.value})} placeholder="Dein Name"/></label><button className="primary full" disabled={!setup.name.trim()} onClick={()=>setStep(2)}>Weiter</button></>}
    {step===2 && <><span className="eyebrow">Schritt 2 von 2</span><h1>KI verbinden</h1><p>Füge deinen kostenlosen Groq API-Key ein. Du kannst ihn später ändern.</p><label className="field">Groq API-Key<input autoFocus type="password" value={setup.apiKey} onChange={e=>setSetup({...setup,apiKey:e.target.value})} placeholder="gsk_…"/><small>Der Schlüssel bleibt lokal auf deinem Gerät.</small></label><button className="primary full" onClick={finish}>App starten <Check size={17}/></button><button className="text-button" onClick={finish}>Ohne KI fortfahren</button></>}
  </div><div className="setup-footer">Offline nutzbar · Keine Anmeldung · Deine Daten bleiben bei dir</div></div>;
}
