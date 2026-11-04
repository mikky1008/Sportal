// Coach / recruiter profile with persistence.
//
// PROTOTYPE LIMIT: stored in this browser's localStorage (same as the athlete profile), so it
// survives logging out and back in on this browser but is not tied to a server account yet.
//
// `verificationStatus` is deliberately NOT part of the editable profile. It is owned by Sportal's
// review process, never accepted from a draft, and never read by profile completion: a coach can
// have a 100% complete profile while their organization is still "Pending".

import { useSyncExternalStore } from "react";
import { currentRecruiter, sports } from "@/data/mock";
import { activeAccount, scopeStamp, scopedKey } from "@/lib/accountScope";

const BASE_KEY = "sportal.coachProfile.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const ORGANIZATION_TYPES = ["University", "College", "High school", "Club / Academy", "Other"] as const;
export const POSITION_TITLES = [
  "Head coach", "Assistant coach", "Athletic director", "Recruiter / Scout", "Trainer / Coordinator",
] as const;
export const COMPETITION_LEVELS = ["Junior high school", "Senior high school", "Collegiate", "Club / Community", "Professional"] as const;
export const CREDENTIAL_TYPES = ["Coaching license", "School / university ID", "Letter from organization"] as const;

export const COACH_LIMITS = {
  name: 40,
  organizationName: 100,
  location: 80,
  programName: 80,
  background: { min: 20, max: 500 },
  yearsExperience: { min: 0, max: 60 },
  credentialReference: { min: 4, max: 50 },
} as const;

/** Everything the coach can edit, as text. Empty string means "not filled in yet". */
export interface CoachProfile {
  // Basic information
  firstName: string;
  lastName: string;
  email: string;
  // Organization information
  organizationName: string;
  organizationType: string;
  organizationLocation: string;
  // Coaching position
  positionTitle: string;
  programName: string;
  // Sport specialization
  primarySport: string;
  competitionLevel: string;
  // Professional background
  yearsExperience: string;
  background: string;
  /** optional — never counted toward completion */
  certifications: string;
  // Verification information (what the review team needs; NOT the verification outcome)
  officialEmail: string;
  credentialType: string;
  credentialReference: string;
}

export type CoachVerificationStatus = "Pending" | "Verified" | "Rejected";

export type CoachErrors = Partial<Record<keyof CoachProfile, string>>;

export class CoachValidationError extends Error {
  constructor(public readonly errors: CoachErrors) {
    super("Coach profile has errors");
    this.name = "CoachValidationError";
  }
}

export const EMPTY_COACH: CoachProfile = {
  firstName: "", lastName: "", email: "",
  organizationName: "", organizationType: "", organizationLocation: "",
  positionTitle: "", programName: "",
  primarySport: "", competitionLevel: "",
  yearsExperience: "", background: "", certifications: "",
  officialEmail: "", credentialType: "", credentialReference: "",
};

/** What the account starts with: the name and organization the recruiter console already shows. */
export const COACH_SEED: CoachProfile = {
  ...EMPTY_COACH,
  firstName: "Miguel",
  lastName: "Reyes",
  organizationName: currentRecruiter.organization,
};

/** Set by Sportal's review, not by the coach. */
export const COACH_VERIFICATION_SEED: CoachVerificationStatus = "Pending";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Partial saves are allowed (an empty field is just "not done yet"), but anything that IS filled
 * in must be valid. Completion then counts only fields that are filled in and valid.
 */
