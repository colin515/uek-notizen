import { invoke } from "@tauri-apps/api/core";
import { aiProviderDefinition } from "./aiProviders";
import type { AiProvider } from "./types";
import { isAiEditorBlock, type AiEditorBlock } from "./aiEditorProtocol";

export type AiAction = "summary" | "explain" | "improve" | "quiz";

export type AiChatAction =
  | { type: "create_course"; number?: string; title: string }
  | { type: "rename_course"; courseId?: string; number?: string; title?: string }
  | { type: "create_note"; courseId?: string | null; title: string; content: string; tags?: string[] }
  | { type: "create_rich_note"; courseId?: string | null; title: string; blocks: AiEditorBlock[]; tags?: string[] }
  | { type: "replace_note"; noteId?: string; title?: string; content: string }
  | { type: "replace_note_blocks"; noteId?: string; title?: string; blocks: AiEditorBlock[] }
  | { type: "append_blocks"; noteId?: string; blocks: AiEditorBlock[] }
  | { type: "update_note"; noteId?: string; title?: string; content?: string }
  | { type: "move_note"; noteId?: string; courseId: string | null }
  | { type: "favorite_note"; noteId?: string; favorite: boolean }
  | { type: "archive_note"; noteId?: string; archived: boolean }
  | { type: "replace_selection"; content: string }
  | { type: "insert_blocks_at_selection"; blocks: AiEditorBlock[] }
  | { type: "set_grade"; courseId?: string; assessmentId?: string; assessmentTitle?: string; grade: number }
  | { type: "create_assessment"; courseId?: string; title: string; topic?: string; weight: number };

export type AiChatResult = {
  reply: string;
  actions: AiChatAction[];
};

export type AiConnection = {
  provider: AiProvider;
  model: string;
  apiKey: string;
};

const prompts: Record<AiAction, string> = {
  summary: "Fasse die folgende ÜK-Notiz klar und kompakt auf Deutsch zusammen. Nutze kurze Abschnitte und Stichpunkte.",
  explain: "Erkläre den Inhalt der folgenden ÜK-Notiz einfach, fachlich korrekt und mit einem praktischen Beispiel.",
  improve: "Überarbeite die folgende ÜK-Notiz sprachlich und strukturell. Bewahre alle Fakten, entferne Wiederholungen. GIB AUSSCHLIESSLICH den verbesserten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock und keine Anführungszeichen.",
  quiz: "Erstelle aus der folgenden ÜK-Notiz fünf Lernfragen mit den Antworten darunter. Antworte auf Deutsch."
};

function providerEndpoint(provider: AiProvider): string {
  if (provider === "openai") return "https://api.openai.com/v1/chat/completions";
  if (provider === "gemini") return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  return "https://api.groq.com/openai/v1/chat/completions";
}

function providerError(provider: AiProvider, status: number, details: string): Error {
  const label = aiProviderDefinition(provider).shortLabel;
  if (status === 401 || status === 403) {
    return new Error(label + ": API-Key ungültig oder ohne Berechtigung. Prüfe Key, Projekt und Modell.");
  }
  if (status === 429) {
    return new Error(label + ": Limit oder verfügbares Guthaben erreicht. Prüfe Kontingent und Abrechnung.");
  }
  return new Error(label + " Fehler (" + status + "): " + (details.slice(0, 320) || "Unbekannter Fehler"));
}

async function callViaFetch(
  connection: AiConnection,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(providerEndpoint(connection.provider), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + connection.apiKey.trim()
    },
    body: JSON.stringify({
      model: connection.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw providerError(connection.provider, response.status, details);
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  };
  const content = json.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content.map(item => item.text ?? "").join("").trim();
    if (joined) return joined;
  }
  throw new Error(aiProviderDefinition(connection.provider).shortLabel + " hat keine Textantwort geliefert.");
}

async function callAi(
  connection: AiConnection,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const provider = aiProviderDefinition(connection.provider);
  if (!connection.apiKey.trim()) {
    throw new Error("Bitte trage zuerst deinen " + provider.keyLabel + " in den Einstellungen ein.");
  }
  if (!connection.model.trim()) {
    throw new Error("Bitte wähle zuerst ein " + provider.shortLabel + "-Modell aus.");
  }

  if ("__TAURI_INTERNALS__" in window) {
    return await invoke<string>("ai_chat", {
      provider: connection.provider,
      apiKey: connection.apiKey.trim(),
      model: connection.model,
      systemPrompt,
      userPrompt
    });
  }

  return callViaFetch(connection, systemPrompt, userPrompt);
}

