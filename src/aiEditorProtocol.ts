import { createFlowchartFromSpec, renderFlowchartHtml } from "./FlowchartEditor";

export type AiEditorBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level?: 1 | 2 | 3; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "number_list"; items: string[] }
  | { type: "checklist"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "info"; text: string }
  | { type: "code"; code: string; language?: string }
  | { type: "table"; rows: string[][]; header?: boolean }
  | { type: "divider" }
  | {
      type: "flowchart";
      title?: string;
      nodes: Array<{ key: string; text: string }>;
      edges?: Array<{ from: string; to: string }>;
    };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderText(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function renderTable(rows: string[][], header: boolean): string {
  const safeRows = rows.slice(0, 20).map(row => row.slice(0, 10));
  const columns = Math.max(1, ...safeRows.map(row => row.length));
  const width = Math.max(90, Math.round(720 / columns));
  const colgroup = "<colgroup>" +
    Array.from({ length: columns }, () => '<col style="width:' + width + 'px">').join("") +
    "</colgroup>";

  const bodyRows = safeRows.length ? safeRows : [Array.from({ length: columns }, () => "")];

  const rendered = bodyRows.map((row, rowIndex) => {
    const cellTag = header && rowIndex === 0 ? "th" : "td";
    const cells = Array.from({ length: columns }, (_, columnIndex) =>
      "<" + cellTag + "><p>" + (row[columnIndex] ? renderText(row[columnIndex]) : "<br>") + "</p></" + cellTag + ">"
    ).join("");
    return "<tr>" + cells + "</tr>";
  }).join("");

  return '<table class="note-table resizable-table" style="table-layout:fixed">' +
    colgroup + "<tbody>" + rendered + "</tbody></table><p><br></p>";
}

export function renderAiBlocks(blocks: AiEditorBlock[]): string {
  return blocks.slice(0, 80).map(block => {
    if (block.type === "paragraph") return "<p>" + (block.text ? renderText(block.text) : "<br>") + "</p>";
    if (block.type === "heading") {
      const level = block.level === 1 ? 1 : block.level === 3 ? 3 : 2;
      return "<h" + level + ">" + (block.text ? renderText(block.text) : "<br>") + "</h" + level + ">";
    }
    if (block.type === "bullet_list") {
      return "<ul>" + block.items.slice(0, 30).map(item => "<li>" + renderText(item) + "</li>").join("") + "</ul>";
    }
    if (block.type === "number_list") {
      return "<ol>" + block.items.slice(0, 30).map(item => "<li>" + renderText(item) + "</li>").join("") + "</ol>";
    }
    if (block.type === "checklist") {
      return '<div class="checklist-block">' +
        block.items.slice(0, 30).map(item => "<p>☐&nbsp;" + renderText(item) + "</p>").join("") +
      "</div>";
    }
    if (block.type === "quote") return "<blockquote>" + renderText(block.text) + "</blockquote>";
    if (block.type === "info") return '<aside class="callout-block"><p>' + renderText(block.text) + "</p></aside>";
    if (block.type === "code") {
      const language = (block.language ?? "auto").replace(/[^a-z0-9+#._-]/gi, "").toLowerCase() || "auto";
      return '<pre class="code-block" data-language="' + escapeHtml(language) + '" spellcheck="false"><code>' +
        (block.code ? escapeHtml(block.code) : "<br>") +
      "</code></pre><p><br></p>";
    }
    if (block.type === "table") return renderTable(block.rows, Boolean(block.header));
    if (block.type === "divider") return "<hr><p><br></p>";
    if (block.type === "flowchart") {
      const flowchart = createFlowchartFromSpec({
        title: block.title,
        nodes: block.nodes,
        edges: block.edges
      });
      return renderFlowchartHtml(flowchart) + "<p><br></p>";
    }
    return "";
  }).join("");
}

export function isAiEditorBlock(value: unknown): value is AiEditorBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  if (typeof block.type !== "string") return false;

  if (block.type === "paragraph" || block.type === "quote" || block.type === "info") {
    return typeof block.text === "string";
  }
  if (block.type === "heading") return typeof block.text === "string";
  if (block.type === "bullet_list" || block.type === "number_list" || block.type === "checklist") {
    return Array.isArray(block.items) && block.items.every(item => typeof item === "string");
  }
  if (block.type === "code") return typeof block.code === "string";
  if (block.type === "table") {
    return Array.isArray(block.rows) && block.rows.every(row =>
      Array.isArray(row) && row.every(cell => typeof cell === "string")
    );
  }
  if (block.type === "divider") return true;
  if (block.type === "flowchart") {
    return Array.isArray(block.nodes) && block.nodes.every(node => {
      if (!node || typeof node !== "object") return false;
      const item = node as Record<string, unknown>;
      return typeof item.key === "string" && typeof item.text === "string";
    });
  }

  return false;
}
