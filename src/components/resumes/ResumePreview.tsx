"use client";

import { cn } from "@/lib/cn";
import {
  contactItems,
  educationPrimary,
  educationSecondary,
  techSeparatorList,
} from "@/lib/resume-format";
import { dateRangeLabel, visibleResume } from "@/lib/resume";
import type { Resume } from "@/lib/types";

/**
 * On-screen sheet that matches the downloaded PDF: name, labeled links,
 * education (school / location, then degree / dates), then roles and projects.
 */
export function ResumePreview({
  resume,
  className,
}: {
  resume: Resume;
  className?: string;
}) {
  const visible = visibleResume(resume);
  const { profile } = resume;
  const contacts = contactItems(profile);

  return (
    <article
      lang="en"
      className={cn(
        "print-sheet mx-auto w-full max-w-[8.5in] rounded-lg border border-line bg-white px-10 py-8 text-[10.5px] leading-[1.4] text-neutral-900 shadow-card",
        className,
      )}
    >
      <header className="text-center">
        <h1 className="text-[20px] font-bold tracking-tight text-neutral-900">
          {profile.fullName || "Your name"}
        </h1>

        {contacts.length > 0 ? (
          <p className="mt-1 text-[10.5px] text-neutral-800">
            {contacts.map((item, index) => (
              <span key={`${item.text}-${index}`}>
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={
                      item.underline
                        ? "text-neutral-800 underline decoration-neutral-800 underline-offset-2"
                        : "text-neutral-800"
                    }
                  >
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
                {index < contacts.length - 1 ? " | " : ""}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {resume.summary.trim() ? (
        <Section title="Summary">
          <p className="text-neutral-800">{resume.summary.trim()}</p>
        </Section>
      ) : null}

      {visible.education.length > 0 ? (
        <Section title="Education">
          <div className="space-y-1.5">
            {visible.education.map((item) => {
              const primary = educationPrimary(item);
              const secondary = educationSecondary(item);
              return (
                <div key={item.id}>
                  <Row left={primary.left || "School"} right={primary.right} bold />
                  <Row left={secondary.left} right={secondary.right} />
                  {item.details ? (
                    <p className="mt-0.5 text-neutral-800">{item.details}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {visible.experience.length > 0 ? (
        <Section title="Experience">
          <div className="space-y-2">
            {visible.experience.map((item) => (
              <div key={item.id}>
                <Row
                  left={item.role || "Role"}
                  right={dateRangeLabel(item.start, item.end)}
                  bold
                />
                <Row left={item.company} right={item.location} />
                <BulletList items={item.bullets.map((b) => b.text)} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {visible.projects.length > 0 ? (
        <Section title="Projects">
          <div className="space-y-2">
            {visible.projects.map((item) => (
              <div key={item.id}>
                <Row
                  left={item.name || "Project"}
                  right={dateRangeLabel(item.start, item.end)}
                  bold
                />
                {item.tech ? (
                  <p className="text-neutral-700">{techSeparatorList(item.tech)}</p>
                ) : null}
                <BulletList items={item.bullets.map((b) => b.text)} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {visible.skills.length > 0 ? (
        <Section title="Technical Skills">
          <ul className="space-y-0.5">
            {visible.skills.map((group) => (
              <li key={group.id}>
                <span className="font-semibold">{group.label}: </span>
                <span className="text-neutral-800">
                  {group.skills.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {isEmpty(resume) ? (
        <p className="py-12 text-center text-[11px] text-neutral-400">
          Fill in the editor and your resume will appear here.
        </p>
      ) : null}
    </article>
  );
}

function isEmpty(resume: Resume): boolean {
  const visible = visibleResume(resume);
  return (
    !resume.summary.trim() &&
    visible.experience.length === 0 &&
    visible.projects.length === 0 &&
    visible.education.length === 0 &&
    visible.skills.length === 0
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3">
      <h2 className="border-b border-neutral-800 pb-0.5 text-[11.5px] font-bold text-neutral-900">
        {title}
      </h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function Row({
  left,
  right,
  bold = false,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  bold?: boolean;
}) {
  if (!left && !right) return null;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn("min-w-0", bold && "font-semibold")}>{left}</span>
      {right ? (
        <span className="shrink-0 whitespace-nowrap text-neutral-800">
          {right}
        </span>
      ) : null}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  const visible = items.filter((text) => text.trim());
  if (visible.length === 0) return null;

  return (
    <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-neutral-800 marker:text-neutral-700">
      {visible.map((text, index) => (
        <li key={index}>{text}</li>
      ))}
    </ul>
  );
}
