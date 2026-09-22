
import { invoke } from "@tauri-apps/api/core";

export type AiAction = "summary" | "explain" | "improve" | "quiz";

export type AiChatAction =
  | { type: "create_course"; number?: string; title: string }
  | { type: "create_note"; courseId?: string; title: string; content: string; tags?: string[] }
  | { type: "replace_note"; noteId?: string; title?: string; content: string }
  | { type: "update_note"; noteId?: string; title?: string; content?: string };

export type AiChatResult = {
  reply: string;
  actions: AiChatAction[];
};

const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"] as const;

const prompts: Record<AiAction, string> = {
  summary: "Fasse die folgende ÜK-Notiz klar und kompakt auf Deutsch zusammen. Nutze kurze Abschnitte und Stichpunkte.",
  explain: "Erkläre den Inhalt der folgenden ÜK-Notiz einfach, fachlich korrekt und mit einem praktischen Beispiel.",
  improve: "Überarbeite die folgende ÜK-Notiz sprachlich und strukturell. Bewahre alle Fakten, entferne Wiederholungen. GIB AUSSCHLIESSLICH den verbesserten Text zurück. Keine Einleitung, keine Erklärung, kein Markdown-Codeblock und keine Anführungszeichen.",
  quiz: "Erstelle aus der folgenden ÜK-Notiz fünf Lernfragen mit den Antworten darunter. Antworte auf Deutsch."
};

async function callViaFetch(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  let lastError = "Verbindung fehlgeschlagen";

  for (const model of GROQ_MODELS) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey.trim()
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (response.ok) {
      const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content?.trim() || "Keine Antwort von der KI erhalten.";
    }

    const errText = await response.text().catch(() => "");
    lastError = errText.slice(0, 320) || "Verbindung fehlgeschlagen";

    if (response.status === 401) {
      throw new Error("Der Groq API-Key ist ungültig. Bitte prüfe den Schlüssel in den Einstellungen.");
    }

    if (response.status === 429) {
      throw new Error("Das Groq-Limit ist gerade erreicht. Bitte versuche es später erneut.");
    }

    const permissionBlocked =
      response.status === 403 &&
      /model_permission_blocked|blocked at the (organization|project) level|model.*blocked/i.test(errText);

    if (!permissionBlocked || model === GROQ_MODELS[GROQ_MODELS.length - 1]) {
      throw new Error("Groq Fehler (" + response.status + "): " + lastError);
    }
  }

  throw new Error("Groq Fehler: " + lastError);
}

async function callAi(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  if (!apiKey.trim()) throw new Error("Bitte trage zuerst deinen Groq API-Key in den Einstellungen ein.");

  if ("__TAURI_INTERNALS__" in window) {
    try {
      return await invoke<string>("groq_chat", {
        apiKey: apiKey.trim(),
        systemPrompt,
        userPrompt
      });
    } catch (rustErr) {
      console.warn("Tauri invoke groq_chat fehlgeschlagen, versuche direkten HTTPS Fetch Fallback:", rustErr);
      return await callViaFetch(apiKey, systemPrompt, userPrompt);
    }
  }

  return await callViaFetch(apiKey, systemPrompt, userPrompt);
}

export async function askGroq(apiKey: string, action: AiAction, html: string): Promise<string> {
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
  if (!text) throw new Error("Die Notiz ist leer. Schreibe zuerst etwas Inhalt in deine Notiz.");

  const systemPrompt = "Du bist ein hilfreicher Lernassistent für Schweizer ÜK-Lernende. Antworte präzise und ohne erfundene Fakten.";
  return callAi(apiKey, systemPrompt, prompts[action] + "\n\n" + text);
}

function parseChatJson(raw: string): AiChatResult {
  const cleaned = raw
    .trim()
    .replace(/^\\`\\`\\`json\\s*/i, "")
    .replace(/^\\`\\`\\`\\s*/i, "")
    .replace(/\\s*\\`\\`\\`$/i, "");

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

export async function askGroqChat(
  apiKey: string,
  message: string,
  context: {
    currentCourse: string;
    currentNote: string;
    courses: Array<{ id: string; number: string; title: string }>;
    notes: Array<{ id: string; courseId: string; title: string; content: string }>;
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
    '{ "type": "replace_note", "noteId": "aktuelle-id", "content": "neuer kompletter Text", "title": "optional" }',
    '{ "type": "update_note", "noteId": "aktuelle-id", "title": "optional", "content": "optional" }',
    "",
    "Für create_course: Wenn die Person keine Nummer nennt, darfst du ÜK als Nummer verwenden und einen passenden Titel wählen.",
    "Für create_note: Wenn ein aktueller ÜK existiert und kein anderer genannt wird, verwende courseId current.",
    "Wenn du zuerst einen ÜK erstellst und danach darin eine Notiz erstellst, verwende für die Notiz courseId newest_created.",
    "Für replace_note muss content immer der komplette Ersatztext sein, nicht nur Änderungen.",
    "Für create_note, replace_note und update_note: content ist reiner, sauberer Notiztext für den Editor. KEIN Markdown. Keine **Fettschrift**, keine *Kursivschrift*, keine # Überschriften, keine Codeblöcke und keine Markdown-Trennlinien.",
    "Nutze normale Absätze. Für Stichpunkte verwende Zeilen mit '- '. Für nummerierte Schritte verwende '1. ', '2. ', '3. ' usw.",
    "Keine Backslashes vor Satzzeichen. Keine Einleitung oder Erklärung ausserhalb des eigentlichen Notiztexts.",
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

  const raw = await callAi(apiKey, systemPrompt, message);
  try {
    return parseChatJson(raw);
  } catch {
    return {
      reply: raw.trim() || "Die KI hat keine verwertbare Antwort geliefert.",
      actions: []
    };
  }
}