export function validateCoach(c: CoachProfile): CoachErrors {
  const e: CoachErrors = {};
  const text = (k: keyof CoachProfile, label: string, max: number) => {
    if (c[k].trim().length > max) e[k] = `${label} must be ${max} characters or fewer.`;
  };
  const oneOf = (k: keyof CoachProfile, list: readonly string[], label: string) => {
    if (c[k] !== "" && !list.includes(c[k])) e[k] = `Choose ${label} from the list.`;
  };
  text("firstName", "First name", COACH_LIMITS.name);
  text("lastName", "Last name", COACH_LIMITS.name);
  text("organizationName", "Organization name", COACH_LIMITS.organizationName);
  text("organizationLocation", "Location", COACH_LIMITS.location);
  text("programName", "Team or program", COACH_LIMITS.programName);
  text("certifications", "Certifications", 200);
  for (const k of ["email", "officialEmail"] as const) {
    if (c[k].trim() !== "" && !EMAIL.test(c[k].trim())) e[k] = "Enter a valid email address.";
  }
  oneOf("organizationType", ORGANIZATION_TYPES, "an organization type");
  oneOf("positionTitle", POSITION_TITLES, "a position");
  oneOf("primarySport", sports.map((s) => s.name), "a sport");
  oneOf("competitionLevel", COMPETITION_LEVELS, "a level");
  oneOf("credentialType", CREDENTIAL_TYPES, "a credential type");

  const years = c.yearsExperience.trim();
  if (years !== "") {
    const n = /^\d{1,2}$/.test(years) ? Number(years) : NaN;
    if (!(n >= COACH_LIMITS.yearsExperience.min && n <= COACH_LIMITS.yearsExperience.max))
      e.yearsExperience = `Enter whole years between ${COACH_LIMITS.yearsExperience.min} and ${COACH_LIMITS.yearsExperience.max}.`;
  }
  const bg = c.background.trim();
  if (bg !== "" && (bg.length < COACH_LIMITS.background.min || bg.length > COACH_LIMITS.background.max))
    e.background = `Describe your background in ${COACH_LIMITS.background.min}–${COACH_LIMITS.background.max} characters.`;
  const ref = c.credentialReference.trim();
  if (ref !== "" && (ref.length < COACH_LIMITS.credentialReference.min || ref.length > COACH_LIMITS.credentialReference.max))
    e.credentialReference = `Enter ${COACH_LIMITS.credentialReference.min}–${COACH_LIMITS.credentialReference.max} characters.`;
  return e;
}

export function hasCoachErrors(e: CoachErrors): boolean {
  return Object.keys(e).length > 0;
}

function clean(c: CoachProfile): CoachProfile {
  const out = { ...c };
  for (const k of Object.keys(out) as (keyof CoachProfile)[]) out[k] = out[k].trim();
  return out;
}

/** Keeps every saved field that is the right type and passes validation; drops the rest. */
function readCoach(raw: unknown, base: CoachProfile = COACH_SEED): CoachProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const draft: CoachProfile = { ...base };
  for (const k of Object.keys(EMPTY_COACH) as (keyof CoachProfile)[]) {
    if (typeof r[k] === "string") draft[k] = r[k] as string;
  }
  const errs = validateCoach(draft);
  const safe = { ...draft };
  for (const k of Object.keys(errs) as (keyof CoachProfile)[]) safe[k] = base[k];
  return safe;
}

export interface CoachState {
  profile: CoachProfile;
  /** system-owned; see the note at the top of this file */
  verificationStatus: CoachVerificationStatus;
}

export function createCoachProfileStore(
  storage: StorageLike | null,
  verificationStatus: CoachVerificationStatus = COACH_VERIFICATION_SEED,
) {
  let cache: CoachState | null = null;
  let cacheStamp = "";
  const listeners = new Set<() => void>();
  const sampleState: CoachState = { profile: COACH_SEED, verificationStatus };

  /** The sample coach, or a blank profile (just their name and email) for an account made on Sign up. */
  function baseNow(): { base: CoachProfile; state: CoachState } {
    const acct = activeAccount();
    if (!acct) return { base: COACH_SEED, state: sampleState };
    const base: CoachProfile = { ...EMPTY_COACH, firstName: acct.firstName, lastName: acct.lastName, email: acct.email };
    return { base, state: { profile: base, verificationStatus } };
  }

  function load(): CoachState {
    const { base, state } = baseNow();
    if (!storage) return state;
    try {
      const raw = storage.getItem(scopedKey(BASE_KEY));
      return raw ? { profile: readCoach(JSON.parse(raw), base), verificationStatus } : state;
    } catch {
      return state;
    }
  }
  const getSnapshot = () => {
    if (cache === null || cacheStamp !== scopeStamp()) {
      cache = load();
      cacheStamp = scopeStamp();
    }
    return cache;
  };

  return {
    getSnapshot,
    getServerSnapshot: () => sampleState,
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

    /** Validates and saves. Throws CoachValidationError (nothing is saved) when anything filled in is invalid. */
    save(draft: CoachProfile): CoachState {
      const errors = validateCoach(draft);
      if (hasCoachErrors(errors)) throw new CoachValidationError(errors);
      const profile = clean(draft);
      // Only the profile is written; the verification status can't be changed from here.
      const next: CoachState = { profile, verificationStatus: getSnapshot().verificationStatus };
      cache = next;
      cacheStamp = scopeStamp();
      try {
        storage?.setItem(scopedKey(BASE_KEY), JSON.stringify(profile));
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

export const coachProfileStore = createCoachProfileStore(browserStorage());

export function useCoachProfile(): CoachState {
  return useSyncExternalStore(
    coachProfileStore.subscribe,
    coachProfileStore.getSnapshot,
    coachProfileStore.getServerSnapshot,
  );
}
