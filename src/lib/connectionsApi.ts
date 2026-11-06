// Browser client for the coach-athlete connections API (server/connections.server.ts).
// Every function resolves to an ApiResult and never throws. Routes used:
//   GET  /api/connections                       accepted connections
//   GET  /api/connections/requests/incoming     requests sent TO me
//   GET  /api/connections/requests/outgoing     requests I sent
//   POST /api/connections/requests              { userId }  send a request
//   POST /api/connections/requests/:id/{accept|decline|cancel}

import { apiRequest, type ApiResult } from "@/auth/authClient";

export type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled" | "disconnected";

export interface ConnectionCounterpart {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: "coach" | "student_athlete";
}

export interface ConnectionView {
  id: string;
  status: ConnectionStatus;
  requestedByMe: boolean;
  requestedAt: string;
  respondedAt: string | null;
  updatedAt: string;
  counterpart: ConnectionCounterpart;
}

export interface ConnectionPage {
  items: ConnectionView[];
  total: number;
  limit: number;
  offset: number;
}

export type ListKind = "incoming" | "outgoing" | "accepted";
export type { ApiResult };

/** The API's largest page. Totals always come from `total`, so counts stay right past this. */
export const PAGE_SIZE = 100;

const LIST_PATH: Record<ListKind, string> = {
  incoming: "/api/connections/requests/incoming",
  outgoing: "/api/connections/requests/outgoing",
  accepted: "/api/connections",
};

export const listConnections = (kind: ListKind): Promise<ApiResult<ConnectionPage>> =>
  apiRequest<ConnectionPage>(`${LIST_PATH[kind]}?limit=${PAGE_SIZE}&offset=0`);

export const sendConnectionRequest = (userId: string) =>
  apiRequest<{ connection: ConnectionView }>("/api/connections/requests", { method: "POST", body: { userId } });

export type RequestAction = "accept" | "decline" | "cancel";
export const answerConnectionRequest = (id: string, action: RequestAction) =>
  apiRequest<{ connection: ConnectionView }>(`/api/connections/requests/${encodeURIComponent(id)}/${action}`, { method: "POST" });

/* ---- athlete search ----
   The connections API can only send a request to a user id; it has no way to look athletes up.
   This expects `GET /api/athletes/search?q=<text>&limit=<n>` -> { ok: true, items: AthleteSearchResult[] }.
   Until the server has that route, the call comes back as code "search_unavailable". */

export interface AthleteSearchResult {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

export async function searchAthletes(query: string, signal?: AbortSignal): Promise<ApiResult<{ items: AthleteSearchResult[] }>> {
  const res = await apiRequest<{ items: AthleteSearchResult[] }>(
    `/api/athletes/search?q=${encodeURIComponent(query)}&limit=10`,
    signal ? { signal } : {},
  );
  if (!res.ok && (res.status === 404 || res.status === 405))
    return { ok: false, status: res.status, code: "search_unavailable", message: "Athlete search isn't available on this server yet." };
  return res;
}
