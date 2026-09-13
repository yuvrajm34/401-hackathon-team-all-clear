"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { addDays, todayIso } from "@/lib/dates";
import { createId, nowIso } from "@/lib/ids";
import { buildDemoSnapshot } from "@/lib/demo-data";
import { writeListingPreview } from "@/lib/jobs/listing-id";
import type { JobListing } from "@/lib/jobs/types";
import { normalizeUrl } from "@/lib/jobs/url";
import {
  applyParsedToResume,
  createResume,
  tailorFromMaster,
  type ResumeDiff,
} from "@/lib/resume";
import type { ParsedResume } from "@/lib/resume-parse";
import { stageForOutcome } from "@/lib/stages";
import {
  SCHEMA_VERSION,
  type AppSnapshot,
  type Application,
  type Communication,
  type Reminder,
  type Resume,
  type Settings,
  type Stage,
} from "@/lib/types";

export const STORAGE_KEY = "applypath:v1";
export const MASTER_RESUME_ID = "res_master";

export const DEFAULT_SETTINGS: Settings = {
  weeklyGoal: 5,
  followUpAfterDays: 10,
  theme: "dark",
  atmosphere: "apple",
  atmosphereImage: "",
  atmosphereDim: 55,
  ownerName: "",
  includeDemoJobs: false,
};

interface DataState {
  applications: Application[];
  communications: Communication[];
  reminders: Reminder[];
  resumes: Resume[];
  settings: Settings;
  /** Listings opened from Discover before they're tracked anywhere, keyed
   * by `JobListing.id` — lets the application detail route render a
   * read-only preview without creating a real application just from being
   * viewed. Session-only: deliberately left out of `partialize` below, so
   * it's never written to localStorage or round-tripped through
   * export/import. */
  discoverPreviews: Record<string, JobListing>;
}

export type NewApplicationInput = Partial<
  Omit<Application, "id" | "createdAt" | "updatedAt">
> &
  Pick<Application, "company" | "position">;

export type NewCommunicationInput = Omit<
  Communication,
  "id" | "createdAt"
>;

interface Actions {
  /* Applications */
  addApplication: (input: NewApplicationInput) => string;
  /** Returns the new id, or `null` when this posting is already tracked. */
  importJobListing: (listing: JobListing) => string | null;
  /** Caches a listing so `/applications/{listing.id}` can render a preview
   * before it's tracked — see `discoverPreviews` on `DataState`. */
  setDiscoverPreview: (listing: JobListing) => void;
  updateApplication: (
    id: string,
    patch: Partial<Omit<Application, "id" | "createdAt">>,
  ) => void;
  moveApplicationToStage: (id: string, stage: Stage) => void;
  deleteApplication: (id: string) => void;

  /* Communications */
  addCommunication: (input: NewCommunicationInput) => string;
  deleteCommunication: (id: string) => void;

  /* Reminders */
  addReminder: (input: {
    applicationId: string;
    title: string;
    dueDate: string;
  }) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;

  /* Resumes */
  createMasterResume: () => string;
  /** Fills the master from an uploaded file. Creates one if none exists. */
  applyParsedMaster: (parsed: ParsedResume) => {
    id: string;
    applied: string[];
  };
  updateResume: (id: string, recipe: (resume: Resume) => void) => void;
  renameResume: (id: string, name: string) => void;
  duplicateResume: (id: string) => string | null;
  deleteResume: (id: string) => void;
  tailorResume: (args: {
    masterId: string;
    applicationId: string | null;
    name: string;
  }) => string | null;
  promoteToMaster: (id: string) => void;

  /* Settings + bulk data */
  updateSettings: (patch: Partial<Settings>) => void;
  loadDemoData: () => void;
  resetAll: () => void;
  importSnapshot: (snapshot: AppSnapshot) => void;
  exportSnapshot: () => AppSnapshot;
}

export type AppStore = DataState & Actions;

function emptyState(): DataState {
  return {
    applications: [],
    communications: [],
    reminders: [],
    resumes: [],
    settings: { ...DEFAULT_SETTINGS },
    discoverPreviews: {},
  };
}

function touch(application: Application) {
  application.updatedAt = nowIso();
}

