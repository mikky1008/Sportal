// Athlete profile edits with persistence.
//
// PROTOTYPE LIMIT: edits live in this browser's localStorage, so they don't follow the athlete to
// another device and can be changed in devtools. Swap this module's storage for an API (and run
// the same `validateProfile` on the server) when real accounts exist.
//
// Only the fields in EDITABLE_KEYS can be edited. rank, performanceScore, consistency, id and role
// belong to the system: they are never read from storage and never accepted from a draft.

import { useSyncExternalStore } from "react";
import { currentAthlete, sports } from "@/data/mock";
import type { Athlete, DirectoryAthlete, TeamStatus } from "@/types";
import { activeAccount, scopeStamp, scopedKey } from "@/lib/accountScope";

const BASE_KEY = "sportal.profile.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const TEAM_STATUSES: TeamStatus[] = [
  "Varsity",
  "Junior Varsity",
  "Reserve",
  "Club / Community",
  "Not on a team",
];

export const LIMITS = {
  name: 40,
  position: 40,
  school: 100,
  year: 60,
  teamName: 60,
  bio: 300,
  achievementTitle: 80,
  achievements: 10,
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 200 },
  firstAchievementYear: 1990,
} as const;

type Editable = Pick<
  Athlete,
  | "firstName"
  | "lastName"
  | "sport"
  | "position"
  | "school"
  | "year"
  | "height"
  | "weight"
  | "bio"
  | "teamStatus"
  | "achievements"
> & { teamName: string };

/** What the Settings form holds: everything as text, exactly as typed. */
export interface ProfileDraft {
  firstName: string;
  lastName: string;
  sport: string;
  position: string;
  school: string;
  year: string;
  heightCm: string;
  weightKg: string;
  teamStatus: TeamStatus;
  teamName: string;
  bio: string;
  achievements: { title: string; year: string }[];
}

export type ProfileErrors = Partial<Record<Exclude<keyof ProfileDraft, "achievements">, string>> & {
  /** one entry per achievement row (empty string = row is fine) */
  achievements?: string[];
  achievementsTotal?: string;
};

export class ProfileValidationError extends Error {
  constructor(public readonly errors: ProfileErrors) {
    super("Profile has errors");
    this.name = "ProfileValidationError";
  }
}

// ---------- height / weight helpers ----------

export function formatHeight(cm: number): string {
  const totalIn = Math.round(cm / 2.54);
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}" (${Math.round(cm)} cm)`;
}
export function formatWeight(kg: number): string {
  return `${Math.round(kg * 10) / 10} kg`;
}
/** Reads "5'11\" (180 cm)" → 180. Returns null when no cm figure is present. */
export function parseHeightCm(s: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*cm/i.exec(s);
  return m ? Number(m[1]) : null;
}
export function parseWeightKg(s: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*kg/i.exec(s);
  return m ? Number(m[1]) : null;
}

// ---------- validation ----------

