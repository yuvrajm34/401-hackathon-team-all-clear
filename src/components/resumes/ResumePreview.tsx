"use client";

import { cn } from "@/lib/cn";
import { dateRangeLabel, visibleResume } from "@/lib/resume";
import type { Resume } from "@/lib/types";

/**
 * WYSIWYG resume sheet. Always rendered on white regardless of the app theme
 * because it represents a printed document — which also makes the print
 * stylesheet a no-op beyond stripping the page chrome.
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
  const links = profile.links.filter((link) => link.url.trim());

  const contactParts = [profile.phone, profile.email, profile.location].filter(
    Boolean,
  );

  return (
    <article
      lang="en"
      className={cn(
        "print-sheet mx-auto w-full max-w-[8.5in] rounded-lg border border-line bg-white px-8 py-8 text-[10.5px] leading-[1.45] text-neutral-900 shadow-card",
        className,
      )}
    >
      <header className="text-center">
        <h1 className="text-[22px] font-semibold uppercase tracking-[0.08em] text-neutral-900">
          {profile.fullName || "Your name"}
        </h1>

        {contactParts.length > 0 || links.length > 0 ? (
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[10px] text-neutral-700">
            {contactParts.map((part, index) => (
              <span key={`${part}-${index}`} className="flex items-center gap-1.5">
                {index > 0 ? <Divider /> : null}
                {part}
              </span>
            ))}
            {links.map((link, index) => (
              <span key={link.id} className="flex items-center gap-1.5">
                {contactParts.length > 0 || index > 0 ? <Divider /> : null}
                <a
                  href={withProtocol(link.url)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-neutral-400 underline-offset-2"
                >
                  {displayUrl(link.url)}
                </a>
              </span>
            ))}
          </p>
        ) : null}

        {profile.headline ? (
          <p className="mt-1 text-[10.5px] italic text-neutral-700">
            {profile.headline}
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
            {visible.education.map((item) => (
              <div key={item.id}>
                <Row
                  left={item.school || "School"}
                  right={dateRangeLabel(item.start, item.end)}
                  bold
                />
                <Row left={item.degree} right={item.location} italic />
                {item.details ? (
                  <p className="mt-0.5 text-neutral-800">{item.details}</p>
                ) : null}
              </div>
            ))}
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
                <Row left={item.company} right={item.location} italic />
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
                  left={
                    <>
                      <span className="font-semibold">
                        {item.link ? (
                          <a
                            href={withProtocol(item.link)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline decoration-neutral-400 underline-offset-2"
                          >
                            {item.name || "Project"}
                          </a>
                        ) : (
                          item.name || "Project"
                        )}
                      </span>
                      {item.tech ? (
                        <span className="italic text-neutral-700">
                          {" "}
                          | {item.tech}
                        </span>
                      ) : null}
                    </>
                  }
                  right={dateRangeLabel(item.start, item.end)}
                />
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
    <section className="mt-3.5">
      <h2 className="border-b border-neutral-400 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
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
  italic = false,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
}) {
  if (!left && !right) return null;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          "min-w-0",
          bold && "font-semibold",
          italic && "italic text-neutral-700",
        )}
      >
        {left}
      </span>
      {right ? (
        <span
          className={cn(
            "shrink-0 text-neutral-700",
            italic && "italic",
          )}
        >
          {right}
        </span>
      ) : null}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-neutral-800 marker:text-neutral-500">
      {items.map((text, index) => (
        <li key={index}>{text}</li>
      ))}
    </ul>
  );
}

function Divider() {
  return (
    <span aria-hidden="true" className="text-neutral-400">
      |
    </span>
  );
}

function withProtocol(url: string): string {
  if (/^https?:\/\//i.test(url) || url.startsWith("mailto:")) return url;
  return `https://${url}`;
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
