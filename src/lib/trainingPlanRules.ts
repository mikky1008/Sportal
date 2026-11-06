// Training plan shapes and validation rules, shared by the API (server/training-plans.server.ts)
// and the Create Training Plan form, so both sides always agree on what is valid.
// Plain TypeScript only (no app or Node imports): it must run in the browser and under Node.

export const SPORTS = ["Basketball", "Volleyball", "Track & Field", "Football"] as const;
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const INTENSITIES = ["Low", "Medium", "High"] as const;
export const PLAN_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];
export type Day = (typeof DAYS)[number];
export type Intensity = (typeof INTENSITIES)[number];

export const LIMITS = {
  title: 120,
  description: 1000,
  skillFocus: 80,
  drillName: 120,
  goal: 200,
  scheduleMax: 21,
  goalsMax: 10,
  athletesMax: 50,
  durationMin: 1,
  durationMax: 600,
  idMax: 64,
} as const;

export interface ScheduleItemInput {
  day: string;
  drillName: string;
  /** null = left empty / not a number */
  durationMinutes: number | null;
  intensity: string;
}

export interface PlanInput {
  title: string;
  description: string;
  sport: string;
  skillFocus: string;
  /** YYYY-MM-DD, or "" while empty */
  startDate: string;
  endDate: string;
  schedule: ScheduleItemInput[];
  goals: string[];
  athleteIds: string[];
}

/** Field path -> message. Paths: "title", "schedule.0.drillName", "goals.1", "athleteIds", ... */
export type FieldErrors = Record<string, string>;

export const emptyPlan = (): PlanInput => ({
  title: "", description: "", sport: "", skillFocus: "", startDate: "", endDate: "",
  schedule: [], goals: [], athleteIds: [],
});

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-31). */
export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Turns an untrusted request body into a PlanInput. It never throws: anything of the wrong type
 * becomes an empty value, which validatePlan then reports. Unknown fields are dropped.
 */
export function sanitizePlanInput(raw: unknown): PlanInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 200) : []);
  return {
    title: str(r["title"]),
    description: str(r["description"]),
    sport: str(r["sport"]),
    skillFocus: str(r["skillFocus"]),
    startDate: str(r["startDate"]),
    endDate: str(r["endDate"]),
    schedule: list(r["schedule"]).map((it) => {
      const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      return { day: str(o["day"]), drillName: str(o["drillName"]), durationMinutes: num(o["durationMinutes"]), intensity: str(o["intensity"]) };
    }),
    goals: list(r["goals"]).map(str),
    athleteIds: [...new Set(list(r["athleteIds"]).map(str).filter(Boolean))],
  };
}

/**
 * What must be fixed before this plan can be saved as `status`.
 *  - DRAFT: only a title is required, but anything that IS filled in must be valid, and every
 *    schedule row / goal that is added must be complete (remove it or finish it).
 *  - PUBLISHED: also needs sport, skill focus, both dates, at least one schedule row, one goal
 *    and one assigned athlete.
 * Whether the athletes are actually connected to the coach is checked by the API, not here.
 */
export function validatePlan(p: PlanInput, status: PlanStatus): FieldErrors {
  const e: FieldErrors = {};
  const publish = status === "PUBLISHED";

  if (!p.title) e["title"] = "Enter a plan title.";
  else if (p.title.length > LIMITS.title) e["title"] = `Keep the title under ${LIMITS.title} characters.`;

  if (p.description.length > LIMITS.description) e["description"] = `Keep the description under ${LIMITS.description} characters.`;

  if (!p.sport) {
    if (publish) e["sport"] = "Choose a sport.";
  } else if (!(SPORTS as readonly string[]).includes(p.sport)) e["sport"] = "Choose a sport from the list.";

  if (!p.skillFocus) {
    if (publish) e["skillFocus"] = "Enter a skill focus.";
  } else if (p.skillFocus.length > LIMITS.skillFocus) e["skillFocus"] = `Keep the skill focus under ${LIMITS.skillFocus} characters.`;

  for (const key of ["startDate", "endDate"] as const) {
    const label = key === "startDate" ? "a start" : "an end";
    if (!p[key]) {
      if (publish) e[key] = `Choose ${label} date.`;
    } else if (!isRealDate(p[key])) e[key] = `Enter a valid ${key === "startDate" ? "start" : "end"} date.`;
  }
  if (!e["startDate"] && !e["endDate"] && p.startDate && p.endDate && p.endDate < p.startDate)
    e["endDate"] = "The end date can't be before the start date.";

  if (p.schedule.length > LIMITS.scheduleMax) e["schedule"] = `A plan can have at most ${LIMITS.scheduleMax} schedule rows.`;
  else if (publish && p.schedule.length === 0) e["schedule"] = "Add at least one day to the weekly schedule.";
  p.schedule.slice(0, LIMITS.scheduleMax).forEach((it, i) => {
    if (!(DAYS as readonly string[]).includes(it.day)) e[`schedule.${i}.day`] = "Choose a day.";
    if (!it.drillName) e[`schedule.${i}.drillName`] = "Enter a drill name.";
    else if (it.drillName.length > LIMITS.drillName) e[`schedule.${i}.drillName`] = `Keep it under ${LIMITS.drillName} characters.`;
    const d = it.durationMinutes;
    if (d === null || !Number.isInteger(d) || d < LIMITS.durationMin || d > LIMITS.durationMax)
      e[`schedule.${i}.durationMinutes`] = `Enter whole minutes, ${LIMITS.durationMin}–${LIMITS.durationMax}.`;
    if (!(INTENSITIES as readonly string[]).includes(it.intensity)) e[`schedule.${i}.intensity`] = "Choose an intensity.";
  });

  if (p.goals.length > LIMITS.goalsMax) e["goals"] = `A plan can have at most ${LIMITS.goalsMax} goals.`;
  else if (publish && p.goals.length === 0) e["goals"] = "Add at least one target goal.";
  p.goals.slice(0, LIMITS.goalsMax).forEach((g, i) => {
    if (!g) e[`goals.${i}`] = "Enter the goal or remove it.";
    else if (g.length > LIMITS.goal) e[`goals.${i}`] = `Keep it under ${LIMITS.goal} characters.`;
  });

  if (p.athleteIds.length > LIMITS.athletesMax) e["athleteIds"] = `Assign at most ${LIMITS.athletesMax} athletes.`;
  else if (publish && p.athleteIds.length === 0) e["athleteIds"] = "Assign the plan to at least one athlete.";
  else if (p.athleteIds.some((id) => id.length > LIMITS.idMax)) e["athleteIds"] = "One of the selected athletes is not valid.";

  return e;
}

/** A short sentence for the top of the form / an API error. */
export function summarizeErrors(e: FieldErrors): string {
  const n = Object.keys(e).length;
  return n === 1 ? "Fix 1 field to continue." : `Fix ${n} fields to continue.`;
}
