import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGUAGE_MAP = {
  bash,
  c,
  cpp,
  csharp,
  css,
  dockerfile,
  go,
  java,
  javascript,
  json,
  kotlin,
  php,
  plaintext,
  powershell,
  python,
  rust,
  sql,
  swift,
  typescript,
  xml,
  yaml
} as const;

for (const [name, language] of Object.entries(LANGUAGE_MAP)) {
  hljs.registerLanguage(name, language);
}

const DETECTION_LANGUAGES = Object.keys(LANGUAGE_MAP).filter(language => language !== "plaintext");

const LABELS: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  dockerfile: "Dockerfile",
  go: "Go",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  kotlin: "Kotlin",
  php: "PHP",
  plaintext: "Text",
  powershell: "PowerShell",
  python: "Python",
  rust: "Rust",
  sql: "SQL",
  swift: "Swift",
  typescript: "TypeScript",
  xml: "HTML / XML",
  yaml: "YAML"
};

export function codeLanguageLabel(language: string | undefined | null): string {
  if (!language || language === "auto") return "Auto";
  return LABELS[language] ?? language;
}

function selectionOffsetWithin(root: Node): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !root.contains(selection.anchorNode)) return null;
  const range = selection.getRangeAt(0).cloneRange();
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.endContainer, range.endOffset);
  return before.toString().length;
}

function restoreSelectionOffset(root: Node, offset: number | null): void {
  if (offset === null) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let text = walker.nextNode();

  while (text) {
    const length = text.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(text, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    remaining -= length;
    text = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function highlightCodeElement(code: HTMLElement): void {
  const pre = code.closest("pre.code-block") as HTMLElement | null;
  if (!pre) return;

  const raw = code.innerText.replace(/\u00a0/g, " ");
  const caretOffset = selectionOffsetWithin(code);
  const requested = pre.dataset.language;

  let language = requested && requested !== "auto" && LANGUAGE_MAP[requested as keyof typeof LANGUAGE_MAP]
    ? requested
    : undefined;

  let html = "";
  if (!raw.trim()) {
    language = requested && requested !== "auto" ? requested : undefined;
    html = "<br>";
  } else if (language) {
    html = hljs.highlight(raw, { language }).value;
  } else {
    const result = hljs.highlightAuto(raw, DETECTION_LANGUAGES);
    language = result.language || "plaintext";
    html = result.value;
  }

  code.innerHTML = html;
  pre.dataset.detectedLanguage = language || "plaintext";
  pre.setAttribute("aria-label", "Code · " + codeLanguageLabel(language));
  restoreSelectionOffset(code, caretOffset);
}

export function highlightAllCodeBlocks(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("pre.code-block code").forEach(highlightCodeElement);
}

export function handleCodeTab(event: KeyboardEvent | React.KeyboardEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement | null;
  if (!target?.closest("pre.code-block")) return false;
  if (event.key !== "Tab") return false;

  event.preventDefault();
  document.execCommand("insertText", false, "  ");
  return true;
}
