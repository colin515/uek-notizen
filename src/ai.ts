import { invoke } from "@tauri-apps/api/core";

type AiAction = "summary" | "explain" | "improve" | "quiz";

const GROQ_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"] as const;

const prompts: Record<AiAction, string> = {
  summary: "Fasse die folgende ÜK-Notiz klar und kompakt auf Deutsch zusammen. Nutze kurze Abschnitte und Stichpunkte.",
  explain: "Erkläre den Inhalt der folgenden ÜK-Notiz einfach, fachlich korrekt und mit einem praktischen Beispiel.",
  improve: "Überarbeite die folgende ÜK-Notiz sprachlich und strukturell. Bewahre alle Fakten, entferne Wiederholungen und gib nur die verbesserte Notiz zurück.",
  quiz: "Erstelle aus der folgenden ÜK-Notiz fünf Lernfragen mit den Antworten darunter. Antworte auf Deutsch."
};

async function callViaFetch(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  let lastError = "Verbindung fehlgeschlagen";

  for (const model of GROQ_MODELS) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`
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
    lastError = errText.slice(0, 240) || "Verbindung fehlgeschlagen";

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
      throw new Error(`Groq Fehler (${response.status}): ${lastError}`);
    }
  }

  throw new Error(`Groq Fehler: ${lastError}`);
}

export async function askGroq(apiKey: string, action: AiAction, html: string): Promise<string> {
  if (!apiKey.trim()) throw new Error("Bitte trage zuerst deinen Groq API-Key in den Einstellungen ein.");
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
  if (!text) throw new Error("Die Notiz ist leer. Schreibe zuerst etwas Inhalt in deine Notiz.");

  const systemPrompt = "Du bist ein hilfreicher Lernassistent für Schweizer ÜK-Lernende. Antworte präzise und ohne erfundene Fakten.";
  const userPrompt = `${prompts[action]}\n\n${text}`;

  // Versuch 1: Falls in Tauri, versuche zuerst das native Rust-Backend
  if ("__TAURI_INTERNALS__" in window) {
    try {
      return await invoke<string>("groq_chat", {
        apiKey: apiKey.trim(),
        systemPrompt,
        userPrompt
      });
    } catch (rustErr) {
      console.warn("Tauri invoke groq_chat fehlgeschlagen, versuche direkten Web-Fetch Fallback:", rustErr);
      // Automatischer Fallback auf direkten HTTPS Fetch!
      return await callViaFetch(apiKey, systemPrompt, userPrompt);
    }
  }

  // Versuch 2: Direkter Fetch (z.B. im Browser / Fallback)
  return await callViaFetch(apiKey, systemPrompt, userPrompt);
}
