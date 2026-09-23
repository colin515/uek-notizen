import { invoke } from "@tauri-apps/api/core";
import { aiProviderDefinition } from "./aiProviders";
import type { AiProvider } from "./types";

export type AiAction = "summary" | "explain" | "improve" | "quiz";

export type AiChatAction =
  | { type: "create_course"; number?: string; title: string }
  | { type: "create_note"; courseId?: string | null; title: string; content: string; tags?: string[] }
  | { type: "replace_note"; noteId?: string; title?: string; content: string }
  | { type: "update_note"; noteId?: string; title?: string; content?: string };

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
    if (action.type === "create_note") return typeof action.title === "string" && typeof action.content === "string";
    if (action.type === "replace_note") return typeof action.content === "string";
    if (action.type === "update_note") return typeof action.title === "string" || typeof action.content === "string";
    return false;
  }) as AiChatAction[];

  return {
    reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "Erledigt.",
    actions: safeActions.slice(0, 8)
  };
}

export async function askAiChat(
  connection: AiConnection,
  message: string,
  context: {
    currentCourse: string;
    currentNote: string;
    courses: Array<{ id: string; number: string; title: string }>;
    notes: Array<{ id: string; courseId: string | null; title: string; content: string }>;
  }
): Promise<AiChatResult> {
  const systemPrompt = [
    "Du bist die Steuerzentrale der Desktop-App ÜK Notizen für Schweizer Lernende.",
    "Du darfst nicht nur antworten: Du kannst über JSON-Aktionen direkt Änderungen in der App ausführen.",
    "Antworte IMMER mit genau einem JSON-Objekt und sonst nichts. Kein Markdown und kein Codeblock.",
    "",
    "Schema:",
    '{ "reply": "kurze Antwort für den Chat", "actions": [] }',
    "",
    "Erlaubte Aktionen:",
    '{ "type": "create_course", "number": "ÜK 123", "title": "Titel" }',
    '{ "type": "create_note", "courseId": "current", "title": "Titel", "content": "Notiztext", "tags": ["tag1"] }',
    '{ "type": "create_note", "courseId": "newest_created", "title": "Titel", "content": "Notiztext", "tags": [] }',
    '{ "type": "create_note", "courseId": "quick", "title": "Titel", "content": "Notiztext", "tags": [] }',
    '{ "type": "replace_note", "noteId": "aktuelle-id", "content": "neuer kompletter Text", "title": "optional" }',
    '{ "type": "update_note", "noteId": "aktuelle-id", "title": "optional", "content": "optional" }',
    "",
    "Für create_course: Wenn die Person keine Nummer nennt, darfst du ÜK als Nummer verwenden und einen passenden Titel wählen.",
    "Für create_note: Wenn ein aktueller ÜK existiert und kein anderer genannt wird, verwende courseId current.",
    "Wenn ausdrücklich eine Schnellnotiz, spontane Notiz oder Notiz ohne ÜK verlangt wird, verwende courseId quick.",
    "Wenn du zuerst einen ÜK erstellst und danach darin eine Notiz erstellst, verwende für die Notiz courseId newest_created.",
    "Für replace_note muss content immer der komplette Ersatztext sein, nicht nur Änderungen.",
    "Für create_note, replace_note und update_note: content ist reiner, sauberer Notiztext für den Editor. KEIN Markdown. Keine **Fettschrift**, keine *Kursivschrift*, keine # Überschriften, keine Codeblöcke und keine Markdown-Trennlinien.",
    "Nutze normale Absätze. Für Stichpunkte verwende Zeilen mit '- '. Für nummerierte Schritte verwende '1. ', '2. ', '3. ' usw.",
    "Keine Backslashes vor Satzzeichen. Keine Einleitung oder Erklärung ausserhalb des eigentlichen Notiztexts.",
    "Antworte im Chat kurz. Führe passende Aktionen aus, statt lange zu erklären, was du tun könntest.",
    "Bei Notizen nur klare, lernfreundliche Inhalte. Keine erfundenen Quellen oder Fakten.",
    "",
    "Aktueller Kontext:",
    context.currentCourse,
    context.currentNote,
    "ÜKs:",
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