function parseNumber(s: string): number | null {
  const t = s.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/**
 * `partial` lets a brand-new profile be saved one section at a time: an empty field is simply "not
 * done yet", but anything that IS filled in must still be valid. It is on for accounts made on the
 * Sign up page (they start blank) and off for the original sample account, whose rules are unchanged.
 */
export function validateProfile(
  d: ProfileDraft,
  now: Date = new Date(),
  partial: boolean = activeAccount() !== null,
): ProfileErrors {
  const e: ProfileErrors = {};
  const req = (key: "firstName" | "lastName" | "school" | "sport", label: string, max: number) => {
    const v = d[key].trim();
    if (!v) {
      if (!partial) e[key] = `${label} is required.`;
    } else if (v.length > max) e[key] = `${label} must be ${max} characters or fewer.`;
  };
  req("firstName", "First name", LIMITS.name);
  req("lastName", "Last name", LIMITS.name);
  req("school", "School", LIMITS.school);
  req("sport", "Sport", 60);
  if (!e.sport && !(partial && !d.sport.trim()) && !sports.some((s) => s.name === d.sport))
    e.sport = "Choose a sport from the list.";

  if (d.position.trim().length > LIMITS.position)
    e.position = `Position must be ${LIMITS.position} characters or fewer.`;
  if (d.year.trim().length > LIMITS.year)
    e.year = `Year level must be ${LIMITS.year} characters or fewer.`;
  if (d.bio.length > LIMITS.bio)
    e.bio = `Bio must be ${LIMITS.bio} characters or fewer (${d.bio.length} now).`;

  const h = parseNumber(d.heightCm);
  if (!(partial && !d.heightCm.trim()) && (h === null || h < LIMITS.heightCm.min || h > LIMITS.heightCm.max))
    e.heightCm = `Enter a height between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max} cm.`;
  const w = parseNumber(d.weightKg);
  if (!(partial && !d.weightKg.trim()) && (w === null || w < LIMITS.weightKg.min || w > LIMITS.weightKg.max))
    e.weightKg = `Enter a weight between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`;

  if (!(partial && !d.teamStatus) && !TEAM_STATUSES.includes(d.teamStatus)) e.teamStatus = "Choose a team status.";
  if (d.teamStatus !== "Not on a team" && d.teamName.trim().length > LIMITS.teamName)
    e.teamName = `Team name must be ${LIMITS.teamName} characters or fewer.`;

  if (d.achievements.length > LIMITS.achievements)
    e.achievementsTotal = `You can list up to ${LIMITS.achievements} achievements.`;
  const maxYear = now.getFullYear() + 1;
  const rows = d.achievements.map((a) => {
    const title = a.title.trim();
    if (!title) return "Give this achievement a title.";
    if (title.length > LIMITS.achievementTitle)
      return `Title must be ${LIMITS.achievementTitle} characters or fewer.`;
    const y = a.year.trim();
    if (!/^\d{4}$/.test(y) || Number(y) < LIMITS.firstAchievementYear || Number(y) > maxYear)
      return `Year must be between ${LIMITS.firstAchievementYear} and ${maxYear}.`;
    return "";
  });
  if (rows.some(Boolean)) e.achievements = rows;
  return e;
}

export function hasErrors(e: ProfileErrors): boolean {
  return Object.keys(e).length > 0;
}

// ---------- conversion ----------

export function toDraft(a: Athlete): ProfileDraft {
  const h = parseHeightCm(a.height);
  const w = parseWeightKg(a.weight);
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    sport: a.sport,
    position: a.position,
    school: a.school,
    year: a.year,
    heightCm: h === null ? "" : String(h),
    weightKg: w === null ? "" : String(w),
    teamStatus: a.teamStatus,
    teamName: a.teamName ?? "",
    bio: a.bio,
    achievements: a.achievements.map((x) => ({ ...x })),
  };
}

function fromDraft(d: ProfileDraft): Editable {
  const status = d.teamStatus;
  return {
    firstName: d.firstName.trim(),
    lastName: d.lastName.trim(),
    sport: d.sport,
    position: d.position.trim(),
    school: d.school.trim(),
    year: d.year.trim(),
    height: d.heightCm.trim() ? formatHeight(Number(d.heightCm)) : "",
    weight: d.weightKg.trim() ? formatWeight(Number(d.weightKg)) : "",
    bio: d.bio.trim(),
    teamStatus: status,
    teamName: status === "Not on a team" ? "" : d.teamName.trim(),
    achievements: d.achievements.map((a) => ({ title: a.title.trim(), year: a.year.trim() })),
  };
}

/**
 * Reads saved edits defensively. Each field is accepted only if it is the right type and passes
 * the same rules as a save; anything else falls back to the seed value. Older saves that predate
 * a field (e.g. teamStatus) simply keep the seed's value for it.
 */
function readEdits(raw: unknown, seed: Athlete, now: Date): Partial<Editable> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const base = toDraft(seed);
  const str = (k: string): string | undefined =>
    typeof r[k] === "string" ? (r[k] as string) : undefined;

  const draft: ProfileDraft = {
    ...base,
    firstName: str("firstName") ?? base.firstName,
    lastName: str("lastName") ?? base.lastName,
    sport: str("sport") ?? base.sport,
    position: str("position") ?? base.position,
    school: str("school") ?? base.school,
    year: str("year") ?? base.year,
    bio: str("bio") ?? base.bio,
    teamName: str("teamName") ?? base.teamName,
  };
  const height = str("height");
  if (height !== undefined) draft.heightCm = String(parseHeightCm(height) ?? "");
  const weight = str("weight");
  if (weight !== undefined) draft.weightKg = String(parseWeightKg(weight) ?? "");
  const status = str("teamStatus");
  if (status !== undefined && (TEAM_STATUSES as string[]).includes(status))
    draft.teamStatus = status as TeamStatus;
  const ach = r["achievements"];
  if (Array.isArray(ach)) {
    draft.achievements = ach
      .filter(
        (x): x is { title: string; year: string } =>
          !!x &&
          typeof x === "object" &&
          typeof (x as { title?: unknown }).title === "string" &&
          typeof (x as { year?: unknown }).year === "string",
      )
      .map((x) => ({ title: x.title, year: x.year }));
  }

  // Keep the field-by-field good parts; replace any invalid field with the seed's value.
  const errs = validateProfile(draft, now);
  const pick = <K extends keyof ProfileDraft>(k: K): ProfileDraft[K] =>
    errs[k as keyof ProfileErrors] ? base[k] : draft[k];
  const safe: ProfileDraft = {
    firstName: pick("firstName"),
    lastName: pick("lastName"),
    sport: pick("sport"),
    position: pick("position"),
    school: pick("school"),
    year: pick("year"),
    heightCm: pick("heightCm"),
    weightKg: pick("weightKg"),
    teamStatus: pick("teamStatus"),
    teamName: pick("teamName"),
    bio: pick("bio"),
    achievements:
      errs.achievements || errs.achievementsTotal ? base.achievements : draft.achievements,
  };
  return fromDraft(safe);
}

