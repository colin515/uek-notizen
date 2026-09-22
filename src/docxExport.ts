import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TableOfContents,
  TextRun
} from "docx";
import type { Course, Note } from "./types";

function textContent(element: Element): string {
  return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function htmlToParagraphs(html: string): Paragraph[] {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const paragraphs: Paragraph[] = [];

  const visit = (element: Element) => {
    const text = textContent(element);
    if (!text) return;
    const tag = element.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2") {
      paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 } }));
    } else if (tag === "h3") {
      paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 80 } }));
    } else if (tag === "ul" || tag === "ol") {
      Array.from(element.children).forEach((item, index) => {
        paragraphs.push(new Paragraph({
          text: textContent(item),
          bullet: tag === "ul" ? { level: 0 } : undefined,
          numbering: tag === "ol" ? { reference: "course-numbering", level: 0, instance: index + 1 } : undefined,
          spacing: { after: 80 }
        }));
      });
    } else if (tag === "blockquote") {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text, italics: true, color: "666666" })],
        indent: { left: 540 },
        spacing: { after: 120 }
      }));
    } else {
      paragraphs.push(new Paragraph({ text, spacing: { after: 120, line: 320 } }));
    }
  };

  Array.from(body.children).forEach(visit);
  return paragraphs.length ? paragraphs : [new Paragraph({ text: "Keine Inhalte vorhanden." })];
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9äöüß_ -]/gi, "").replace(/\s+/g, " ").trim() || "UEK-Notizen";
}

export async function exportCourseDocx(course: Course, notes: Note[], author: string): Promise<void> {
  const activeNotes = notes
    .filter(note => note.courseId === course.id && !note.archived)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const children: Array<Paragraph | TableOfContents> = [
    new Paragraph({
      text: `${course.number} – ${course.title}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 360 }
    }),
    new Paragraph({
      children: [new TextRun({ text: author || "ÜK-Lernende/r", size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Erstellt am ${new Date().toLocaleDateString("de-CH")}`, color: "666666" })],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ text: "Inhaltsverzeichnis", heading: HeadingLevel.TITLE, spacing: { after: 240 } }),
    new TableOfContents("Inhaltsverzeichnis", {
      hyperlink: true,
      headingStyleRange: "1-3",
      beginDirty: true
    }),
    new Paragraph({ children: [new PageBreak()] })
  ];

  activeNotes.forEach((note, index) => {
    children.push(
      new Paragraph({
        text: note.title || "Unbenannte Notiz",
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Zuletzt bearbeitet: ${new Date(note.updatedAt).toLocaleDateString("de-CH")} · ${note.tags.join(", ")}`,
            color: "777777",
            size: 18
          })
        ],
        spacing: { after: 240 }
      }),
      ...htmlToParagraphs(note.content)
    );
  });

  if (!activeNotes.length) {
    children.push(new Paragraph({ text: "Dieser ÜK enthält noch keine Notizen." }));
  }

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${author || "ÜK-Lernende/r"} · ${course.number} ${course.title} · Seite `, size: 18, color: "666666" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "666666" })
        ]
      })
    ]
  });

  const doc = new Document({
    creator: author || "ÜK Notizen",
    title: `${course.number} – ${course.title}`,
    description: "Alle Notizen eines ÜKs",
    features: { updateFields: true },
    numbering: {
      config: [{
        reference: "course-numbering",
        levels: [{
          level: 0,
          format: "decimal",
          text: "%1.",
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }]
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          pageNumbers: { start: 1 }
        }
      },
      footers: { default: footer },
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFileName(course.number)}-${safeFileName(course.title)}.docx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
