import { useMemo, useState } from "react";
import { BookOpen, Calculator, CheckCircle2, ChevronRight, CircleAlert, FilePlus2, GraduationCap, LibraryBig, Plus, Search, Trash2, X } from "lucide-react";
import { ICT_MODULES, ICT_PROFILES, NOTE_TEMPLATES, findIctModule, modulesForProfile, normalizeModuleNumber, officialModuleUrl, type IctModule } from "./moduleCatalog";
import type { AppData, Course, CourseAssessment, Note } from "./types";

function numberValue(value: string): number | null {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function courseGrade(course: Course): { grade: number | null; coverage: number } {
  const assessments = course.assessments ?? [];
  const graded = assessments.filter(item => item.grade !== null && item.grade !== undefined && item.weight > 0);
  if (!graded.length) return { grade: null, coverage: 0 };
  const weight = graded.reduce((sum, item) => sum + item.weight, 0);
  if (weight <= 0) return { grade: null, coverage: 0 };
  const weighted = graded.reduce((sum, item) => sum + (item.grade ?? 0) * item.weight, 0);
  return { grade: weighted / weight, coverage: Math.min(100, weight) };
}

export function overallCourseAverage(courses: Course[]): number | null {
  const grades = courses.map(course => courseGrade(course).grade).filter((grade): grade is number => grade !== null);
  if (!grades.length) return null;
  return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
}

function GradePill({ grade, coverage }: { grade: number | null; coverage: number }) {
  if (grade === null) return <span className="grade-pill empty">Noch keine Note</span>;
  const complete = coverage >= 99.5;
  return (
    <span className={"grade-pill " + (grade >= 4 ? "pass" : "fail")}>
      {grade.toFixed(2)} · {complete ? (grade >= 4 ? "bestanden" : "unter 4.0") : "Zwischenstand"}
    </span>
  );
}

function ModuleResult({ module }: { module: IctModule }) {
  return (
    <div className="catalog-result-card">
      <div>
        <span className="module-number">M{module.number}</span>
        <strong>{module.title}</strong>
        <small>{module.field}{module.version ? " · Version " + module.version : ""}</small>
      </div>
      <p>{module.summary || "Modul aus dem ICT-Modulbaukasten."}</p>
      <div className="topic-chips">{module.topics.map(topic => <span key={topic}>{topic}</span>)}</div>
      <a href={officialModuleUrl(module)} target="_blank" rel="noreferrer">Im offiziellen Modulbaukasten öffnen ↗</a>
    </div>
  );
}

export default function ModuleHub({
  data,
  setData,
  onClose,
  onOpenCourse,
  onCreateCourseFromModule,
  onCreateTemplateNote
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  onClose: () => void;
  onOpenCourse: (course: Course) => void;
  onCreateCourseFromModule: (module: IctModule) => void;
  onCreateTemplateNote: (courseId: string, title: string, html: string) => void;
}) {
  const [tab, setTab] = useState<"catalog" | "grades" | "templates">("catalog");
  const [moduleQuery, setModuleQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<IctModule | null>(null);
  const [templateCourseId, setTemplateCourseId] = useState(data.selectedCourseId ?? data.courses[0]?.id ?? "");
  const profileId = data.settings.educationProfileId || "informatik-ae";

  const exact = moduleQuery.trim() ? findIctModule(moduleQuery, profileId) : undefined;
  const modules = useMemo(() => {
    const q = moduleQuery.trim().toLocaleLowerCase("de-CH");
    const ordered = modulesForProfile(profileId);
    if (!q) return ordered.slice(0, 28);
    const normalized = normalizeModuleNumber(q);
    return ordered.filter(module =>
      module.number.toLowerCase().includes(normalized.toLowerCase()) ||
      module.title.toLocaleLowerCase("de-CH").includes(q) ||
      module.topics.some(topic => topic.toLocaleLowerCase("de-CH").includes(q))
    ).slice(0, 28);
  }, [moduleQuery, profileId]);

  const overall = overallCourseAverage(data.courses);

  const patchCourse = (courseId: string, patch: Partial<Course>) => {
    setData(current => ({
      ...current,
      courses: current.courses.map(course => course.id === courseId ? { ...course, ...patch } : course)
    }));
  };

  const addAssessment = (course: Course) => {
    const next: CourseAssessment = {
      id: crypto.randomUUID(),
      title: "Leistungsbeurteilung " + ((course.assessments?.length ?? 0) + 1),
      topic: "",
      weight: course.assessments?.length ? 0 : 100,
      grade: null
    };
    patchCourse(course.id, { assessments: [...(course.assessments ?? []), next] });
  };

  const patchAssessment = (course: Course, assessmentId: string, patch: Partial<CourseAssessment>) => {
    patchCourse(course.id, {
      assessments: (course.assessments ?? []).map(item => item.id === assessmentId ? { ...item, ...patch } : item)
    });
  };

  const removeAssessment = (course: Course, assessmentId: string) => {
    patchCourse(course.id, { assessments: (course.assessments ?? []).filter(item => item.id !== assessmentId) });
  };

  return (
    <div className="module-hub-backdrop">
      <section className="module-hub">
        <header className="module-hub-header">
          <div>
            <span className="eyebrow">ICT Modulbaukasten</span>
            <h1>Module, Prüfungen & Noten</h1>
            <p>Modulnummer eingeben, ÜK erkennen lassen und deinen Lern- sowie Notenstand an einem Ort behalten.</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={20}/></button>
        </header>

        <div className="module-hub-tabs">
          <button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}><LibraryBig size={16}/> Modulbaukasten</button>
          <button className={tab === "grades" ? "active" : ""} onClick={() => setTab("grades")}><Calculator size={16}/> Prüfungen & Noten</button>
          <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}><FilePlus2 size={16}/> Templates</button>
        </div>

        <div className="module-hub-body">
          {tab === "catalog" && (
            <div className="module-catalog-layout">
              <aside className="profile-panel">
                <label>Deine Ausbildung
                  <select
                    value={profileId}
                    onChange={event => setData(current => ({ ...current, settings: { ...current.settings, educationProfileId: event.target.value } }))}
                  >
                    {ICT_PROFILES.map(profile => <option key={profile.id} value={profile.id}>{profile.title}</option>)}
                  </select>
                </label>
                <div className="profile-summary">
                  <GraduationCap size={20}/>
                  <strong>{ICT_PROFILES.find(profile => profile.id === profileId)?.shortTitle}</strong>
                  <p>{ICT_PROFILES.find(profile => profile.id === profileId)?.description}</p>
                </div>
                <div className="source-note">
                  <BookOpen size={16}/>
                  <p>Modulnummern, Titel und Lernorientierung basieren auf dem öffentlichen Modulbaukasten von ICT-Berufsbildung Schweiz. Prüfungsaufteilung und Gewichtungen können je ÜK-Anbieter abweichen.</p>
                </div>
              </aside>

              <div className="catalog-main">
                <label className="module-search">
                  <Search size={18}/>
                  <input autoFocus value={moduleQuery} onChange={event => { setModuleQuery(event.target.value); setSelectedModule(null); }} placeholder="Modulnummer oder Begriff, z. B. 294"/>
                </label>

                {exact && (
                  <div className="recognized-module">
                    <div>
                      <span>Erkannt</span>
                      <h2>M{exact.number} · {exact.title}</h2>
                      <p>{exact.summary || exact.field}</p>
                    </div>
                    <button className="primary" onClick={() => onCreateCourseFromModule(exact)}><Plus size={16}/> Als ÜK hinzufügen</button>
                  </div>
                )}

                {selectedModule ? (
                  <>
                    <button className="back-link" onClick={() => setSelectedModule(null)}>← Zur Übersicht</button>
                    <ModuleResult module={selectedModule}/>
                    <button className="primary" onClick={() => onCreateCourseFromModule(selectedModule)}><Plus size={16}/> Als ÜK hinzufügen</button>
                  </>
                ) : (
                  <div className="catalog-grid">
                    {modules.map(module => {
                      const preferred = module.profiles.includes(profileId as never);
                      const exists = data.courses.some(course => normalizeModuleNumber(course.number) === module.number);
                      return (
                        <button key={module.number + module.title} className={"catalog-module-card " + (preferred ? "profile-match" : "")} onClick={() => setSelectedModule(module)}>
                          <span className="module-number">M{module.number}</span>
                          <strong>{module.title}</strong>
                          <small>{module.field}</small>
                          <div className="catalog-card-footer"><span>{preferred ? "Passt zu deinem Profil" : "Weiteres ICT-Modul"}</span>{exists ? <CheckCircle2 size={15}/> : <ChevronRight size={15}/>}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "grades" && (
            <div className="grades-page">
              <section className="grade-overview">
                <div>
                  <span>Ø ÜK-Note</span>
                  <strong>{overall === null ? "–" : overall.toFixed(2)}</strong>
                  <small>{overall === null ? "Noch keine Noten erfasst" : overall >= 4 ? "Aktueller Durchschnitt ≥ 4.0" : "Aktueller Durchschnitt < 4.0"}</small>
                </div>
                <p>Der Durchschnitt wird aus den aktuell berechneten Modulnoten deiner ÜKs gebildet. Innerhalb eines Moduls werden deine eingetragenen Leistungsbeurteilungen nach Prozent gewichtet.</p>
              </section>

              <div className="grade-course-list">
                {data.courses.map(course => {
                  const result = courseGrade(course);
                  const weightTotal = (course.assessments ?? []).reduce((sum, item) => sum + item.weight, 0);
                  return (
                    <article className="grade-course-card" key={course.id}>
                      <header>
                        <button onClick={() => onOpenCourse(course)}><span>{course.number}</span><strong>{course.title}</strong></button>
                        <GradePill grade={result.grade} coverage={result.coverage}/>
                      </header>

                      {(course.assessments ?? []).map(assessment => (
                        <div className="assessment-row" key={assessment.id}>
                          <input value={assessment.title} onChange={event => patchAssessment(course, assessment.id, { title: event.target.value })} placeholder="Test / Projekt"/>
                          <input value={assessment.topic} onChange={event => patchAssessment(course, assessment.id, { topic: event.target.value })} placeholder="Was kommt dran?"/>
                          <label><input type="number" min="0" max="100" step="1" value={assessment.weight} onChange={event => patchAssessment(course, assessment.id, { weight: Math.max(0, numberValue(event.target.value) ?? 0) })}/><span>%</span></label>
                          <input className="grade-input" type="number" min="1" max="6" step="0.1" value={assessment.grade ?? ""} onChange={event => patchAssessment(course, assessment.id, { grade: event.target.value === "" ? null : Math.min(6, Math.max(1, numberValue(event.target.value) ?? 1)) })} placeholder="Note"/>
                          <button className="icon-button danger-soft" title="Leistungsbeurteilung löschen" onClick={() => removeAssessment(course, assessment.id)}><Trash2 size={15}/></button>
                        </div>
                      ))}

                      <footer>
                        <button className="secondary" onClick={() => addAssessment(course)}><Plus size={15}/> Test / Projekt hinzufügen</button>
                        <span className={Math.abs(weightTotal - 100) < 0.01 ? "weight-ok" : "weight-warning"}>
                          {Math.abs(weightTotal - 100) < 0.01 ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>}
                          Gewichtung: {weightTotal}%
                        </span>
                      </footer>
                    </article>
                  );
                })}
                {!data.courses.length && <div className="module-empty"><p>Noch keine ÜKs vorhanden.</p></div>}
              </div>
            </div>
          )}

          {tab === "templates" && (
            <div className="templates-page">
              <div className="template-toolbar">
                <div>
                  <h2>Notiz-Templates</h2>
                  <p>Wähle ein Template und erstelle direkt eine strukturierte Notiz in deinem ÜK.</p>
                </div>
                <label>ÜK
                  <select value={templateCourseId} onChange={event => setTemplateCourseId(event.target.value)}>
                    <option value="">ÜK auswählen…</option>
                    {data.courses.map(course => <option key={course.id} value={course.id}>{course.number} · {course.title}</option>)}
                  </select>
                </label>
              </div>

              <div className="template-grid">
                {NOTE_TEMPLATES.map(template => (
                  <article className="template-card" key={template.id}>
                    <div><FilePlus2 size={20}/><span>Template</span></div>
                    <h3>{template.title}</h3>
                    <p>{template.description}</p>
                    <button className="primary" disabled={!templateCourseId} onClick={() => onCreateTemplateNote(templateCourseId, template.title, template.html)}>Als Notiz erstellen</button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
