// Browser client for the athlete's own training plans (server/training-plans.server.ts):
//   GET /api/athletes/me/training-plans       published plans assigned to me by coaches I'm connected to
//   GET /api/athletes/me/training-plans/:id   one of them, with the weekly schedule and goals

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, type ApiResult } from "@/auth/authClient";

export interface AssignedPlanSummary {
  id: string;
  title: string;
  sport: string;
  skillFocus: string;
  startDate: string | null;
  endDate: string | null;
  coach: { id: string; displayName: string };
  assignedAt: string;
}

export interface AssignedPlan extends AssignedPlanSummary {
  description: string;
  schedule: { day: string; drillName: string; durationMinutes: number; intensity: string }[];
  goals: string[];
  publishedAt: string | null;
}

export const fetchAssignedPlans = () =>
  apiRequest<{ items: AssignedPlanSummary[]; total: number }>("/api/athletes/me/training-plans?limit=100&offset=0");

export const fetchAssignedPlan = (id: string) =>
  apiRequest<{ plan: AssignedPlan }>(`/api/athletes/me/training-plans/${encodeURIComponent(id)}`);

export type PlanPhase = "upcoming" | "active" | "completed";

/** Where a plan stands today. A plan with no dates counts as active. `today` is YYYY-MM-DD in the athlete's time zone. */
export function planPhase(p: Pick<AssignedPlanSummary, "startDate" | "endDate">, today: string): PlanPhase {
  if (p.startDate && today < p.startDate) return "upcoming";
  if (p.endDate && today > p.endDate) return "completed";
  return "active";
}

export function localToday(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export type LoadState = "loading" | "ready" | "error";

function useLoad<T>(fetcher: () => Promise<ApiResult<T>>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const run = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = useCallback(async () => {
    const mine = ++run.current;
    setState("loading");
    const res = await fetcher();
    if (!alive.current || mine !== run.current) return;
    if (res.ok) { setData(res.data); setError(null); setState("ready"); }
    else { setError({ message: res.message, code: res.code }); setState("error"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { void load(); }, [load]);
  return { data, state, error, reload: load };
}

export function useAssignedPlans() {
  const { data, state, error, reload } = useLoad(fetchAssignedPlans, []);
  return { plans: data?.items ?? [], state, error, reload };
}

export function useAssignedPlan(id: string) {
  const { data, state, error, reload } = useLoad(() => fetchAssignedPlan(id), [id]);
  return { plan: data?.plan ?? null, state, error, reload };
}
