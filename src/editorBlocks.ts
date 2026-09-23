export type SlashCommand = {
  name: string;
  query: string;
  hint: string;
  category: "Text" | "Struktur" | "Medien";
  keywords: string;
};

export const slashCommands: SlashCommand[] = [
  { name: "Titel", query: "h1", hint: "Grosse Überschrift", category: "Text", keywords: "titel heading überschrift" },
  { name: "Überschrift", query: "h2", hint: "Überschrift", category: "Text", keywords: "heading überschrift" },
  { name: "Unterüberschrift", query: "h3", hint: "Kleine Überschrift", category: "Text", keywords: "heading untertitel" },
  { name: "Stichpunkte", query: "bullet", hint: "Aufzählung", category: "Text", keywords: "liste bullet aufzählung" },
  { name: "Nummerierte Liste", query: "number", hint: "Nummerierung", category: "Text", keywords: "liste nummer" },
  { name: "Checkliste", query: "check", hint: "Aufgaben zum Abhaken", category: "Text", keywords: "todo aufgabe checkbox" },
  { name: "Zitat", query: "quote", hint: "Zitatblock", category: "Text", keywords: "zitat blockquote" },
  { name: "Code", query: "code", hint: "Codeblock", category: "Text", keywords: "code programmieren snippet" },
  { name: "Hinweis", query: "info", hint: "Hervorgehobene Infobox", category: "Struktur", keywords: "info hinweis callout box" },
  { name: "Tabelle", query: "table", hint: "3 × 3 Tabelle", category: "Struktur", keywords: "tabelle grid zellen" },
  { name: "2 Spalten", query: "columns", hint: "Zwei Textspalten", category: "Struktur", keywords: "spalten columns layout" },
  { name: "Trennlinie", query: "divider", hint: "Horizontale Linie", category: "Struktur", keywords: "linie separator hr" },
  { name: "Datum", query: "date", hint: "Heutiges Datum einfügen", category: "Struktur", keywords: "datum heute kalender" },
  { name: "Flowchart", query: "flowchart", hint: "Diagramm mit verbundenen Blöcken", category: "Medien", keywords: "diagramm workflow draw io kästen pfeile" },
  { name: "Bild", query: "bild", hint: "Bild einfügen", category: "Medien", keywords: "bild image foto" }
];

export function slashCommandMatches(command: SlashCommand, query: string): boolean {
  const normalized = query.toLocaleLowerCase("de-CH").trim();
  if (!normalized) return true;
  return [command.query, command.name, command.hint, command.keywords]
    .join(" ")
    .toLocaleLowerCase("de-CH")
    .includes(normalized);
}

export function slashReplacement(command: string): string | null {
  const today = new Date().toLocaleDateString("de-CH");

  const replacements: Record<string, string> = {
    h1: "<h1>Titel</h1><p></p>",
    h2: "<h2>Überschrift</h2><p></p>",
    h3: "<h3>Unterüberschrift</h3><p></p>",
    bullet: "<ul><li>Erster Punkt</li><li>Zweiter Punkt</li></ul><p></p>",
    number: "<ol><li>Erster Punkt</li><li>Zweiter Punkt</li></ol><p></p>",
    check: '<div class="checklist-block"><p>☐ Aufgabe</p><p>☐ Nächste Aufgabe</p></div><p></p>',
    quote: "<blockquote>Zitat oder wichtige Aussage</blockquote><p></p>",
    code: '<pre class="code-block"><code>// Code oder Befehl</code></pre><p></p>',
    info: '<aside class="callout-block"><strong>💡 Hinweis</strong><p>Wichtige Information…</p></aside><p></p>',
    table: '<table class="note-table"><thead><tr><th>Spalte 1</th><th>Spalte 2</th><th>Spalte 3</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table><p></p>',
    columns: '<div class="note-columns"><div><p>Linke Spalte</p></div><div><p>Rechte Spalte</p></div></div><p></p>',
    divider: "<hr /><p></p>",
    date: "<p><strong>" + today + "</strong></p><p></p>"
  };

  return replacements[command] ?? null;
}
