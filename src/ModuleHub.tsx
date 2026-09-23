import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BookOpen, Calculator, CheckCircle2, ChevronRight, CircleAlert, FilePlus2, GraduationCap, LibraryBig, Plus, Search, Trash2, X } from "lucide-react";
import { ICT_PROFILES, NOTE_TEMPLATES, UEK_PROFILE_PATHS, findIctModule, modulesForProfile, normalizeModuleNumber, officialModuleUrl, type IctModule, type ProfileId } from "./moduleCatalog";
import { fetchOfficialModuleBundle } from "./officialModuleData";
import type { AppData, Course, CourseAssessment } from "./types";

function numberValue(value: string): number | null {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function localAssessmentWeight(course: Course): number {
  return Math.min(20, (course.assessments ?? [])
    .filter(item => item.source === "local")
    .reduce((sum, item) => sum + Math.max(0, item.weight), 0));
}

export function effectiveAssessmentWeight(course: Course, assessment: CourseAssessment): number {
  if (course.isCustom) return Math.max(0, assessment.weight);

  const assessments = course.assessments ?? [];
  if (assessment.source === "local") {
    const rawLocalTotal = assessments
      .filter(item => item.source === "local")
      .reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (rawLocalTotal <= 0) return 0;
    const allowedLocalTotal = Math.min(20, rawLocalTotal);
    return Math.max(0, assessment.weight) / rawLocalTotal * allowedLocalTotal;
  }

  const officialTotal = assessments
    .filter(item => item.source === "official" || item.locked)
    .reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (officialTotal <= 0) return 0;

  const officialShare = 100 - localAssessmentWeight(course);
  return Math.max(0, assessment.weight) / officialTotal * officialShare;
}

export function courseGrade(course: Course): { grade: number | null; coverage: number } {
  const assessments = course.assessments ?? [];
  const graded = assessments.filter(item => item.grade !== null && item.grade !== undefined);
  if (!graded.length) return { grade: null, coverage: 0 };

  const weighted = graded.reduce((sum, item) => {
    const weight = effectiveAssessmentWeight(course, item);
    return sum + (item.grade ?? 0) * weight;
  }, 0);
  const coveredWeight = graded.reduce((sum, item) => sum + effectiveAssessmentWeight(course, item), 0);
  if (coveredWeight <= 0) return { grade: null, coverage: 0 };

  return { grade: weighted / coveredWeight, coverage: Math.min(100, coveredWeight) };
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
  const variants = module.assessmentVariants ?? [];
  return (
    <div className="catalog-result-card">
      <div>
        <span className="module-number">M{module.number}</span>
        <strong>{module.title}</strong>
        <small>{module.field}{module.version ? " · Version " + module.version : ""}</small>
      </div>

      {(module.competence || module.summary) && (
        <section className="catalog-detail-section">
          <h3>Kompetenz</h3>
          <p>{module.competence || module.summary}</p>
        </section>
      )}

      {module.object && (
        <section className="catalog-detail-section">
          <h3>Objekt</h3>
          <p>{module.object}</p>
        </section>
      )}

      {!!module.actionGoals?.length && (
        <section className="catalog-detail-section">
          <h3>Handlungsziele</h3>
          <ol>{module.actionGoals.map((goal, index) => <li key={index}>{goal}</li>)}</ol>
        </section>
      )}

      {!!module.knowledge?.length && (
        <section className="catalog-detail-section">
          <h3>Handlungsnotwendige Kenntnisse</h3>
          <ul>{module.knowledge.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>
      )}

      {!module.knowledge?.length && (
        <div className="topic-chips">{module.topics.map(topic => <span key={topic}>{topic}</span>)}</div>
      )}

      {!!variants.length && (
        <section className="catalog-detail-section">
          <h3>Offizielle Leistungsbeurteilung</h3>
          {variants.map(variant => (
            <div className="lbv-preview" key={variant.id}>
              <strong>{variant.title}</strong>
              {variant.totalDuration && <small>Richtzeit {variant.totalDuration}</small>}
              {variant.assessments.map(assessment => (
                <div className="lbv-preview-row" key={assessment.id}>
                  <span>{assessment.title}</span>
                  <b>{assessment.weight}%</b>
                  <small>{assessment.topic}</small>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <a href={module.sourceUrl || officialModuleUrl(module)} target="_blank" rel="noreferrer">Im öffentlichen Modulbaukasten öffnen ↗</a>
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
  setData: Dispatch<SetStateAction<AppData>>;
  onClose: () => void;
  onOpenCourse: (course: Course) => void;
  onCreateCourseFromModule: (module: IctModule) => void | Promise<void>;
  onCreateTemplateNote: (courseId: string, title: string, html: string) => void;
}) {
  const [tab, setTab] = useState<"catalog" | "grades" | "templates">("catalog");
  const [moduleQuery, setModuleQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<IctModule | null>(null);
  const [selectedModuleLoading, setSelectedModuleLoading] = useState(false);
  const [remoteExact, setRemoteExact] = useState<IctModule | null>(null);
  const [remoteExactLoading, setRemoteExactLoading] = useState(false);
  const [templateCourseId, setTemplateCourseId] = useState(data.selectedCourseId ?? data.courses[0]?.id ?? "");
  const profileId = data.settings.educationProfileId || "informatik-ae";

  const exact = moduleQuery.trim() ? findIctModule(moduleQuery, profileId) : undefined;
  const normalizedQuery = normalizeModuleNumber(moduleQuery);

  useEffect(() => {
    setRemoteExact(null);
    if (!/^\d{2,4}[A-Z]?$/.test(normalizedQuery)) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setRemoteExactLoading(true);
      void fetchOfficialModuleBundle(normalizedQuery, exact)
        .then(official => {
          if (!cancelled && official) setRemoteExact(official);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setRemoteExactLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedQuery, profileId]);

  const resolvedExact = remoteExact ?? exact;
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

  const openModule = async (module: IctModule) => {
    setSelectedModule(module);
    setSelectedModuleLoading(true);
    try {
      const official = await fetchOfficialModuleBundle(module.number, module);
      if (official) setSelectedModule(official);
    } catch {
      // Static catalog data remains visible if the public source cannot be reached.
    } finally {
      setSelectedModuleLoading(false);
    }
  };

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
      grade: null,
      source: "custom"
    };
    patchCourse(course.id, { assessments: [...(course.assessments ?? []), next] });
  };

  const addLocalAssessment = (course: Course) => {
    const used = localAssessmentWeight(course);
    const remaining = Math.max(0, 20 - used);
    if (remaining <= 0) return;

    const next: CourseAssessment = {
      id: crypto.randomUUID(),
      title: "Lokaler Zusatznachweis",
      topic: "",
      weight: remaining,
      grade: null,
      source: "local",
      locked: false
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

  const selectAssessmentVariant = (course: Course, variantId: string) => {
    const variant = course.assessmentVariants?.find(item => item.id === variantId);
    if (!variant) return;

    const previous = course.assessments ?? [];
    const local = previous.filter(item => item.source === "local");
    const official = variant.assessments.map(assessment => {
      const old = previous.find(item => item.id === assessment.id || item.title === assessment.title);
      return { ...assessment, grade: old?.grade ?? null };
    });

    patchCourse(course.id, {
      assessmentVariantId: variant.id,
      assessments: [...official, ...local]
    });
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
                {UEK_PROFILE_PATHS[profileId as ProfileId] && (
                  <div className="profile-uek-path">
                    <strong>{UEK_PROFILE_PATHS[profileId as ProfileId]?.label}</strong>
                    {UEK_PROFILE_PATHS[profileId as ProfileId]?.years.map(year => (
                      <div key={year.year}>
                        <span>{year.year}. Lehrjahr</span>
                        <div>{year.moduleNumbers.map(number => <b key={number}>M{number}</b>)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="source-note">
                  <BookOpen size={16}/>
                  <p>Die App lädt Kompetenz, Objekt, Handlungsziele, Kenntnisse sowie veröffentlichte LBV-Varianten direkt aus dem öffentlichen ICT-Modulbaukasten und speichert sie im ÜK.</p>
                </div>
              </aside>

              <div className="catalog-main">
                <label className="module-search">
                  <Search size={18}/>
                  <input autoFocus value={moduleQuery} onChange={event => { setModuleQuery(event.target.value); setSelectedModule(null); }} placeholder="Modulnummer oder Begriff, z. B. 294"/>
                </label>

                {resolvedExact && (
                  <div className="recognized-module">
                    <div>
                      <span>Erkannt</span>
                      <h2>M{resolvedExact.number} · {resolvedExact.title}</h2>
                      <p>{resolvedExact.summary || resolvedExact.field}</p>
                    </div>
                    <button className="primary" disabled={remoteExactLoading} onClick={() => void onCreateCourseFromModule(resolvedExact)}><Plus size={16}/> {remoteExactLoading ? "Offizielle Daten laden…" : "Komplett als ÜK hinzufügen"}</button>
                  </div>
                )}

                {selectedModule ? (
                  <>
                    <button className="back-link" onClick={() => setSelectedModule(null)}>← Zur Übersicht</button>
                    <ModuleResult module={selectedModule}/>
                    <button className="primary" disabled={selectedModuleLoading} onClick={() => void onCreateCourseFromModule(selectedModule)}><Plus size={16}/> {selectedModuleLoading ? "Offizielle Daten laden…" : "Komplett als ÜK hinzufügen"}</button>
                  </>
                ) : (
                  <div className="catalog-grid">
                    {modules.map(module => {
                      const preferred = module.profiles.includes(profileId as ProfileId);
                      const exists = data.courses.some(course => normalizeModuleNumber(course.number) === module.number);
                      return (
                        <button key={module.number + module.title} className={"catalog-module-card " + (preferred ? "profile-match" : "")} onClick={() => void openModule(module)}>
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
                  const weightTotal = (course.assessments ?? []).reduce((sum, item) => sum + effectiveAssessmentWeight(course, item), 0);\n                  const localWeight = localAssessmentWeight(course);\n                  const rawOfficialWeight = (course.assessments ?? []).filter(item => item.source === "official" || item.locked).reduce((sum, item) => sum + item.weight, 0);
                  const activeVariant = course.assessmentVariants?.find(variant => variant.id === course.assessmentVariantId)
                    ?? course.assessmentVariants?.[0];
                  return (
                    <article className="grade-course-card" key={course.id}>
                      <header>
                        <button onClick={() => onOpenCourse(course)}><span>{course.number}</span><strong>{course.title}</strong></button>
                        <GradePill grade={result.grade} coverage={result.coverage}/>
                      </header>

                      {!course.isCustom && (course.assessmentVariants?.length ?? 0) > 1 && (
                        <div className="official-variant-row">
                          <label>Offizielle LBV
                            <select value={course.assessmentVariantId ?? course.assessmentVariants?.[0]?.id ?? ""} onChange={event => selectAssessmentVariant(course, event.target.value)}>
                              {course.assessmentVariants?.map(variant => (
                                <option key={variant.id} value={variant.id}>
                                  {variant.title}
                                  {variant.learningLocations?.length ? " · " + variant.learningLocations.join(", ") : ""}
                                  {variant.totalDuration ? " · " + variant.totalDuration : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                          <span>Wähle die offizielle Variante, die dein ÜK-Anbieter verwendet.</span>
                        </div>
                      )}

                      {!course.isCustom && activeVariant && (
                        <div className="lbv-source-row">
                          <div>
                            <strong>{activeVariant.title}</strong>
                            {!!activeVariant.learningLocations?.length && <span>Lernort: {activeVariant.learningLocations.join(", ")}</span>}
                            {activeVariant.totalDuration && <span>Richtzeit: {activeVariant.totalDuration}</span>}
                          </div>
                          {activeVariant.sourceUrl && <a href={activeVariant.sourceUrl} target="_blank" rel="noreferrer">Offizielle LBV öffnen ↗</a>}
                        </div>
                      )}

                      {!!(course.assessments ?? []).length && (
                        <div className="assessment-head">
                          <span>Leistungsnachweis</span>
                          <span>Prüfungsstoff</span>
                          <span>Gewichtung</span>
                          <span>Deine Note</span>
                          <span></span>
                        </div>
                      )}

                      {(course.assessments ?? []).map(assessment => (
                        <div className={"assessment-row " + (assessment.locked ? "official-assessment" : assessment.source === "local" ? "local-assessment" : "")} key={assessment.id}>
                          <input
                            value={assessment.title}
                            readOnly={assessment.locked}
                            onChange={event => !assessment.locked && patchAssessment(course, assessment.id, { title: event.target.value })}
                            placeholder="Test / Projekt"
                          />
                          <input
                            value={assessment.topic}
                            readOnly={assessment.locked}
                            onChange={event => !assessment.locked && patchAssessment(course, assessment.id, { topic: event.target.value })}
                            placeholder="Was kommt dran?"
                            title={assessment.topic}
                          />
                          <label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={assessment.weight}
                              readOnly={assessment.locked}
                              onChange={event => !assessment.locked && patchAssessment(course, assessment.id, { weight: Math.min(assessment.source === "local" ? 20 : 100, Math.max(0, numberValue(event.target.value) ?? 0)) })}
                            />
                            <span>%</span>
                          </label>
                          <input
                            className="grade-input"
                            type="number"
                            min="1"
                            max="6"
                            step="0.1"
                            value={assessment.grade ?? ""}
                            onChange={event => patchAssessment(course, assessment.id, { grade: event.target.value === "" ? null : Math.min(6, Math.max(1, numberValue(event.target.value) ?? 1)) })}
                            placeholder="1.0–6.0"
                            aria-label={"Deine Note für " + assessment.title}
                            title="Deine Note eintragen"
                          />
                          {assessment.locked
                            ? <span className="official-lock" title="Offizielle LBV">fix</span>
                            : <button className="icon-button danger-soft" title="Leistungsbeurteilung löschen" onClick={() => removeAssessment(course, assessment.id)}><Trash2 size={15}/></button>}
                          {assessment.locked && (assessment.format || assessment.duration || assessment.criteria?.length) && (
                            <div className="assessment-official-details">
                              {[assessment.format, assessment.duration].filter(Boolean).join(" · ")}
                              {assessment.aids ? " · Hilfsmittel: " + assessment.aids : ""}
                              {!!assessment.criteria?.length && (
                                <ul>{assessment.criteria.map((criterion, index) => <li key={index}>{criterion.title}{criterion.weight ? " (" + criterion.weight + ")" : ""}</li>)}</ul>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {!course.isCustom && !(course.assessments?.length) && (
                        <div className="official-assessment-missing">
                          Für dieses Modul konnte aus der öffentlichen Quelle momentan keine LBV geladen werden.
                        </div>
                      )}

                      <footer>
                        <div className="grade-footer-actions">
                          {course.isCustom
                            ? <button className="secondary" onClick={() => addAssessment(course)}><Plus size={15}/> Test / Projekt hinzufügen</button>
                            : <>
                                <span className="official-lbv-badge"><CheckCircle2 size={14}/> Offizielle LBV bleibt unverändert</span>
                                {localWeight < 20 && <button className="secondary" onClick={() => addLocalAssessment(course)}><Plus size={15}/> Lokaler Zusatznachweis</button>}
                              </>}
                        </div>
                        <div className="grade-weight-summary">
                          {!course.isCustom && <small>Offizieller Anteil: {(100 - localWeight).toFixed(0)}%{localWeight > 0 ? " · Lokal: " + localWeight.toFixed(0) + "%" : ""}</small>}
                          {!course.isCustom && rawOfficialWeight > 0 && Math.abs(rawOfficialWeight - 100) >= 0.01 && <small className="weight-warning">Geladene LBV-Rohgewichtung: {rawOfficialWeight}%</small>}
                          <span className={Math.abs(weightTotal - 100) < 0.01 ? "weight-ok" : "weight-warning"}>
                            {Math.abs(weightTotal - 100) < 0.01 ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>}
                            Finale Gewichtung: {weightTotal.toFixed(0)}%
                          </span>
                        </div>
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