export async function testAiConnection(connection: AiConnection): Promise<string> {
  const reply = await callAi(
    connection,
    "Du bist ein Verbindungstest. Antworte kurz und ohne Markdown.",
    "Antworte exakt mit: Verbindung erfolgreich"
  );
  return reply;
}

export async function askAi(connection: AiConnection, action: AiAction, html: string): Promise<string> {
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
  if (!text) throw new Error("Die Notiz ist leer. Schreibe zuerst etwas Inhalt in deine Notiz.");

  const systemPrompt = "Du bist ein präziser Lernassistent für Schweizer ÜK-Lernende. Antworte auf Deutsch, strukturiert, knapp und fachlich korrekt. Erfinde keine Fakten und behalte wichtige technische Details bei.";
  return callAi(connection, systemPrompt, prompts[action] + "\n\n" + text);
}

function parseChatJson(raw: string): AiChatResult {
  const cleaned = raw
    .trim()
    .replace(/^\`\`\`json\s*/i, "")
    .replace(/^\`\`\`\s*/i, "")
    .replace(/\s*\`\`\`$/i, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  const parsed = JSON.parse(candidate) as Partial<AiChatResult>;
  const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const safeActions: AiChatAction[] = actions.filter(action => {
    if (!action || typeof action !== "object" || typeof action.type !== "string") return false;
    if (action.type === "create_course") return typeof action.title === "string";
    if (action.type === "rename_course") return typeof action.title === "string" || typeof action.number === "string";
    if (action.type === "create_note") return typeof action.title === "string" && typeof action.content === "string";
    if (action.type === "create_rich_note") {
      return typeof action.title === "string" && Array.isArray(action.blocks) && action.blocks.every(isAiEditorBlock);
    }
    if (action.type === "replace_note") return typeof action.content === "string";
    if (action.type === "replace_note_blocks" || action.type === "append_blocks" || action.type === "insert_blocks_at_selection") {
      return Array.isArray(action.blocks) && action.blocks.every(isAiEditorBlock);
    }
    if (action.type === "update_note") return typeof action.title === "string" || typeof action.content === "string";
    if (action.type === "move_note") return action.courseId === null || typeof action.courseId === "string";
    if (action.type === "favorite_note") return typeof action.favorite === "boolean";
    if (action.type === "archive_note") return typeof action.archived === "boolean";
    if (action.type === "replace_selection") return typeof action.content === "string";
    if (action.type === "set_grade") return typeof action.grade === "number" && Number.isFinite(action.grade);
    if (action.type === "create_assessment") {
      return typeof action.title === "string" && typeof action.weight === "number" && Number.isFinite(action.weight);
    }
    return false;
  }) as AiChatAction[];

  return {
    reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "Erledigt.",
    actions: safeActions.slice(0, 32)
  };
}

export async function askAiChat(
  connection: AiConnection,
  message: string,
  context: {
    currentCourse: string;
    currentNote: string;
    selectedText?: string;
    courses: Array<{
      id: string;
      number: string;
      title: string;
      assessments?: Array<{ id: string; title: string; weight: number; grade: number | null }>;
    }>;
    notes: Array<{ id: string; courseId: string | null; title: string; content: string }>;
  }
): Promise<AiChatResult> {
  const systemPrompt = [
    "Du bist die Steuerzentrale der Desktop-App ÜK Notizen für Schweizer Lernende.",
    "Du arbeitest mit einem TEXTMODELL. Du erzeugst niemals Bilder. Visuelle Inhalte wie Tabellen oder Flowcharts entstehen ausschliesslich über die unten definierten JSON-Befehle und werden von der App lokal gerendert.",
    "Antworte IMMER mit genau einem JSON-Objekt und sonst nichts. Kein Markdown und kein Codeblock um das JSON.",
    "",
    "Schema:",
    '{ "reply": "kurze Antwort für den Chat", "actions": [] }',
    "",
    "Du darfst viele actions in einem einzigen Prompt zurückgeben. Wenn die Person z.B. einen ÜK mit 6 Dokumenten verlangt, erstelle den ÜK und danach 6 create_rich_note-Aktionen. Erledige den Auftrag vollständig statt nur einen Teil vorzubereiten.",
    "",
    "Kurs-Aktionen:",
    '{ "type": "create_course", "number": "294", "title": "Frontend einer interaktiven Webapplikation realisieren" }',
    '{ "type": "rename_course", "courseId": "id oder current", "number": "optional", "title": "optional" }',
    "",
    "Notiz-Aktionen:",
    '{ "type": "create_note", "courseId": "current | newest_created | quick | konkrete-id", "title": "Titel", "content": "reiner Text", "tags": [] }',
    '{ "type": "create_rich_note", "courseId": "current | newest_created | quick | konkrete-id", "title": "Titel", "blocks": [], "tags": [] }',
    '{ "type": "replace_note", "noteId": "optional, sonst aktuell", "content": "kompletter reiner Text", "title": "optional" }',
    '{ "type": "replace_note_blocks", "noteId": "optional", "title": "optional", "blocks": [] }',
    '{ "type": "append_blocks", "noteId": "optional", "blocks": [] }',
    '{ "type": "update_note", "noteId": "optional", "title": "optional", "content": "optional" }',
    '{ "type": "move_note", "noteId": "optional", "courseId": "konkrete-id oder null" }',
    '{ "type": "favorite_note", "noteId": "optional", "favorite": true }',
    '{ "type": "archive_note", "noteId": "optional", "archived": true }',
    "",
    "Auswahl-Aktionen (nur wenn unten AUSGEWÄHLTER TEXT vorhanden ist):",
    '{ "type": "replace_selection", "content": "neuer reiner Text" }',
    '{ "type": "insert_blocks_at_selection", "blocks": [] }',
    "",
    "Noten-Aktionen:",
    '{ "type": "set_grade", "courseId": "optional/current", "assessmentId": "wenn bekannt", "assessmentTitle": "alternativ Titel", "grade": 5.2 }',
    '{ "type": "create_assessment", "courseId": "optional/current", "title": "Projekt", "topic": "Thema", "weight": 40 }',
    "create_assessment ist nur für Custom-ÜKs gedacht. Offizielle LBV-Gewichtungen dürfen niemals erfunden oder überschrieben werden.",
    "",
    "Rich-Block-Protokoll für blocks:",
    '{ "type": "paragraph", "text": "Text" }',
    '{ "type": "heading", "level": 2, "text": "Titel" }',
    '{ "type": "bullet_list", "items": ["A", "B"] }',
    '{ "type": "number_list", "items": ["A", "B"] }',
    '{ "type": "checklist", "items": ["Aufgabe"] }',
    '{ "type": "quote", "text": "Zitat" }',
    '{ "type": "info", "text": "Wichtiger Hinweis" }',
    '{ "type": "code", "language": "javascript", "code": "const x = 1;" }',
    '{ "type": "table", "header": true, "rows": [["Spalte A","Spalte B"],["Wert","Wert"]] }',
    '{ "type": "divider" }',
    '{ "type": "flowchart", "title": "Ablauf", "nodes": [{"key":"start","text":"Start"},{"key":"api","text":"API aufrufen"}], "edges": [{"from":"start","to":"api"}] }',
    "",
    "Für strukturierte Lernnotizen bevorzugst du create_rich_note und die Blocktypen. Nutze Tabellen für Vergleiche, Codeblöcke für echten Code und Flowcharts nur für Abläufe/Prozesse.",
    "Für create_course: Wenn eine offizielle ICT-Modulnummer genannt wird, übernimm sie. Die App reichert den ÜK danach automatisch mit offiziellen Moduldaten an.",
    "Für create_note/create_rich_note: Wenn ein aktueller ÜK existiert und kein anderer genannt wird, verwende courseId current.",
    "Wenn ausdrücklich eine Schnellnotiz verlangt wird, verwende courseId quick.",
    "Wenn du zuerst einen ÜK erstellst und danach Notizen darin erstellst, verwende courseId newest_created.",
    "Erfinde keine offiziellen Prüfungselemente oder Gewichtungen. Nutze nur die Assessment-Daten im Kontext.",
    "Wenn die Person mehrere Dokumente verlangt, erstelle mehrere Aktionen in derselben Antwort.",
    "Wenn die Person nur eine Erklärung fragt, antworte in reply und lasse actions leer.",
    "Antworte im Chat kurz. Führe passende Aktionen aus, statt lang zu erklären, was du tun könntest.",
    "Keine erfundenen Quellen oder Fakten.",
    "",
    "Aktueller Kontext:",
    context.currentCourse,
    context.currentNote,
    context.selectedText ? "AUSGEWÄHLTER TEXT:\n" + context.selectedText : "AUSGEWÄHLTER TEXT: keiner",
    "ÜKs inkl. Leistungsbeurteilungen:",
    JSON.stringify(context.courses),
    "Notizen:",
    JSON.stringify(context.notes),
    "",
    "Auftrag der Person:",
    message
  ].join("\n");

  const raw = await callAi(connection, systemPrompt, message);
  try {
    return parseChatJson(raw);
  } catch {
    return {
      reply: raw.trim() || "Die KI hat keine verwertbare Antwort geliefert.",
      actions: []
    };
  }
}
