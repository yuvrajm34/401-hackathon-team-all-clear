import { classifyLink, defaultLabelForKind } from "./resume-parse";
import { dateRangeLabel } from "./resume";
import type { EducationItem, ProfileLink, ResumeProfile } from "./types";

export interface ContactItem {
  text: string;
  href?: string;
  /** Profile links print as an underlined label; phone/email stay plain. */
  underline?: boolean;
}

/**
 * Header line as on a typical student/industry resume:
 * phone | email | LinkedIn | GitHub
 *
 * Location stays off this line (it belongs on the education row).
 * Links keep the order the user stored, and print as labels, not raw URLs.
 */
export function contactItems(profile: ResumeProfile): ContactItem[] {
  const items: ContactItem[] = [];

  if (profile.phone.trim()) {
    items.push({ text: profile.phone.trim() });
  }
  if (profile.email.trim()) {
    items.push({
      text: profile.email.trim(),
      href: `mailto:${profile.email.trim()}`,
    });
  }

  for (const link of profile.links) {
    if (!link.url.trim()) continue;
    items.push({
      text: contactLinkLabel(link),
      href: withProtocol(link.url),
      underline: true,
    });
  }

  return items;
}

export function contactLinkLabel(link: ProfileLink): string {
  const label = link.label.trim();
  if (label && !looksLikeUrl(label)) return label;

  const kind = classifyLink(label, link.url);
  if (kind !== "other") return defaultLabelForKind(kind);

  return stripProtocol(link.url);
}

export function techSeparatorList(tech: string): string {
  return tech
    .split(/\s*[|,·•]\s*|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

export function educationPrimary(item: EducationItem): {
  left: string;
  right: string;
} {
  return { left: item.school, right: item.location };
}

export function educationSecondary(item: EducationItem): {
  left: string;
  right: string;
} {
  return { left: item.degree, right: dateRangeLabel(item.start, item.end) };
}

export function withProtocol(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function looksLikeUrl(value: string): boolean {
  return /https?:\/\//i.test(value) || /^(www\.|linkedin\.|github\.)/i.test(value);
}
