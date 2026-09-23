import { invoke } from "@tauri-apps/api/core";
import type { IctModule, ProfileId } from "./moduleCatalog";
import type { CourseAssessment, CourseAssessmentVariant } from "./types";

export interface OfficialModuleBundle extends IctModule {
  competence?: string;
  object?: string;
  actionGoals: string[];
  knowledge: string[];
  degrees: string[];
  sourceUrl: string;
  assessmentVariants: CourseAssessmentVariant[];
  loadedFromPublicCatalog: boolean;
}

const CATALOG_BASE = "https://modulbaukasten.tie-international.com/module/";

function normalizeNumber(value: string): string {
  return value.toUpperCase().replace(/ÜK|MODUL|MODULE|M/g, " ").match(/\d{2,4}[A-Z]?/)?.[0] ?? value.replace(/[^0-9A-Z]/gi, "");
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function bodyLines(doc: Document): string[] {
  return (doc.body.innerText || doc.body.textContent || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(cleanText)
    .filter(Boolean);
}

function section(lines: string[], start: string, ends: string[]): string[] {
  const from = lines.findIndex(line => line.toLocaleLowerCase("de-CH") === start.toLocaleLowerCase("de-CH"));
  if (from < 0) return [];
  let to = lines.length;
  for (let index = from + 1; index < lines.length; index += 1) {
    if (ends.some(end => lines[index].toLocaleLowerCase("de-CH") === end.toLocaleLowerCase("de-CH"))) {
      to = index;
      break;
    }
  }
  return lines.slice(from + 1, to);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function profilesFromDegrees(degrees: string[], fallback: ProfileId[]): ProfileId[] {
  const text = degrees.join(" ").toLocaleLowerCase("de-CH");
  const profiles = new Set<ProfileId>(fallback);

  if (text.includes("mediamat")) profiles.add("mediamatik");
  if (text.includes("digital") && text.includes("business")) profiles.add("digital-business");
  if (text.includes("ict-fach")) {
    if (text.includes("2018")) profiles.add("ict-fachleute-2018");
    if (text.includes("2026")) profiles.add("ict-fachleute-2026");
    if (!text.includes("2018") && !text.includes("2026")) {
      profiles.add("ict-fachleute-2018");
      profiles.add("ict-fachleute-2026");
    }
  }
  if (text.includes("betriebsinformat")) profiles.add("betriebsinformatik");
  if (text.includes("informatiker")) {
    if (text.includes("applikationsentwicklung")) profiles.add("informatik-ae");
    if (text.includes("plattformentwicklung")) profiles.add("informatik-pe");
    if (!text.includes("applikationsentwicklung") && !text.includes("plattformentwicklung")) {
      profiles.add("informatik-ae");
      profiles.add("informatik-pe");
    }
  }
  if (text.includes("gebäudeinformat") || text.includes("gebaeudeinformat")) {
    if (text.includes("gebäudeautomation") || text.includes("gebaeudeautomation")) profiles.add("gebaeudeautomation");
    if (text.includes("kommunikation") || text.includes("multimedia")) profiles.add("gebaeude-kommunikation");
    if (text.includes("planung")) profiles.add("gebaeude-planung");
    if (!text.includes("gebäudeautomation") && !text.includes("gebaeudeautomation") && !text.includes("kommunikation") && !text.includes("multimedia") && !text.includes("planung")) {
      profiles.add("gebaeudeautomation");
      profiles.add("gebaeude-kommunikation");
      profiles.add("gebaeude-planung");
    }
  }

  return Array.from(profiles);
}

function extractGoalStructure(doc: Document, lines: string[]): { actionGoals: string[]; knowledge: string[] } {
  const allHeadings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  const actionHeadings = allHeadings.filter(element => /^\d+\.\s+/.test(cleanText(element.textContent)));

  const actionGoals = unique(actionHeadings.map(element =>
    cleanText(element.textContent).replace(/^\d+\.\s+/, "")
  ));

  const knowledge: string[] = [];
  for (const heading of actionHeadings) {
    let node = heading.nextElementSibling;
    while (node && !/^H[1-6]$/.test(node.tagName)) {
      for (const item of Array.from(node.querySelectorAll("li"))) {
        const text = cleanText(item.textContent).replace(/^\d+\.\s+/, "");
        if (text) knowledge.push(text);
      }
      node = node.nextElementSibling;
    }
  }

  if (actionGoals.length) {
    return { actionGoals, knowledge: unique(knowledge) };
  }

  const raw = section(lines, "Handlungsziele", ["Impressum", "Datenschutz", "Nutzungsbedingungen"]);
  const fallbackGoals: string[] = [];
  const fallbackKnowledge: string[] = [];
  for (const line of raw) {
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (!numbered) continue;
    const text = cleanText(numbered[2]);
    if (/^(Kennt|Kann|Weiss|Versteht|Ist in der Lage)/i.test(text)) fallbackKnowledge.push(text);
    else fallbackGoals.push(text);
  }
  return { actionGoals: unique(fallbackGoals), knowledge: unique(fallbackKnowledge) };
}

export function parseOfficialModuleHtml(
  html: string,
  moduleNumber: string,
  fallback?: IctModule
): Omit<OfficialModuleBundle, "assessmentVariants"> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines = bodyLines(doc);
  const number = normalizeNumber(moduleNumber);
  const numberIndex = lines.findIndex(line => line === number);

  const title = numberIndex >= 0 ? lines[numberIndex + 1] : fallback?.title;
  const fieldVersion = numberIndex >= 0 ? lines[numberIndex + 2] : "";
  const fieldMatch = fieldVersion?.match(/^(.+?),\s*Version\s*([0-9.]+)/i);

  const competence = cleanText(section(lines, "Kompetenz", ["Objekt"])[0]);
  const object = cleanText(section(lines, "Objekt", ["Abschlüsse", "Handlungsziele"])[0]);
  const degrees = unique(section(lines, "Abschlüsse", ["Handlungsziele"]).filter(line =>
    !["Identifikation", "LBV", "Deutsch"].includes(line)
  ));
  const { actionGoals, knowledge } = extractGoalStructure(doc, lines);

  const topics = unique([
    ...(fallback?.topics ?? []),
    ...knowledge.slice(0, 24).map(item => {
      const compact = item.replace(/^(Kennt|Kann|Weiss|Versteht|Ist in der Lage)[^,.]*[,.:]?\s*/i, "");
      return compact.length > 90 ? compact.slice(0, 87) + "…" : compact;
    })
  ]).slice(0, 32);

  return {
    number,
    title: cleanText(title) || fallback?.title || "ICT-Modul " + number,
    field: cleanText(fieldMatch?.[1]) || fallback?.field || "ICT",
    version: cleanText(fieldMatch?.[2]) || fallback?.version,
    profiles: profilesFromDegrees(degrees, fallback?.profiles ?? []),
    summary: competence || fallback?.summary,
    topics: topics.length ? topics : (fallback?.topics ?? []),
    competence: competence || fallback?.summary,
    object,
    actionGoals,
    knowledge,
    degrees,
    sourceUrl: CATALOG_BASE + encodeURIComponent(number),
    loadedFromPublicCatalog: true
  };
}

function blockSection(lines: string[], label: string, stopLabels: string[]): string {
  const index = lines.findIndex(line => line.toLocaleLowerCase("de-CH") === label.toLocaleLowerCase("de-CH"));
  if (index < 0) return "";
  const values: string[] = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (stopLabels.some(stop => lines[cursor].toLocaleLowerCase("de-CH") === stop.toLocaleLowerCase("de-CH"))) break;
    if (/^LBV\s+.+-\s*Element\s+\d+/i.test(lines[cursor])) break;
    values.push(lines[cursor]);
  }
  return cleanText(values.join(" "));
}

function parseCriteria(lines: string[]): Array<{ title: string; weight?: string }> {
  const criteria: Array<{ title: string; weight?: string }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/Bewertungskriterium\s+\d+\s*-\s*Gewichtung\s+(.+)$/i);
    if (!match) continue;
    const description: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/Bewertungskriterium\s+\d+/i.test(lines[cursor]) || /^LBV\s+.+-\s*Element\s+\d+/i.test(lines[cursor])) break;
      if (["Beschreibung", "Hilfsmittel", "Praxisbezug", "Prüfungsform", "Sozialform", "Bewertungskriterien"].includes(lines[cursor])) continue;
      description.push(lines[cursor]);
    }
    criteria.push({
      title: cleanText(description.join(" ")) || "Bewertungskriterium " + (criteria.length + 1),
      weight: cleanText(match[1])
    });
  }
  return criteria;
}

