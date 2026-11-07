// Coach profile shapes and validation rules, shared by the API (server/coach-profile.server.ts)
// and the coach profile form, so both sides always agree on what is valid.
// Plain TypeScript only (no app or Node imports besides the sports list): it runs in the browser and under Node.

import { sports } from "./sports.ts";

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
  readonly errors: CoachErrors;
  constructor(errors: CoachErrors) {
    super("Coach profile has errors");
    this.name = "CoachValidationError";
    this.errors = errors;
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

export const COACH_PROFILE_KEYS = Object.keys(EMPTY_COACH) as (keyof CoachProfile)[];

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

