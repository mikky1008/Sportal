// Browser client for the coach's My Athletes list and dashboard cards (server/coach-athletes.server.ts).
//   GET    /api/coach/athletes          connected athletes with profile, skills, achievements, records
//   GET    /api/coach/dashboard         pending actions, recruitment overview, team performance
//   PUT    /api/coach/shortlist/:id     add to shortlist      DELETE: remove

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiRequest, type ApiResult } from "@/auth/authClient";

export interface AthleteRecord {
  label: string;
  /** shown as written, e.g. "Oct 24, 2026" */
  date: string;
  value: string;
}

export interface ConnectedAthlete {
  id: string;
  firstName: string;
  lastName: string;
  /** profile photo; initials are shown when there isn't one */
  photo?: string;
  sport: string;
  position: string;
  school: string;
  /** null until a ranking is set */
  rank: number | null;
  /** 0-100, null until scored */
  performance: number | null;
  consistency: number | null;
  bio: string;
  skills: string[];
  achievements: { title: string; year: string }[];
  records: AthleteRecord[];
}

interface ApiAthlete extends Omit<ConnectedAthlete, "photo" | "records"> {
  photo: string | null;
  records: { label: string; value: string; recordedOn: string }[];
}

const prettyDate = (iso: string) => {
  try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return iso; }
};

const toAthlete = (a: ApiAthlete): ConnectedAthlete => {
  const { photo, records, ...rest } = a;
  return { ...rest, ...(photo ? { photo } : {}), records: records.map((r) => ({ label: r.label, value: r.value, date: prettyDate(r.recordedOn) })) };
};

export async function fetchMyAthletes(): Promise<ApiResult<{ items: ConnectedAthlete[]; total: number }>> {
  const res = await apiRequest<{ items: ApiAthlete[]; total: number }>("/api/coach/athletes?limit=100&offset=0");
  if (!res.ok) return res;
  return { ...res, data: { items: res.data.items.map(toAthlete), total: res.data.total } };
}

export type LoadState = "loading" | "ready" | "error";

function useLoad<T>(fetcher: () => Promise<ApiResult<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    const mine = ++runId.current;
    setState("loading");
    const res = await fetcher();
    if (!alive.current || mine !== runId.current) return;
    if (res.ok) { setData(res.data); setError(null); setState("ready"); }
    else { setError(res.message); setState("error"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { data, state, error, reload: load };
}

export function useMyAthletes() {
  const { data, state, error, reload } = useLoad(fetchMyAthletes);
  return { athletes: data?.items ?? [], state, error, reload };
}

/* ---- dashboard ---- */

export interface DashboardPerson { id: string; displayName: string; firstName: string; lastName: string; photo: string | null }

export interface CoachDashboardData {
  pendingActions: { connectionRequests: number; unansweredInquiries: number; unreadMessages: number; newApplications: number };
  recruitment: {
    shortlist: DashboardPerson[];
    conversations: { athlete: DashboardPerson; last: string; at: string }[];
    inquiryStatuses: { awaiting: number; replied: number; accepted: number; declined: number };
  };
  performance: { athletesTotal: number; athletesUpdated: number; skills: { name: string; avg: number; change: number }[] };
}

export const fetchCoachDashboard = () => apiRequest<CoachDashboardData>("/api/coach/dashboard");

export function useCoachDashboard() {
  const { data, state, error, reload } = useLoad(fetchCoachDashboard);
  return { data, state, error, reload };
}