export function parseOfficialLbvHtml(
  html: string,
  moduleNumber: string,
  variant: number
): CourseAssessmentVariant | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines = bodyLines(doc);
  const number = normalizeNumber(moduleNumber);
  const elementPattern = new RegExp(
    "^LBV\\s+" + number + "-" + variant + "\\s*-\\s*Element\\s+(\\d+)\\s*-\\s*Gewichtung\\s+([0-9.,]+)%\\s*-\\s*Richtzeit\\s+([0-9.,]+h)",
    "i"
  );

  const elementStarts = lines
    .map((line, index) => ({ line, index, match: line.match(elementPattern) }))
    .filter(item => item.match);

  if (!elementStarts.length) return null;

  const totalIndex = lines.findIndex(line => line.toLocaleLowerCase("de-CH") === "richtzeit total");
  const totalDuration = totalIndex >= 0 ? lines[totalIndex + 1] : undefined;
  const description = blockSection(lines, "Beschreibung", ["Lernorte", "Richtzeit total", "Elemente"]);

  const assessments: CourseAssessment[] = elementStarts.map((entry, listIndex) => {
    const end = elementStarts[listIndex + 1]?.index ?? lines.length;
    const block = lines.slice(entry.index + 1, end);
    const match = entry.match!;
    const elementNumber = match[1];
    const weight = Number(match[2].replace(",", "."));
    const duration = match[3].replace(",", ".");

    const elementDescription = blockSection(
      block,
      "Beschreibung",
      ["Hilfsmittel", "Praxisbezug", "Prüfungsform", "Sozialform", "Bewertungskriterien"]
    );

    return {
      id: "official-" + number + "-" + variant + "-" + elementNumber,
      title: "LBV " + number + "-" + variant + " · Element " + elementNumber,
      topic: elementDescription,
      weight: Number.isFinite(weight) ? weight : 0,
      grade: null,
      source: "official",
      locked: true,
      duration,
      format: blockSection(block, "Prüfungsform", ["Sozialform", "Bewertungskriterien"]),
      aids: blockSection(block, "Hilfsmittel", ["Praxisbezug", "Prüfungsform", "Sozialform", "Bewertungskriterien"]),
      socialForm: blockSection(block, "Sozialform", ["Bewertungskriterien"]),
      criteria: parseCriteria(block)
    };
  });

  return {
    id: "LBV " + number + "-" + variant,
    title: "LBV " + number + "-" + variant,
    description,
    totalDuration: cleanText(totalDuration),
    sourceUrl: CATALOG_BASE + encodeURIComponent(number) + "/evaluation/" + variant,
    assessments
  };
}

