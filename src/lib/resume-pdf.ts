import { jsPDF } from "jspdf";

import { slugify } from "./download";
import {
  contactItems,
  educationPrimary,
  educationSecondary,
  techSeparatorList,
} from "./resume-format";
import { dateRangeLabel, visibleResume } from "./resume";
import type { Resume } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Builds a letter-size resume PDF with no app chrome, dates, or URLs —
 * the file you actually send to a recruiter.
 */
export function downloadResumePdf(resume: Resume) {
  const doc = buildResumePdf(resume);
  const filename = `${slugify(resume.profile.fullName || resume.name)}.pdf`;
  doc.save(filename);
}

export function buildResumePdf(resume: Resume): jsPDF {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    compress: true,
  });
  const visible = visibleResume(resume);
  const { profile } = resume;
  let y = 52;

  doc.setProperties({
    title: profile.fullName || resume.name,
    author: profile.fullName || "",
    creator: profile.fullName || "Resume",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text(profile.fullName || "Your name", PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 16;

  const contacts = contactItems(profile);
  if (contacts.length > 0) {
    drawContactLine(doc, contacts, y);
    y += 18;
  }

  if (resume.summary.trim()) {
    y = sectionTitle(doc, "Summary", y);
    y = wrapped(doc, resume.summary.trim(), MARGIN, y, CONTENT_WIDTH, 10);
    y += 8;
  }

  if (visible.education.length > 0) {
    y = sectionTitle(doc, "Education", y);
    for (const item of visible.education) {
      const primary = educationPrimary(item);
      const secondary = educationSecondary(item);
      y = pairRow(doc, primary.left || "School", primary.right, y, true);
      y = pairRow(doc, secondary.left, secondary.right, y, false);
      if (item.details.trim()) {
        y = wrapped(doc, item.details.trim(), MARGIN, y, CONTENT_WIDTH, 10);
      }
      y += 6;
    }
  }

  if (visible.experience.length > 0) {
    y = sectionTitle(doc, "Experience", y);
    for (const item of visible.experience) {
      y = pairRow(
        doc,
        item.role || "Role",
        dateRangeLabel(item.start, item.end),
        y,
        true,
      );
      y = pairRow(doc, item.company, item.location, y, false);
      y = bullets(doc, item.bullets.map((b) => b.text), y);
      y += 8;
    }
  }

  if (visible.projects.length > 0) {
    y = sectionTitle(doc, "Projects", y);
    for (const item of visible.projects) {
      y = pairRow(
        doc,
        item.name || "Project",
        dateRangeLabel(item.start, item.end),
        y,
        true,
      );
      if (item.tech.trim()) {
        y = wrapped(
          doc,
          techSeparatorList(item.tech),
          MARGIN,
          y,
          CONTENT_WIDTH,
          10,
        );
      }
      y = bullets(doc, item.bullets.map((b) => b.text), y);
      y += 8;
    }
  }

  if (visible.skills.length > 0) {
    y = sectionTitle(doc, "Technical Skills", y);
    for (const group of visible.skills) {
      const label = `${group.label}: `;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const labelWidth = doc.getTextWidth(label);
      ensureSpace(doc, y, 14);
      doc.text(label, MARGIN, y);
      doc.setFont("helvetica", "normal");
      y = wrapped(
        doc,
        group.skills.join(", "),
        MARGIN + labelWidth,
        y,
        CONTENT_WIDTH - labelWidth,
        10,
      );
      y += 3;
    }
  }

  return doc;
}

function drawContactLine(
  doc: jsPDF,
  items: { text: string; href?: string; underline?: boolean }[],
  y: number,
) {
  const parts = items.map((item, index) => ({
    ...item,
    suffix: index < items.length - 1 ? " | " : "",
  }));
  const full = parts.map((part) => part.text + part.suffix).join("");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const start = (PAGE_WIDTH - doc.getTextWidth(full)) / 2;
  let x = start;

  for (const part of parts) {
    doc.setTextColor(17, 17, 17);
    if (part.href) {
      doc.textWithLink(part.text, x, y, { url: part.href });
    } else {
      doc.text(part.text, x, y);
    }
    if (part.underline) {
      const underlineY = y + 1.2;
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.5);
      doc.line(x, underlineY, x + doc.getTextWidth(part.text), underlineY);
    }
    x += doc.getTextWidth(part.text);
    doc.text(part.suffix, x, y);
    x += doc.getTextWidth(part.suffix);
  }
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y + 6, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  doc.text(title, MARGIN, y);
  y += 4;
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  return y + 12;
}

function pairRow(
  doc: jsPDF,
  left: string,
  right: string,
  y: number,
  boldLeft: boolean,
): number {
  if (!left && !right) return y;
  y = ensureSpace(doc, y, 14);
  doc.setFontSize(10.5);
  doc.setTextColor(17, 17, 17);
  doc.setFont("helvetica", boldLeft ? "bold" : "normal");
  const rightWidth = right ? doc.getTextWidth(right) : 0;
  const leftMax = CONTENT_WIDTH - rightWidth - 10;
  const leftLines = left
    ? doc.splitTextToSize(left, Math.max(120, leftMax))
    : [];
  if (leftLines.length > 0) {
    doc.text(leftLines[0], MARGIN, y);
    for (let i = 1; i < leftLines.length; i++) {
      y += 12;
      y = ensureSpace(doc, y, 12);
      doc.text(leftLines[i], MARGIN, y);
    }
  }
  if (right) {
    doc.setFont("helvetica", "normal");
    doc.text(right, PAGE_WIDTH - MARGIN, y, { align: "right" });
  }
  return y + 13;
}

function bullets(doc: jsPDF, items: string[], y: number): number {
  const texts = items.map((item) => item.trim()).filter(Boolean);
  if (texts.length === 0) return y;
  const indent = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const text of texts) {
    y = ensureSpace(doc, y, 14);
    doc.circle(MARGIN + 4, y - 2.5, 1.1, "F");
    y = wrapped(doc, text, MARGIN + indent, y, CONTENT_WIDTH - indent, 10);
    y += 3;
  }
  return y;
}

function wrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, width) as string[];
  for (const line of lines) {
    y = ensureSpace(doc, y, 13);
    doc.text(line, x, y);
    y += 12;
  }
  return y;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed < PAGE_HEIGHT - MARGIN) return y;
  doc.addPage();
  return MARGIN + 8;
}
