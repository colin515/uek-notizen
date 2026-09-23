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
  { name: "Stichpunkte", query: "bullet", hint: "Leere Aufzählung", category: "Text", keywords: "liste bullet aufzählung" },
  { name: "Nummerierte Liste", query: "number", hint: "Leere Nummerierung", category: "Text", keywords: "liste nummer" },
  { name: "Checkliste", query: "check", hint: "Leere Aufgabe", category: "Text", keywords: "todo aufgabe checkbox" },
  { name: "Zitat", query: "quote", hint: "Leerer Zitatblock", category: "Text", keywords: "zitat blockquote" },
  { name: "Code", query: "code", hint: "Codeblock mit automatischer Sprache", category: "Text", keywords: "code programmieren snippet syntax" },
  { name: "Hinweis", query: "info", hint: "Leere hervorgehobene Infobox", category: "Struktur", keywords: "info hinweis callout box panel" },
  { name: "Tabelle", query: "table", hint: "Zeilen und Spalten wählen", category: "Struktur", keywords: "tabelle grid zellen word" },
  { name: "2 Spalten", query: "columns", hint: "Zwei leere Textspalten", category: "Struktur", keywords: "spalten columns layout" },
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

export function createEmptyTableHtml(rows: number, columns: number): string {
  const safeRows = Math.max(1, Math.min(12, Math.round(rows)));
  const safeColumns = Math.max(1, Math.min(12, Math.round(columns)));
  const width = Math.max(90, Math.round(720 / safeColumns));

  const colgroup = "<colgroup>" +
    Array.from({ length: safeColumns }, () => '<col style="width:' + width + 'px">').join("") +
    "</colgroup>";

  const body = Array.from({ length: safeRows }, () =>
    "<tr>" +
      Array.from({ length: safeColumns }, () => '<td><p><br></p></td>').join("") +
    "</tr>"
  ).join("");

  return '<table class="note-table resizable-table" data-rows="' + safeRows + '" data-columns="' + safeColumns + '" style="table-layout:fixed">' +
    colgroup +
    "<tbody>" + body + "</tbody>" +
  "</table><p><br></p>";
}

export function slashReplacement(command: string): string | null {
  const today = new Date().toLocaleDateString("de-CH");

  const caret = '<span data-slash-caret="true"></span>';
  const replacements: Record<string, string> = {
    h1: "<h1>" + caret + "<br></h1><p><br></p>",
    h2: "<h2>" + caret + "<br></h2><p><br></p>",
    h3: "<h3>" + caret + "<br></h3><p><br></p>",
    bullet: "<ul><li>" + caret + "<br></li></ul><p><br></p>",
    number: "<ol><li>" + caret + "<br></li></ol><p><br></p>",
    check: '<div class="checklist-block"><p>☐&nbsp;' + caret + '</p></div><p><br></p>',
    quote: "<blockquote>" + caret + "<br></blockquote><p><br></p>",
    code: '<pre class="code-block" data-language="auto" spellcheck="false"><code>' + caret + '<br></code></pre><p><br></p>',
    info: '<aside class="callout-block"><p>' + caret + '<br></p></aside><p><br></p>',
    columns: '<div class="note-columns"><div><p>' + caret + '<br></p></div><div><p><br></p></div></div><p><br></p>',
    divider: "<hr /><p>" + caret + "<br></p>",
    date: "<p><strong>" + today + "</strong></p><p>" + caret + "<br></p>"
  };

  return replacements[command] ?? null;
}
