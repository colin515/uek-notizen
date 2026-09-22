type AiAction = "summary" | "explain" | "improve" | "quiz";

const prompts: Record<AiAction, string> = {
  summary: "Fasse die folgende ÜK-Notiz klar und kompakt auf Deutsch zusammen. Nutze kurze Abschnitte und Stichpunkte.",
  explain: "Erkläre den Inhalt der folgenden ÜK-Notiz einfach, fachlich korrekt und mit einem praktischen Beispiel.",
  improve: "Überarbeite die folgende ÜK-Notiz sprachlich und strukturell. Bewahre alle Fakten, entferne Wiederholungen und gib nur die verbesserte Notiz zurück.",
  quiz: "Erstelle aus der folgenden ÜK-Notiz fünf Lernfragen mit den Antworten darunter. Antworte auf Deutsch."
};

export async function askGroq(apiKey: string, action: AiAction, html: string): Promise<string> {
  if (!apiKey.trim()) throw new Error("Bitte trage zuerst deinen Groq API-Key in den Einstellungen ein.");
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
  if (!text) throw new Error("Die Notiz ist leer.");

  const systemPrompt = "Du bist ein hilfreicher Lernassistent für Schweizer ÜK-Lernende. Antworte präzise und ohne erfundene Fakten.";
  const userPrompt = `${prompts[action]}\n\n${text}`;

  if ("__TAURI_INTERNALS__" in window) {
    return invoke<string>("groq_chat", {
      apiKey: apiKey.trim(),
      systemPrompt,
      userPrompt
    });
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.25,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Der Groq API-Key ist ungültig.");
    if (response.status === 429) throw new Error("Das Groq-Limit ist gerade erreicht. Bitte versuche es später erneut.");
    throw new Error(`Groq konnte nicht erreicht werden (${response.status}).`);
  }
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || "Keine Antwort erhalten.";
}
import { invoke } from "@tauri-apps/api/core";

