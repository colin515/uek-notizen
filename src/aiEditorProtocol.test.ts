import { describe, expect, it } from "vitest";
import { isAiEditorBlock, renderAiBlocks, type AiEditorBlock } from "./aiEditorProtocol";

describe("structured AI editor protocol", () => {
  it("renders rich text, tables and code without requiring an image model", () => {
    const blocks: AiEditorBlock[] = [
      { type: "heading", level: 2, text: "REST Vergleich" },
      { type: "paragraph", text: "Kurze Erklärung" },
      { type: "table", header: true, rows: [["Methode", "Zweck"], ["GET", "Lesen"]] },
      { type: "code", language: "javascript", code: "const ok = true;" }
    ];

    const html = renderAiBlocks(blocks);
    expect(html).toContain("<h2>REST Vergleich</h2>");
    expect(html).toContain('class="note-table resizable-table"');
    expect(html).toContain("<th><p>Methode</p></th>");
    expect(html).toContain('class="code-block"');
    expect(html).toContain('data-language="javascript"');
    expect(html).toContain("const ok = true;");
  });

  it("renders a text-defined flowchart as an editable flowchart block", () => {
    const html = renderAiBlocks([{
      type: "flowchart",
      title: "Login",
      nodes: [
        { key: "start", text: "Start" },
        { key: "auth", text: "Login prüfen" },
        { key: "done", text: "Dashboard" }
      ],
      edges: [
        { from: "start", to: "auth" },
        { from: "auth", to: "done" }
      ]
    }]);

    expect(html).toContain("flowchart-block");
    expect(html).toContain("Login");
    expect(html).toContain("Login prüfen");
    expect(html).toContain("Dashboard");
  });

  it("rejects malformed model blocks", () => {
    expect(isAiEditorBlock({ type: "table", rows: [["A", 2]] })).toBe(false);
    expect(isAiEditorBlock({ type: "flowchart", nodes: [{ key: "a" }] })).toBe(false);
    expect(isAiEditorBlock({ type: "code", code: "print('ok')" })).toBe(true);
  });
});