/** "Data Science" -> "data-science", matching the tags used elsewhere. */
function slugifyTag(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      ...emptyState(),

      /* ---------------------------- Applications ---------------------------- */

      addApplication: (input) => {
        const id = createId("app");
        const timestamp = nowIso();
        const stage: Stage = input.stage ?? "applied";

        set((state) => {
          state.applications.unshift({
            id,
            company: input.company.trim(),
            position: input.position.trim(),
            location: input.location?.trim() ?? "",
            workMode: input.workMode ?? "unknown",
            url: input.url?.trim() ?? "",
            salary: input.salary?.trim() ?? "",
            stage,
            dateApplied:
              input.dateApplied ?? (stage === "wishlist" ? "" : todayIso()),
            followUpDate: input.followUpDate ?? "",
            jobDescription: input.jobDescription ?? "",
            notes: input.notes ?? "",
            tags: input.tags ?? [],
            resumeId: input.resumeId ?? null,
            priority: input.priority ?? 2,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        });

        return id;
      },

      /**
       * Adds a posting found in Discover to the pipeline as a wishlist item,
       * which leaves `dateApplied` empty until the user actually applies.
       */
      importJobListing: (listing) => {
        const target = normalizeUrl(listing.url);
        const alreadyTracked = get().applications.some(
          (application) =>
            application.url && normalizeUrl(application.url) === target,
        );
        if (alreadyTracked) return null;

        const tag = slugifyTag(listing.department);

        return get().addApplication({
          company: listing.company,
          position: listing.position,
          location: listing.location,
          workMode: listing.workMode,
          url: listing.url,
          stage: "wishlist",
          jobDescription: listing.description,
          tags: tag ? [tag] : [],
        });
      },

      setDiscoverPreview: (listing) => {
        writeListingPreview(listing);
        set((state) => {
          state.discoverPreviews[listing.id] = listing;
        });
      },

      updateApplication: (id, patch) => {
        set((state) => {
          const application = state.applications.find((a) => a.id === id);
          if (!application) return;
          Object.assign(application, patch);
          touch(application);
        });
      },

      moveApplicationToStage: (id, stage) => {
        set((state) => {
          const application = state.applications.find((a) => a.id === id);
          if (!application || application.stage === stage) return;

          application.stage = stage;

          // Leaving the wishlist counts as applying, so stamp the date.
          if (stage !== "wishlist" && !application.dateApplied) {
            application.dateApplied = todayIso();
          }
          // Closed applications no longer need a nudge.
          if (stage === "rejected" || stage === "offer") {
            application.followUpDate = "";
          }
          touch(application);
        });
      },

      deleteApplication: (id) => {
        set((state) => {
          state.applications = state.applications.filter((a) => a.id !== id);
          state.communications = state.communications.filter(
            (c) => c.applicationId !== id,
          );
          state.reminders = state.reminders.filter(
            (r) => r.applicationId !== id,
          );
          // Tailored resumes outlive the application; just unlink them.
          for (const resume of state.resumes) {
            if (resume.targetApplicationId === id) {
              resume.targetApplicationId = null;
            }
          }
        });
      },

      /* --------------------------- Communications --------------------------- */

      addCommunication: (input) => {
        const id = createId("com");

        set((state) => {
          state.communications.unshift({ ...input, id, createdAt: nowIso() });

          const application = state.applications.find(
            (a) => a.id === input.applicationId,
          );
          if (!application) return;

          // A logged reply is the strongest signal we have about where an
          // application stands, so let it drive the stage automatically.
          const nextStage = stageForOutcome(input.outcome);
          if (nextStage && application.stage !== nextStage) {
            application.stage = nextStage;
            if (!application.dateApplied) application.dateApplied = todayIso();
          }

          if (input.outcome === "rejection" || input.outcome === "offer") {
            application.followUpDate = "";
          } else if (input.direction === "outbound" && !application.followUpDate) {
            application.followUpDate = addDays(input.date, 7);
          }

          touch(application);
        });

        return id;
      },

      deleteCommunication: (id) => {
        set((state) => {
          state.communications = state.communications.filter((c) => c.id !== id);
        });
      },

      /* ------------------------------ Reminders ----------------------------- */

      addReminder: ({ applicationId, title, dueDate }) => {
        set((state) => {
          state.reminders.push({
            id: createId("rem"),
            applicationId,
            title: title.trim(),
            dueDate,
            done: false,
            createdAt: nowIso(),
          });
        });
      },

      toggleReminder: (id) => {
        set((state) => {
          const reminder = state.reminders.find((r) => r.id === id);
          if (reminder) reminder.done = !reminder.done;
        });
      },

      deleteReminder: (id) => {
        set((state) => {
          state.reminders = state.reminders.filter((r) => r.id !== id);
        });
      },

      /* ------------------------------- Resumes ------------------------------ */

      createMasterResume: () => {
        const existing = get().resumes.find((r) => r.isMaster);
        if (existing) return existing.id;

        const resume = createResume({
          name: "Master resume",
          isMaster: true,
          ownerName: get().settings.ownerName,
        });
        resume.id = MASTER_RESUME_ID;

        set((state) => {
          state.resumes.push(resume);
        });

        return resume.id;
      },

      applyParsedMaster: (parsed) => {
        const id = get().createMasterResume();
        let applied: string[] = [];

        set((state) => {
          const resume = state.resumes.find((item) => item.id === id);
          if (!resume) return;
          applied = applyParsedToResume(resume, parsed);
          resume.updatedAt = nowIso();
          if (parsed.profile.fullName.trim()) {
            state.settings.ownerName = parsed.profile.fullName.trim();
          }
        });

        return { id, applied };
      },

      updateResume: (id, recipe) => {
        set((state) => {
          const resume = state.resumes.find((r) => r.id === id);
          if (!resume) return;
          recipe(resume);
          resume.updatedAt = nowIso();
        });
      },

      renameResume: (id, name) => {
        set((state) => {
          const resume = state.resumes.find((r) => r.id === id);
          if (!resume) return;
          resume.name = name;
          resume.updatedAt = nowIso();
        });
      },

      duplicateResume: (id) => {
        const source = get().resumes.find((r) => r.id === id);
        if (!source) return null;

        const copy = tailorFromMaster(source, {
          name: `${source.name} (copy)`,
          targetApplicationId: null,
        });
        copy.derivedFromId = source.derivedFromId ?? source.id;

        set((state) => {
          state.resumes.push(copy);
        });

        return copy.id;
      },

      deleteResume: (id) => {
        set((state) => {
          state.resumes = state.resumes.filter((r) => r.id !== id);
          for (const application of state.applications) {
            if (application.resumeId === id) application.resumeId = null;
          }
        });
      },

      tailorResume: ({ masterId, applicationId, name }) => {
        const master = get().resumes.find((r) => r.id === masterId);
        if (!master) return null;

        const tailored = tailorFromMaster(master, {
          name,
          targetApplicationId: applicationId,
        });

        set((state) => {
          state.resumes.push(tailored);
          if (applicationId) {
            const application = state.applications.find(
              (a) => a.id === applicationId,
            );
            if (application) {
              application.resumeId = tailored.id;
              touch(application);
            }
          }
        });

        return tailored.id;
      },

      promoteToMaster: (id) => {
        set((state) => {
          for (const resume of state.resumes) {
            resume.isMaster = resume.id === id;
            if (resume.id === id) {
              resume.derivedFromId = null;
              resume.targetApplicationId = null;
              resume.updatedAt = nowIso();
            }
          }
        });
      },

      /* ------------------------ Settings and bulk data ---------------------- */

      updateSettings: (patch) => {
        set((state) => {
          Object.assign(state.settings, patch);
        });
      },

      loadDemoData: () => {
        const demo = buildDemoSnapshot();
        set((state) => {
          state.applications = demo.applications;
          state.communications = demo.communications;
          state.reminders = demo.reminders;
          state.resumes = demo.resumes;
          state.settings = { ...state.settings, ...demo.settings };
        });
      },

      resetAll: () => {
        const theme = get().settings.theme;
        const atmosphere = get().settings.atmosphere;
        const atmosphereImage = get().settings.atmosphereImage;
        const atmosphereDim = get().settings.atmosphereDim;
        set((state) => {
          const fresh = emptyState();
          state.applications = fresh.applications;
          state.communications = fresh.communications;
          state.reminders = fresh.reminders;
          state.resumes = fresh.resumes;
          state.settings = {
            ...fresh.settings,
            theme,
            atmosphere,
            atmosphereImage,
            atmosphereDim,
          };
        });
      },

      importSnapshot: (snapshot) => {
        set((state) => {
          state.applications = snapshot.applications ?? [];
          state.communications = snapshot.communications ?? [];
          state.reminders = snapshot.reminders ?? [];
          state.resumes = snapshot.resumes ?? [];
          state.settings = { ...DEFAULT_SETTINGS, ...snapshot.settings };
        });
      },

      exportSnapshot: () => {
        const { applications, communications, reminders, resumes, settings } =
          get();
        return {
          schemaVersion: SCHEMA_VERSION,
          exportedAt: nowIso(),
          applications,
          communications,
          reminders,
          resumes,
          settings,
        };
      },
    })),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (state) => ({
        applications: state.applications,
        communications: state.communications,
        reminders: state.reminders,
        resumes: state.resumes,
        settings: state.settings,
      }),
      merge: (persisted, current) => {
        const incoming = persisted as Partial<AppStore> | undefined;
        return {
          ...current,
          ...incoming,
          settings: {
            ...current.settings,
            ...incoming?.settings,
            includeDemoJobs:
              typeof incoming?.settings?.includeDemoJobs === "boolean"
                ? incoming.settings.includeDemoJobs
                : incoming?.settings?.ownerName === "Alex Rivera",
          },
        };
      },
    },
  ),
);

/* -------------------------------------------------------------------------- */
/*                                  Selectors                                 */
/* -------------------------------------------------------------------------- */

export const selectMasterResume = (state: AppStore): Resume | undefined =>
  state.resumes.find((r) => r.isMaster);

export const selectResumeById =
  (id: string) =>
  (state: AppStore): Resume | undefined =>
    state.resumes.find((r) => r.id === id);

export const selectApplicationById =
  (id: string) =>
  (state: AppStore): Application | undefined =>
    state.applications.find((a) => a.id === id);

export type { ResumeDiff };