async function directFetch(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function fetchModuleHtml(number: string): Promise<string | null> {
  if ("__TAURI_INTERNALS__" in window) {
    return invoke<string | null>("fetch_official_module_html", { moduleNumber: number });
  }
  return directFetch(CATALOG_BASE + encodeURIComponent(number));
}

async function fetchLbvHtml(number: string, variant: number): Promise<string | null> {
  if ("__TAURI_INTERNALS__" in window) {
    return invoke<string | null>("fetch_official_lbv_html", { moduleNumber: number, variant });
  }
  return directFetch(CATALOG_BASE + encodeURIComponent(number) + "/evaluation/" + variant);
}

export async function fetchOfficialModuleBundle(
  moduleNumber: string,
  fallback?: IctModule
): Promise<OfficialModuleBundle | null> {
  const number = normalizeNumber(moduleNumber);
  if (!number) return null;

  const html = await fetchModuleHtml(number);
  if (!html) return null;

  const parsed = parseOfficialModuleHtml(html, number, fallback);
  const variants = await Promise.all(
    Array.from({ length: 8 }, (_, index) => index + 1).map(async variant => {
      try {
        const lbvHtml = await fetchLbvHtml(number, variant);
        return lbvHtml ? parseOfficialLbvHtml(lbvHtml, number, variant) : null;
      } catch {
        return null;
      }
    })
  );

  return {
    ...parsed,
    assessmentVariants: variants.filter((variant): variant is CourseAssessmentVariant => Boolean(variant))
  };
}

export function mergeOfficialWithFallback(
  official: OfficialModuleBundle | null,
  fallback?: IctModule
): OfficialModuleBundle | null {
  if (official) return official;
  if (!fallback) return null;
  return {
    ...fallback,
    competence: fallback.summary,
    object: "",
    actionGoals: [],
    knowledge: fallback.topics,
    degrees: [],
    sourceUrl: CATALOG_BASE + encodeURIComponent(fallback.number),
    assessmentVariants: [],
    loadedFromPublicCatalog: false
  };
}
