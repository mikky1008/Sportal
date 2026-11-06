// Integration tests: the REAL CoachDashboard component tree, signed in as a REAL coach account,
// talking to the REAL API (localhost:8787) and Postgres. The only stand-ins:
//  - CoachLayout is a pass-through (the Ionic shell isn't what is under test)
//  - sonner's toast is a spy, so messages can be asserted
//  - GET /api/athletes/search is answered by the test, because the backend has no such route
//    (the one gap the task's "don't touch the backend" rule leaves open). Everything else,
//    including every Connect / Accept / Decline / Cancel write, goes to the real API.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { execSync } from "node:child_process";
import type { ReactNode } from "react";

vi.mock("@/layouts/CoachLayout", () => ({ CoachLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { toast } from "sonner";
import { AuthProvider } from "@/auth/AuthContext";
import * as authClient from "@/auth/authClient";
import CoachDashboardPage from "@/pages/CoachDashboard";

const API = "http://localhost:8787";
const PW = "Test-Pass-12345!";
const realFetch = globalThis.fetch.bind(globalThis);

// ---- fetch wrapper: strip jsdom's AbortSignal (Node's fetch rejects it), allow stubs ----
type Hook = (url: string, init?: RequestInit) => Promise<Response> | undefined;
let hook: Hook | null = null;
let searchPool: { id: string; displayName: string }[] = [];
let searchCalls: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const hooked = hook?.(url, init);
  if (hooked) return hooked;
  if (url.includes("/api/athletes/search")) {
    const q = new URL(url).searchParams.get("q")!.toLowerCase();
    searchCalls.push(q);
    const items = searchPool.filter((a) => a.displayName.toLowerCase().includes(q));
    return new Response(JSON.stringify({ ok: true, items }), { status: 200, headers: { "content-type": "application/json" } });
  }
  const { signal: _s, ...rest } = init ?? {};
  return realFetch(input, rest);
}) as typeof fetch;

// ---- helpers talking to the real API as other people ----
async function login(identifier: string) {
  const r = await realFetch(`${API}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password: PW, remember: false }) });
  const j = (await r.json()) as { ok: boolean; token: string; user: { id: string } };
  if (!j.ok) throw new Error("login failed for " + identifier);
  return { token: j.token, id: j.user.id };
}
async function api(token: string, path: string, method = "GET", body?: unknown) {
  const r = await realFetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, json: (await r.json()) as any };
}
const sql = (q: string) => execSync(`psql -h /tmp -U postgres -d sportal_test -At -c "${q}"`).toString().trim();
const pairStatus = (athleteEmail: string, coachEmail = "coach.verified@test.edu") =>
  sql(`SELECT c.status FROM coach_athlete_connections c JOIN users a ON a.id=c.athlete_id JOIN users k ON k.id=c.coach_id WHERE a.email='${athleteEmail}' AND k.email='${coachEmail}'`);

let ava: { token: string; id: string }, ben: typeof ava, cleo: typeof ava, dev: typeof ava;
let coachTok: string;

async function resetConnections() {
  sql("DELETE FROM coach_athlete_connections");
}

async function openDashboard(as = "coachv") {
  await authClient.clearSession();
  const res = await authClient.login({ identifier: as, password: PW, remember: false });
  expect(res.ok).toBe(true);
  const utils = render(<AuthProvider><MemoryRouter><CoachDashboardPage /></MemoryRouter></AuthProvider>);
  return { ...utils, user: userEvent.setup() };
}
const card = (title: string) => screen.getByRole("heading", { name: title }).closest("section") as HTMLElement;
const tile = (label: string) => screen.getByText(label, { selector: "span" }).closest(".surface") as HTMLElement;
const heroTile = (label: string) => screen.getByText(label).parentElement as HTMLElement;

beforeAll(async () => {
  [ava, ben, cleo, dev] = await Promise.all(["ava_test.edu", "ben_test.edu", "cleo_test.edu", "dev_test.edu"].map(login));
  coachTok = (await login("coachv")).token;
  searchPool = [
    { id: ava.id, displayName: "Ava Stone" }, { id: ben.id, displayName: "Ben Torres" },
    { id: cleo.id, displayName: "Cleo Park" }, { id: dev.id, displayName: "Dev Patel" },
  ];
});
beforeEach(async () => {
  await resetConnections();
  hook = null; searchCalls = [];
  vi.mocked(toast.success).mockClear(); vi.mocked(toast.error).mockClear();
});
afterEach(() => cleanup());

describe("Coach dashboard <-> connections API (authenticated coach)", () => {
  it("1. loading state, then empty states with zero counts from the API", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    hook = (url, init) => (url.includes("/api/connections") && (init?.method ?? "GET") === "GET" ? gate.then(() => realFetch(url, { headers: init?.headers })) : undefined);
    await openDashboard();
    await waitFor(() => expect(screen.getAllByRole("status", { name: "Loading" }).length).toBeGreaterThan(0));
    expect(within(heroTile("Pending Req")).getByText("—")).toBeTruthy(); // no number shown while loading
    release();
    await screen.findByText(/No incoming requests/);
    expect(screen.getByText(/No outgoing requests/)).toBeTruthy();
    expect(screen.getByText(/No athletes yet/)).toBeTruthy();
    expect(within(tile("Total Athletes")).getByText("0")).toBeTruthy();
    expect(within(tile("Pending Requests")).getByText("0")).toBeTruthy();
    expect(within(tile("Sent Requests")).getByText("0")).toBeTruthy();
    expect(screen.queryAllByRole("status", { name: "Loading" })).toHaveLength(0);
  });

  it("2. incoming requests (sent by athletes through the real API) show with real counts", async () => {
    expect((await api(ava.token, "/api/connections/requests", "POST", { userId: (await login("coachv")).id })).status).toBe(201);
    expect((await api(ben.token, "/api/connections/requests", "POST", { userId: (await login("coachv")).id })).status).toBe(201);
    await openDashboard();
    const reqs = await waitFor(() => card("Connection Requests"));
    await within(reqs).findByText("Ava Stone");
    expect(within(reqs).getByText("Ben Torres")).toBeTruthy();
    expect(within(reqs).getByText("Incoming (2)")).toBeTruthy();
    expect(within(tile("Pending Requests")).getByText("2")).toBeTruthy();
    expect(within(heroTile("Pending Req")).getByText("2")).toBeTruthy();
    expect(screen.getByText("2 need attention")).toBeTruthy();
    expect(within(reqs).getByText("2 to review")).toBeTruthy();
  });

  it("3. Accept moves the athlete into My Athletes and updates every count with no reload", async () => {
    const coachId = (await login("coachv")).id;
    await api(ava.token, "/api/connections/requests", "POST", { userId: coachId });
    await api(ben.token, "/api/connections/requests", "POST", { userId: coachId });
    const { user } = await openDashboard();
    await screen.findByText("Ava Stone");
    await user.click(screen.getByRole("button", { name: "Accept request from Ava Stone" }));
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith(expect.stringMatching(/accepted/i)));
    await waitFor(() => expect(within(card("My Athletes")).getByText("Ava Stone")).toBeTruthy());
    expect(within(card("Connection Requests")).queryByText("Ava Stone")).toBeNull();
    expect(within(card("Connection Requests")).getByText("Incoming (1)")).toBeTruthy();
    expect(within(tile("Total Athletes")).getByText("1")).toBeTruthy();
    expect(within(tile("Pending Requests")).getByText("1")).toBeTruthy();
    expect(pairStatus("ava@test.edu")).toBe("accepted");
  });

  it("4. Decline removes the request and records 'declined'", async () => {
    await api(ben.token, "/api/connections/requests", "POST", { userId: (await login("coachv")).id });
    const { user } = await openDashboard();
    await screen.findByText("Ben Torres");
    await user.click(screen.getByRole("button", { name: "Decline request from Ben Torres" }));
    await waitFor(() => expect(screen.queryByText("Ben Torres")).toBeNull());
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Request declined.");
    expect(await screen.findByText(/No incoming requests/)).toBeTruthy();
    expect(within(tile("Pending Requests")).getByText("0")).toBeTruthy();
    expect(within(tile("Total Athletes")).getByText("0")).toBeTruthy();
    expect(pairStatus("ben@test.edu")).toBe("declined");
  });

  it("5. search + Connect sends a real request; the row flips to 'Request sent' and appears under Outgoing", async () => {
    const { user } = await openDashboard();
    await screen.findByText(/No outgoing requests/);
    const search = screen.getByRole("searchbox", { name: "Search athletes by name" });
    expect(screen.getByText(/Type at least 2 letters/)).toBeTruthy();
    await user.type(search, "c");
    expect(screen.getByText(/Keep typing/)).toBeTruthy();
    await user.type(search, "le");
    const results = await screen.findByRole("list", { name: "Search results" });
    expect(within(results).getByText("Cleo Park")).toBeTruthy();
    expect(within(results).queryByText("Ava Stone")).toBeNull();
    await user.click(within(results).getByRole("button", { name: "Connect with Cleo Park" }));
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Connection request sent."));
    await waitFor(() => expect(within(results).getByText("Request sent")).toBeTruthy());
    expect(within(card("Connection Requests")).getByText("Outgoing (1)")).toBeTruthy();
    expect(within(card("Connection Requests")).getByText("Cleo Park")).toBeTruthy();
    expect(within(tile("Sent Requests")).getByText("1")).toBeTruthy();
    expect(within(heroTile("Sent Req")).getByText("1")).toBeTruthy();
    expect(pairStatus("cleo@test.edu")).toBe("pending");
    // the athlete sees it as an incoming request in the real API
    const inc = await api(cleo.token, "/api/connections/requests/incoming");
    expect(inc.json.items.map((i: any) => i.counterpart.displayName)).toContain("Kim Verified");
  });

  it("6. Cancel Request removes it, Connect returns, and a new request can be sent again", async () => {
    const { user } = await openDashboard();
    await screen.findByText(/No outgoing requests/);
    await user.type(screen.getByRole("searchbox"), "dev");
    await user.click(await screen.findByRole("button", { name: "Connect with Dev Patel" }));
    const reqs = card("Connection Requests");
    await within(reqs).findByText("Outgoing (1)");
    await user.click(within(reqs).getByRole("button", { name: "Cancel request to Dev Patel" }));
    await within(reqs).findByText("Outgoing (0)");
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Request cancelled.");
    expect(pairStatus("dev@test.edu")).toBe("cancelled");
    expect(within(tile("Sent Requests")).getByText("0")).toBeTruthy();
    const again = await screen.findByRole("button", { name: "Connect with Dev Patel" }); // back to Connect
    await user.click(again);
    await within(reqs).findByText("Outgoing (1)");
    expect(pairStatus("dev@test.edu")).toBe("pending");
  });

  it("7. an athlete accepting my request elsewhere: a stale Cancel is rejected by the server and the UI self-corrects", async () => {
    const { user } = await openDashboard();
    await screen.findByText(/No outgoing requests/);
    await user.type(screen.getByRole("searchbox"), "ava");
    await user.click(await screen.findByRole("button", { name: "Connect with Ava Stone" }));
    const reqs = card("Connection Requests");
    await within(reqs).findByText("Outgoing (1)");
    const pending = await api(ava.token, "/api/connections/requests/incoming");
    expect((await api(ava.token, `/api/connections/requests/${pending.json.items[0].id}/accept`, "POST")).status).toBe(200);
    // the coach's screen is now stale; clicking Cancel hits the real 409
    await user.click(within(reqs).getByRole("button", { name: "Cancel request to Ava Stone" }));
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith("This request is no longer pending."));
    await waitFor(() => expect(within(card("My Athletes")).getByText("Ava Stone")).toBeTruthy());
    expect(within(reqs).getByText("Outgoing (0)")).toBeTruthy();
    expect(pairStatus("ava@test.edu")).toBe("accepted");
    // and search now shows them as connected
    expect(await screen.findByText("Connected", { selector: "span" })).toBeTruthy();
  });

  it("8. error state with retry when the API can't be reached, then recovery", async () => {
    let fail = true;
    hook = (url, init) => (fail && url.includes("/api/connections") && (init?.method ?? "GET") === "GET" ? Promise.reject(new TypeError("offline")) : undefined);
    const { user } = await openDashboard();
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => /couldn't reach the server/i.test(a.textContent ?? ""))).toBe(true);
    expect(within(tile("Total Athletes")).getByText("—")).toBeTruthy(); // never shows a made-up 0
    fail = false;
    await user.click(screen.getAllByRole("button", { name: /Try again/ })[0]!);
    await screen.findByText(/No incoming requests/);
    expect(screen.queryAllByRole("alert").filter((a) => /reach the server/.test(a.textContent ?? ""))).toHaveLength(0);
  });

  it("9. athlete search: no results, search endpoint missing (the real server), and search failure", async () => {
    const { user } = await openDashboard();
    await screen.findByText(/No outgoing requests/);
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(await screen.findByText(/No athletes found for "zzz"/)).toBeTruthy();
    // what the REAL server answers today (no such route): friendly 'not available', no crash
    hook = (url) => (url.includes("/api/athletes/search") ? realFetch(`${API}/api/athletes/search?q=x`, { headers: { authorization: "Bearer x" } }) : undefined);
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "ava");
    expect(await screen.findByText("Athlete search isn't available on this server yet.")).toBeTruthy();
    // a 500 from search shows a retryable error
    hook = (url) => (url.includes("/api/athletes/search") ? Promise.resolve(new Response(JSON.stringify({ error: "server_error" }), { status: 500 })) : undefined);
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "ben");
    await screen.findByRole("button", { name: /Try again/ });
  });

  it("10. an unverified coach sees the notice, Connect is disabled, and no request is sent", async () => {
    const { user } = await openDashboard("coachu");
    await screen.findByText(/No outgoing requests/);
    expect(screen.getByText(/account isn't verified yet/)).toBeTruthy();
    await user.type(screen.getByRole("searchbox"), "ava");
    const btnConnect = await screen.findByRole("button", { name: "Connect with Ava Stone" });
    expect((btnConnect as HTMLButtonElement).disabled).toBe(true);
    expect(sql("SELECT count(*) FROM coach_athlete_connections")).toBe("0");
    // and the server itself refuses, for completeness (UI is not the only guard)
    const unver = await login("coachu");
    const r = await api(unver.token, "/api/connections/requests", "POST", { userId: ava.id });
    expect([r.status, r.json.code]).toEqual([403, "coach_not_verified"]);
  });

  it("11. an expired session shows a sign-in message instead of fake data", async () => {
    await openDashboard();
    await screen.findByText(/No incoming requests/);
    cleanup();
    await authClient.clearSession(); // token gone, as after expiry
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: "sportal.session.token", value: "not-a-real-token" });
    render(<AuthProvider><MemoryRouter><CoachDashboardPage /></MemoryRouter></AuthProvider>);
    // with no valid user the page still mounts its own list calls: they must fail visibly
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => /session has expired/i.test(a.textContent ?? ""))).toBe(true);
  });

  it("12. double-clicking Accept sends exactly one request", async () => {
    await api(ava.token, "/api/connections/requests", "POST", { userId: (await login("coachv")).id });
    const writes: string[] = [];
    hook = (url, init) => { if (init?.method === "POST" && url.includes("/accept")) writes.push(url); return undefined; };
    const { user } = await openDashboard();
    const b = await screen.findByRole("button", { name: "Accept request from Ava Stone" });
    await user.dblClick(b);
    await waitFor(() => expect(within(card("My Athletes")).getByText("Ava Stone")).toBeTruthy());
    expect(writes).toHaveLength(1);
  });
});
