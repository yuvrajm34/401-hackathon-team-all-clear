# ApplyPath

A job application organizer built for the Fall 2026 hackathon by team **All Clear**.

Applying to a lot of places is a data problem disguised as a motivation problem. ApplyPath keeps the pipeline, the resume versions, and every reply in one place, so the only thing left to do is apply.

Personal data lives in your browser. There is no account and no database — salary notes and interview feedback never leave your machine. Job search proxies live Greenhouse boards through a local route handler so the listings stay small enough to score in the client.

## Getting started

Requires [Node.js](https://nodejs.org) 20 or newer (developed on 25). `node_modules` is not committed, so install dependencies first.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

On first load the dashboard offers **Load sample data**, which fills the app with a realistic pipeline, a message log, and three resumes. It is the fastest way to see everything working.

Other scripts:

```bash
npm run build   # production build (also typechecks)
npm run start   # serve the production build
npm run lint    # eslint
```

### Optional: AI resume parsing & tailoring suggestions (Ollama)

Two features call a local model through [Ollama](https://ollama.com) instead of relying only on the built-in heuristics:

- **Smarter resume upload parsing** — reads whatever sections your resume actually has instead of matching fixed regex patterns.
- **AI tailoring suggestions** — on an application's page, the Keyword match panel gets a "Get suggestions" button that compares your resume against the job description and suggests specific edits.

Both are fully optional. Without Ollama running, resume upload silently falls back to the regular parser and the suggestions button shows an error — nothing else in the app breaks.

To enable them:

1. [Install Ollama](https://ollama.com/download).
2. Pull the model:
   ```bash
   ollama pull llama3.1:8b
   ```
3. Start the Ollama server and leave it running in its own terminal:
   ```bash
   ollama serve
   ```
4. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   The defaults already point at `llama3.1:8b` on `http://localhost:11434`, so no edits are needed unless you're using a different model or host.

**A note on speed:** local inference time depends entirely on your hardware. With a GPU it's usually single-digit seconds; CPU-only can take 30–90+ seconds per request — that's expected, not a bug. If a GPU is present but doesn't seem to be in use (check the terminal running `ollama serve` for `library=CUDA` vs `library=cpu`), restarting `ollama serve` once often fixes detection.

## What it does

### Discovering openings

- A **Discover** page searches live postings from a curated list of companies that publish their boards through Greenhouse's public, keyless API (`boards-api.greenhouse.io`).
- Filter by company, remote, or field (Engineering, Design, Product, and so on). Each card can be scored against your master resume with the same keyword matcher used on applications.
- **Add to wishlist** imports the posting into the pipeline with the description filled in. The same posting cannot be imported twice.

### Tracking applications

- A drag-and-drop Kanban pipeline across five stages: Wishlist, Applied, Interview, Offer, Closed. Every card also has a "move to stage" menu, so the board is fully usable from the keyboard.
- A sortable list view for when you want density instead of a board.
- Search across company, role, location, and notes, plus filters by stage and tag.
- Per application: company, role, location, work mode, posting link, compensation, priority, tags, dates, the job description, and free-form notes.

### Master resume and tailoring

- **Upload a PDF, Word, Overleaf `.tex` (or the Overleaf source zip), or paste the `.tex`** to start or replace the master. Name, email, phone, location, and labeled links (`\href{…}{LinkedIn}`) are filled in automatically; sections land in the structured editor so you can tidy them. When [Ollama is running](#optional-ai-resume-parsing--tailoring-suggestions-ollama), parsing goes through a local model instead of regex heuristics, handling whatever sections your resume actually has rather than a fixed set.
- One **master resume** holds everything you have ever done — every role, every bullet, every skill.
- **Tailored copies** are cloned from the master with IDs preserved. Tailoring is subtractive: hide the bullets that do not fit rather than retyping the ones that do.
- Any line you rewrite is badged `edited` and has a one-click **reset to master**, because the app diffs the copy against its source rather than storing edits separately.
- Exports: **print/PDF** through a dedicated print stylesheet, **`.tex`** as a self-contained Overleaf-ready document, **plain text** for pasting into application portals, and JSON.
- Editable profile links for LinkedIn, GitHub, portfolio, or anything else, with the label driving the icon.
- A rough one-page estimate warns you when a resume has grown past a single sheet.

### Response tracking

- A timeline of every email, call, interview, recruiter message, and portal submission, marked inbound or outbound.
- Logging a reply with an outcome (interview invitation, offer, rejection) **moves the application to the matching stage automatically** — the reply is the strongest signal you have about where things stand, so it drives the board.
- Per-application reminders with due dates, surfaced on the dashboard when they come due.

### Staying motivated

- A weekly application goal with a progress ring, an activity streak, and an eight-week bar chart.
- A conversion funnel showing how many submissions reached an interview and an offer. Reaching a stage is sticky: a rejection after an onsite still counts as an interview, so the funnel does not quietly erase conversations that did not end in an offer.
- **Gone quiet** detection flags applications with no reply after a configurable number of days, and drafts the follow-up email for you, pre-filled with the company and role.
- **Resume win-rate** compares interview rates across resume versions, so you can see which version is actually getting callbacks.

### Keyword match score

Paste a job description and ApplyPath extracts the terms the posting actually emphasises, then checks them against the linked resume. It handles aliases, so `postgres` on your resume matches `PostgreSQL` in the posting and `a11y` matches `accessibility`. Missing terms are clickable — one click drops them into an "Additional skills" group for you to place properly.

It is a heuristic, not a model, and it runs entirely offline.

### AI tailoring suggestions

With Ollama running, an application's Keyword match panel gets a **Get suggestions** button that sends the linked resume and the job description to a local model and gets back specific edits — rewriting a bullet to lead with impact, emphasizing something already true that matches the posting, or flagging a real gap (never suggesting you fabricate experience you don't have). This is separate from the keyword score above, which stays a fast offline heuristic either way.

## Design notes

- **Mobile and desktop.** Sidebar navigation above 768px, a bottom tab bar below it. The Kanban board scrolls horizontally with snap points on phones; the resume editor collapses its two panes into an Edit/Preview toggle.
- **Accessibility.** Every drag has a keyboard equivalent, dialogs trap focus and restore it on close, the sortable table exposes `aria-sort`, charts carry screen-reader summaries, and animations respect `prefers-reduced-motion`.
- **Theming.** Light, dark, and system, driven by `data-theme` on `<html>`. An inline script in the root layout applies the saved preference during HTML parsing, so there is no light-mode flash before React hydrates.
- **Hydration.** The server has no access to localStorage, so pages render a skeleton for one pass and swap in real data via `useSyncExternalStore` once the store has rehydrated.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`, no config file) |
| State | Zustand with `persist` + Immer |
| Drag and drop | `@dnd-kit` |
| Icons | `lucide-react` |
| AI (optional) | Local model via [Ollama](https://ollama.com) (`llama3.1:8b`) |

The stack was picked deliberately to get hands-on with the tools most commonly used in modern web development.

## Project structure

```
src/
├── app/                      # routes: dashboard, discover, applications, resumes, settings
│   └── api/jobs/             # Greenhouse board proxy + search
├── components/
│   ├── applications/         # Kanban, table, detail, forms, comms log, match panel
│   ├── dashboard/            # stats, momentum, funnel, follow-up queue, activity
│   ├── discover/             # live job search and import cards
│   ├── resumes/              # hub, preview, and the section editors
│   ├── layout/               # app shell, nav, theme, hydration gate
│   └── ui/                   # button, panel, fields, drawer, toasts, progress ring
├── lib/
│   ├── types.ts              # domain model, doubles as the persisted schema
│   ├── jobs/                 # Greenhouse client, company list, listing shape
│   ├── resume.ts             # tailoring, master diffing, derived read models
│   ├── keywords.ts           # keyword extraction and match scoring
│   ├── latex.ts              # Overleaf-ready .tex generation with escaping
│   ├── stats.ts              # funnel, momentum, streaks, nudges, win-rate
│   └── demo-data.ts          # sample dataset
└── store/                    # Zustand store and hydration hook
```

## Your data

Stored in localStorage under `applypath:v1`. Clearing site data deletes it, so **Settings → Export backup** writes a JSON snapshot you can re-import on another browser or machine. The schema carries a version number for future migrations.