// ---------- store ----------

/** What a brand-new account starts with: its name, and nothing else filled in. */
export function blankAthlete(seed: Athlete, firstName: string, lastName: string): Athlete {
  return {
    ...seed,
    id: `new-${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    firstName,
    lastName,
    sport: "",
    position: "",
    school: "",
    year: "",
    height: "",
    weight: "",
    bio: "",
    rank: 0,
    performanceScore: 0,
    consistency: 0,
    teamStatus: "" as TeamStatus,
    teamName: "",
    achievements: [],
  };
}

export function createProfileStore(
  storage: StorageLike | null,
  baseSeed: Athlete,
  now: () => Date = () => new Date(),
) {
  let cache: Athlete | null = null;
  let cacheStamp = "";
  const listeners = new Set<() => void>();

  /** The sample athlete, or a blank profile for an account made on the Sign up page. */
  function seedNow(): Athlete {
    const acct = activeAccount();
    return acct ? blankAthlete(baseSeed, acct.firstName, acct.lastName) : baseSeed;
  }

  function load(): Athlete {
    const seed = seedNow();
    if (!storage) return seed;
    try {
      const raw = storage.getItem(scopedKey(BASE_KEY));
      if (!raw) return seed;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return seed;
      const edits = readEdits(parsed, seed, now());
      return { ...seed, ...edits };
    } catch {
      return seed;
    }
  }

  function getSnapshot(): Athlete {
    if (cache === null || cacheStamp !== scopeStamp()) {
      cache = load();
      cacheStamp = scopeStamp();
    }
    return cache;
  }

  return {
    getSnapshot,
    getServerSnapshot: () => baseSeed,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    /** Re-read from storage (used right after a new account is created). */
    refresh() {
      cache = null;
      listeners.forEach((l) => l());
    },

    /** Validates and saves. Throws ProfileValidationError (nothing is saved) when anything is invalid. */
    save(draft: ProfileDraft): Athlete {
      const errors = validateProfile(draft, now());
      if (hasErrors(errors)) throw new ProfileValidationError(errors);
      const edits = fromDraft(draft);
      // Only editable fields are ever written, so system-owned fields can't be changed here.
      const next: Athlete = { ...seedNow(), ...edits };
      cache = next;
      cacheStamp = scopeStamp();
      try {
        storage?.setItem(scopedKey(BASE_KEY), JSON.stringify(edits));
      } catch {
        // storage full or blocked: keep working in memory
      }
      listeners.forEach((l) => l());
      return next;
    },
  };
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const profileStore = createProfileStore(browserStorage(), currentAthlete);

/** The signed-in athlete: the sample athlete plus any edits they have saved. */
export function useAthleteProfile(): Athlete {
  return useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getSnapshot,
    profileStore.getServerSnapshot,
  );
}

/** Overlays the signed-in athlete's saved edits onto their own directory/showcase entry. */
export function withProfile<T extends DirectoryAthlete>(entry: T, profile: Athlete): T {
  if (entry.id !== profile.id) return entry;
  return {
    ...entry,
    firstName: profile.firstName,
    lastName: profile.lastName,
    sport: profile.sport,
    position: profile.position,
    school: profile.school,
    year: profile.year,
    height: profile.height,
    bio: profile.bio,
    teamStatus: profile.teamStatus,
    ...(profile.teamName !== undefined ? { teamName: profile.teamName } : {}),
    achievements: profile.achievements,
  };
}
