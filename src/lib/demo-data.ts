import { addDays, todayIso } from "./dates";
import { createId, nowIso } from "./ids";
import { createResume, tailorFromMaster } from "./resume";
import type {
  AppSnapshot,
  Application,
  Communication,
  Reminder,
  Resume,
} from "./types";
import { SCHEMA_VERSION } from "./types";

/**
 * A believable dataset for demos and first-run exploration. Every date is
 * derived from today so the dashboard always looks current.
 */
export function buildDemoSnapshot(): AppSnapshot {
  const today = todayIso();
  const ago = (days: number) => addDays(today, -days);
  const ahead = (days: number) => addDays(today, days);

  const master = buildMasterResume();
  const stripePath = buildStripeResume(master);
  const figmaPath = buildFigmaResume(master);

  const applications: Application[] = [
    application({
      company: "Stripe",
      position: "Software Engineer Intern",
      location: "Toronto, ON",
      workMode: "hybrid",
      url: "https://stripe.com/jobs",
      salary: "$45/hr",
      stage: "interview",
      dateApplied: ago(19),
      followUpDate: ahead(2),
      priority: 3,
      tags: ["payments", "dream-list"],
      resumeId: stripePath.id,
      jobDescription: STRIPE_JD,
      notes:
        "Recruiter mentioned the team works mostly in Ruby and Go. Technical screen is 45 min of data structures plus API design.",
    }),
    application({
      company: "Figma",
      position: "Frontend Engineer, Growth",
      location: "Remote (Canada)",
      workMode: "remote",
      url: "https://figma.com/careers",
      salary: "$110k - $130k",
      stage: "applied",
      dateApplied: ago(6),
      followUpDate: ahead(4),
      priority: 3,
      tags: ["react", "design-systems"],
      resumeId: figmaPath.id,
      jobDescription: FIGMA_JD,
      notes: "Referred by Priya from the design systems meetup.",
    }),
    application({
      company: "Shopify",
      position: "Backend Developer, Checkout",
      location: "Ottawa, ON",
      workMode: "remote",
      salary: "$105k",
      stage: "applied",
      dateApplied: ago(14),
      priority: 2,
      tags: ["ruby", "e-commerce"],
      resumeId: master.id,
      jobDescription: SHOPIFY_JD,
      notes: "Applied through the careers portal, no confirmation email yet.",
    }),
    application({
      company: "Wealthsimple",
      position: "Full Stack Developer",
      location: "Toronto, ON",
      workMode: "hybrid",
      salary: "$115k",
      stage: "offer",
      dateApplied: ago(31),
      priority: 3,
      tags: ["fintech", "typescript"],
      resumeId: master.id,
      jobDescription: WEALTHSIMPLE_JD,
      notes: "Verbal offer on the call, written offer arrived by email. Need to respond by the end of next week.",
    }),
    application({
      company: "Hootsuite",
      position: "Software Developer, Platform",
      location: "Vancouver, BC",
      workMode: "hybrid",
      stage: "rejected",
      dateApplied: ago(40),
      priority: 1,
      tags: ["platform"],
      resumeId: master.id,
      notes: "Rejected after the take-home. Feedback: wanted more testing depth.",
    }),
    application({
      company: "Notion",
      position: "Product Engineer",
      location: "Remote",
      workMode: "remote",
      stage: "wishlist",
      dateApplied: "",
      priority: 2,
      tags: ["product", "dream-list"],
      notes: "Posting opens again in the fall — set a reminder to check.",
    }),
    application({
      company: "Vercel",
      position: "Developer Experience Engineer",
      location: "Remote",
      workMode: "remote",
      stage: "wishlist",
      dateApplied: "",
      priority: 3,
      tags: ["nextjs", "dx"],
      notes: "Tailor the resume around the Next.js project before applying.",
    }),
    application({
      company: "Ada Support",
      position: "Junior Software Engineer",
      location: "Toronto, ON",
      workMode: "hybrid",
      stage: "applied",
      dateApplied: ago(24),
      priority: 2,
      tags: ["ai", "support"],
      resumeId: master.id,
      notes: "Three weeks of silence — time for a polite nudge.",
    }),
  ];

  const byCompany = (company: string) =>
    applications.find((a) => a.company === company)!.id;

  const communications: Communication[] = [
    communication({
      applicationId: byCompany("Stripe"),
      date: ago(18),
      channel: "email",
      direction: "inbound",
      subject: "Thanks for applying to Stripe",
      body: "Automated confirmation that the application was received.",
      outcome: "none",
    }),
    communication({
      applicationId: byCompany("Stripe"),
      date: ago(9),
      channel: "recruiter",
      direction: "inbound",
      subject: "Phone screen invitation",
      body: "Dana from recruiting asked for availability this week for a 30 minute intro call.",
      outcome: "interview_invite",
    }),
    communication({
      applicationId: byCompany("Stripe"),
      date: ago(8),
      channel: "email",
      direction: "outbound",
      subject: "Re: Phone screen invitation",
      body: "Sent availability for Tuesday and Thursday afternoon.",
      outcome: "none",
    }),
    communication({
      applicationId: byCompany("Stripe"),
      date: ago(4),
      channel: "interview",
      direction: "inbound",
      subject: "Technical screen completed",
      body: "45 minutes with Marcus. Two array problems and a short API design discussion. Next step is an onsite loop.",
      outcome: "none",
    }),
    communication({
      applicationId: byCompany("Figma"),
      date: ago(6),
      channel: "portal",
      direction: "outbound",
      subject: "Application submitted",
      body: "Submitted with the Figma-tailored resume and mentioned Priya as the referral.",
      outcome: "none",
    }),
    communication({
      applicationId: byCompany("Wealthsimple"),
      date: ago(20),
      channel: "interview",
      direction: "inbound",
      subject: "Final round loop",
      body: "Three rounds: system design, pairing exercise, and a values conversation.",
      outcome: "none",
    }),
    communication({
      applicationId: byCompany("Wealthsimple"),
      date: ago(5),
      channel: "email",
      direction: "inbound",
      subject: "Offer of employment",
      body: "Written offer attached: $115k base, four weeks vacation, start date flexible. Response requested within two weeks.",
      outcome: "offer",
    }),
    communication({
      applicationId: byCompany("Hootsuite"),
      date: ago(28),
      channel: "email",
      direction: "inbound",
      subject: "Update on your application",
      body: "Moving forward with other candidates. Offered to keep the resume on file.",
      outcome: "rejection",
    }),
    communication({
      applicationId: byCompany("Shopify"),
      date: ago(14),
      channel: "portal",
      direction: "outbound",
      subject: "Application submitted",
      body: "Submitted the master resume through the Shopify careers portal.",
      outcome: "none",
    }),
  ];

  const reminders: Reminder[] = [
    reminder({
      applicationId: byCompany("Stripe"),
      title: "Prep system design notes for the onsite loop",
      dueDate: ahead(1),
    }),
    reminder({
      applicationId: byCompany("Wealthsimple"),
      title: "Decide on the offer and reply to Sam",
      dueDate: ahead(6),
    }),
    reminder({
      applicationId: byCompany("Ada Support"),
      title: "Send a follow-up email to the hiring manager",
      dueDate: ago(1),
    }),
    reminder({
      applicationId: byCompany("Notion"),
      title: "Check whether the Product Engineer posting reopened",
      dueDate: ahead(12),
    }),
    reminder({
      applicationId: byCompany("Figma"),
      title: "Thank Priya for the referral",
      dueDate: ago(3),
      done: true,
    }),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    applications,
    communications,
    reminders,
    resumes: [master, stripePath, figmaPath],
    settings: {
      weeklyGoal: 5,
      followUpAfterDays: 10,
      theme: "system",
      ownerName: "Alex Rivera",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Builders                                  */
/* -------------------------------------------------------------------------- */

function application(
  input: Partial<Application> & Pick<Application, "company" | "position">,
): Application {
  const timestamp = nowIso();
  return {
    id: createId("app"),
    company: input.company,
    position: input.position,
    location: input.location ?? "",
    workMode: input.workMode ?? "unknown",
    url: input.url ?? "",
    salary: input.salary ?? "",
    stage: input.stage ?? "applied",
    dateApplied: input.dateApplied ?? todayIso(),
    followUpDate: input.followUpDate ?? "",
    jobDescription: input.jobDescription ?? "",
    notes: input.notes ?? "",
    tags: input.tags ?? [],
    resumeId: input.resumeId ?? null,
    priority: input.priority ?? 2,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function communication(
  input: Omit<Communication, "id" | "createdAt">,
): Communication {
  return { ...input, id: createId("com"), createdAt: nowIso() };
}

function reminder(
  input: Omit<Reminder, "id" | "createdAt" | "done"> & { done?: boolean },
): Reminder {
  return {
    ...input,
    done: input.done ?? false,
    id: createId("rem"),
    createdAt: nowIso(),
  };
}

function buildMasterResume(): Resume {
  const resume = createResume({ name: "Master resume", isMaster: true });

  resume.profile = {
    fullName: "Alex Rivera",
    headline: "Full stack developer",
    email: "alex.rivera@example.com",
    phone: "(416) 555-0184",
    location: "Toronto, ON",
    links: [
      { id: createId("lnk"), label: "LinkedIn", url: "linkedin.com/in/alexrivera" },
      { id: createId("lnk"), label: "GitHub", url: "github.com/alexrivera" },
      { id: createId("lnk"), label: "Portfolio", url: "alexrivera.dev" },
    ],
  };

  resume.summary =
    "Full stack developer with three years of internship and contract experience shipping TypeScript and Python services. Comfortable owning a feature from database schema through to accessible UI.";

  resume.experience = [
    {
      id: createId("exp"),
      company: "Northwind Analytics",
      role: "Software Engineer Intern",
      location: "Toronto, ON",
      start: "May 2025",
      end: "Aug 2025",
      enabled: true,
      bullets: [
        bullet(
          "Rebuilt the reporting dashboard in React and TypeScript, cutting median page load from 4.1s to 1.3s for 8,000 weekly users.",
        ),
        bullet(
          "Designed a PostgreSQL aggregation layer with materialised views that replaced 12 ad hoc queries and removed a nightly cron job.",
        ),
        bullet(
          "Added Playwright coverage for the three highest-traffic flows, catching four regressions before release.",
        ),
        bullet(
          "Paired with the design team to bring the component library to WCAG 2.1 AA, including keyboard navigation and focus management.",
        ),
      ],
    },
    {
      id: createId("exp"),
      company: "Riverbank Credit Union",
      role: "Backend Developer (Contract)",
      location: "Remote",
      start: "Sep 2024",
      end: "Apr 2025",
      enabled: true,
      bullets: [
        bullet(
          "Built a Django REST service for member onboarding that processed 1,200 applications per month with zero downtime deploys.",
        ),
        bullet(
          "Introduced idempotency keys to the payments endpoint, eliminating duplicate transfer reports from support.",
        ),
        bullet(
          "Wrote the runbook and Grafana dashboards the on-call rotation still uses.",
        ),
      ],
    },
    {
      id: createId("exp"),
      company: "University of Toronto",
      role: "Teaching Assistant, Intro to Databases",
      location: "Toronto, ON",
      start: "Jan 2024",
      end: "Apr 2024",
      enabled: true,
      bullets: [
        bullet(
          "Ran weekly tutorials on SQL and normalisation for 60 students and rewrote two lab handouts.",
        ),
        bullet("Graded 180 assignments with written feedback within 48 hours."),
      ],
    },
  ];

  resume.projects = [
    {
      id: createId("prj"),
      name: "ApplyPath",
      tech: "Next.js, TypeScript, Tailwind CSS",
      link: "github.com/alexrivera/applypath",
      start: "2026",
      end: "",
      enabled: true,
      bullets: [
        bullet(
          "Built an offline-first job application tracker with a drag-and-drop pipeline, resume tailoring, and LaTeX export.",
        ),
        bullet(
          "Implemented a keyword scorer that compares a tailored resume against the job description and surfaces gaps.",
        ),
      ],
    },
    {
      id: createId("prj"),
      name: "Transit Delay Bot",
      tech: "Python, FastAPI, Redis",
      link: "github.com/alexrivera/transit-delay-bot",
      start: "2025",
      end: "",
      enabled: true,
      bullets: [
        bullet(
          "Streamed GTFS feeds into Redis and pushed delay alerts to 400 subscribers with a 30 second median lag.",
        ),
      ],
    },
  ];

  resume.education = [
    {
      id: createId("edu"),
      school: "University of Toronto",
      degree: "BSc Computer Science, Minor in Statistics",
      location: "Toronto, ON",
      start: "Sep 2022",
      end: "Apr 2026",
      details: "GPA 3.8/4.0. Dean's List 2024 and 2025.",
      enabled: true,
    },
  ];

  resume.skills = [
    {
      id: createId("skl"),
      label: "Languages",
      skills: ["TypeScript", "JavaScript", "Python", "SQL", "Ruby", "Go"],
      enabled: true,
    },
    {
      id: createId("skl"),
      label: "Frameworks",
      skills: ["React", "Next.js", "Node.js", "Django", "FastAPI", "Rails"],
      enabled: true,
    },
    {
      id: createId("skl"),
      label: "Tools",
      skills: [
        "PostgreSQL",
        "Redis",
        "Docker",
        "Git",
        "GitHub Actions",
        "Playwright",
        "AWS",
      ],
      enabled: true,
    },
  ];

  return resume;
}

/** Tailored for a payments-heavy backend role: leans on Ruby, Go, and APIs. */
function buildStripeResume(master: Resume): Resume {
  const resume = tailorFromMaster(master, {
    name: "Stripe — SWE Intern",
    targetApplicationId: null,
  });

  resume.summary =
    "Full stack developer focused on payments infrastructure and reliable APIs. Shipped an idempotent transfers endpoint for a credit union and enjoy the details of money movement.";

  const riverbank = resume.experience[1];
  riverbank.bullets[1].text =
    "Made the payments endpoint idempotent with request keys and a replay-safe ledger write, eliminating duplicate transfer reports entirely.";
  riverbank.bullets.push(
    bullet(
      "Reconciled a daily settlement file against the ledger in Python, catching a $4,100 mismatch in the first week.",
    ),
  );

  // Teaching assistant role is the weakest signal for this team.
  resume.experience[2].enabled = false;
  // Keep the transit bot out; the payments story is stronger on its own.
  resume.projects[1].enabled = false;

  resume.skills[0].skills = ["Ruby", "Go", "TypeScript", "Python", "SQL"];

  return resume;
}

/** Tailored for a frontend growth role: accessibility and UI performance first. */
function buildFigmaResume(master: Resume): Resume {
  const resume = tailorFromMaster(master, {
    name: "Figma — Frontend Growth",
    targetApplicationId: null,
  });

  resume.summary =
    "Frontend developer who cares about design systems, accessibility, and the measurable speed of a page. Rebuilt a reporting dashboard that got three times faster and became keyboard navigable.";

  const northwind = resume.experience[0];
  northwind.bullets[0].text =
    "Rebuilt the reporting dashboard in React and TypeScript with route-level code splitting, cutting median load from 4.1s to 1.3s for 8,000 weekly users.";
  // Database plumbing matters less than the UI story here.
  northwind.bullets[1].enabled = false;

  resume.experience[1].bullets[1].enabled = false;
  resume.skills[1].skills = [
    "React",
    "Next.js",
    "Tailwind CSS",
    "Storybook",
    "Node.js",
  ];

  return resume;
}

function bullet(text: string) {
  return { id: createId("bul"), text, enabled: true };
}

/* -------------------------------------------------------------------------- */
/*                             Job description text                           */
/* -------------------------------------------------------------------------- */

const STRIPE_JD = `Software Engineer Intern, Payments

We are looking for an intern to join a team that builds the APIs behind money movement. You will write production code, review pull requests, and own a project end to end.

What you will do
- Build and maintain backend services in Ruby and Go
- Design REST APIs with careful attention to idempotency and error handling
- Work with PostgreSQL, including schema design and query optimisation
- Write tests and participate in code review

What we look for
- Strong fundamentals in data structures and algorithms
- Experience with at least one backend framework
- Familiarity with SQL databases and distributed systems concepts
- Clear written communication and a bias toward shipping
- Interest in payments, financial infrastructure, or ledgers`;

const FIGMA_JD = `Frontend Engineer, Growth

Our growth team builds the surfaces that help new users understand Figma. You will run experiments, ship polished interfaces, and obsess over performance.

Responsibilities
- Build accessible, responsive interfaces with React and TypeScript
- Contribute to and extend our design system and component library
- Instrument and analyse A/B experiments
- Improve Core Web Vitals across marketing and onboarding pages

Requirements
- Deep experience with React, TypeScript, and modern CSS
- Working knowledge of accessibility standards such as WCAG
- Comfort with performance profiling and web vitals
- Experience with Next.js or a similar framework
- A portfolio of interfaces you are proud of`;

const SHOPIFY_JD = `Backend Developer, Checkout

Checkout is the most critical surface at Shopify. We are hiring developers to work on the services that process every order.

You will
- Write Ruby on Rails services that handle high request volume
- Model complex domains in PostgreSQL and MySQL
- Improve observability with metrics, tracing, and structured logging
- Collaborate with product and design on merchant-facing features

We are looking for
- Production experience with Ruby, Rails, or a comparable backend stack
- Solid understanding of relational databases and caching
- Experience with GraphQL or REST API design
- A track record of testing and refactoring legacy code`;

const WEALTHSIMPLE_JD = `Full Stack Developer

Join a small team that owns both the API and the client for our investing products.

What the role involves
- Building features in TypeScript across React and Node.js
- Designing GraphQL schemas and resolvers
- Writing integration tests and improving CI reliability
- Partnering with compliance on regulated workflows

What helps you succeed
- Strong TypeScript and React experience
- Familiarity with PostgreSQL and Docker
- Interest in fintech and personal finance
- Comfort working across the stack with minimal hand-off`;
