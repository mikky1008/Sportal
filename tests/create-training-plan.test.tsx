// The REAL Create Training Plan page, signed in as a REAL coach, against the REAL API + Postgres.
// Stand-ins: CoachLayout is a pass-through (the Ionic shell isn't under test), router-compat's Link /
// useNavigate are plain, and sonner's toast is a spy. Network faults are injected only where a test
// says so (`hook`); everything else goes to the live server.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { execSync } from "node:child_process";
import type { ReactNode } from "react";

const navigateSpy = vi.fn();
vi.mock("@/layouts/CoachLayout", () => ({ CoachLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/router-compat", () => ({
  Link: ({ to, children, direction: _d, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => navigateSpy,
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { toast } from "sonner";
import { AuthProvider } from "@/auth/AuthContext";
import * as authClient from "@/auth/authClient";
import CreateTrainingPlanPage from "@/pages/CreateTrainingPlan";

const API = "http://localhost:8787";
const PW = "Test-Pass-12345!";
const realFetch = globalThis.fetch.bind(globalThis);

type Hook = (url: string, init?: RequestInit) => Promise<Response> | undefined;
let hook: Hook | null = null;
let requests: { method: string; url: string }[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  requests.push({ method: init?.method ?? "GET", url });
  const hooked = hook?.(url, init);
  if (hooked) return hooked;
  const { signal: _s, ...rest } = init ?? {};
  return realFetch(input, rest);
}) as typeof fetch;
const posts = () => requests.filter((r) => r.method === "POST" && r.url.includes("/api/training-plans"));
const puts = () => requests.filter((r) => r.method === "PUT" && r.url.includes("/api/training-plans"));

// jsdom gaps that Radix / the page touch
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
});

async function login(identifier: string) {
  const r = await realFetch(`${API}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password: PW, remember: false }) });
  const j = (await r.json()) as any;
  return { token: j.token as string, id: j.user.id as string };
}
async function api(who: { token: string }, method: string, path: string, body?: unknown) {
  const r = await realFetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${who.token}`, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, json: (await r.json()) as any };
}
const sql = (q: string) => execSync(`psql -h /tmp -U postgres -d sportal_test -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();

let coach: { token: string; id: string }, ava: typeof coach, ben: typeof coach, cleo: typeof coach;

async function connect(athlete: typeof coach) {
  const sent = await api(athlete, "POST", "/api/connections/requests", { userId: coach.id });
  await api(coach, "POST", `/api/connections/requests/${sent.json.connection.id}/accept`);
}

async function open(as = "coachv", path = "/coach/training-plans/new") {
  await authClient.clearSession();
  expect((await authClient.login({ identifier: as, password: PW, remember: false })).ok).toBe(true);
  const utils = render(<AuthProvider><MemoryRouter initialEntries={[path]}><CreateTrainingPlanPage /></MemoryRouter></AuthProvider>);
  return { ...utils, user: userEvent.setup() };
}
const field = (name: string) => document.querySelector(`[data-field="${name}"]`) as HTMLInputElement;
const setDate = (name: string, v: string) => fireEvent.change(field(name), { target: { value: v } });
const btn = (name: RegExp | string) => screen.getByRole("button", { name });

/** Fill the plan from the mockup: 2 goals, 3 workouts (entered out of week order), 2 athletes. */
async function fillValidPlan(user: ReturnType<typeof userEvent.setup>, opts: { athletes?: string[] } = {}) {
  await screen.findByText("Ava Stone");
  await user.type(field("title"), "Pre-Season Shooting & Footwork Conditioning");
  await user.selectOptions(field("sport"), "Basketball");
  await user.type(field("skillFocus"), "Shooting & Footwork");
  await user.type(field("description"), "Focus on mid-range jump shots and lateral speed.");
  setDate("startDate", "2026-11-10");
  setDate("endDate", "2026-12-15");
  const rows = [["Friday", "Mid-Range Jumpers & Free Throws", "45", "High"], ["Monday", "Shooting & Footwork Drills", "60", "High"], ["Wednesday", "Agility & Footwork Ladder", "45", "Medium"]];
  for (const [i, [day, drill, mins, inten]] of rows.entries()) {
    await user.click(btn(/Add Day/));
    await user.selectOptions(field(`schedule.${i}.day`), day!);
    await user.type(field(`schedule.${i}.drillName`), drill!);
    await user.clear(field(`schedule.${i}.durationMinutes`));
    await user.type(field(`schedule.${i}.durationMinutes`), mins!);
    await user.selectOptions(field(`schedule.${i}.intensity`), inten!);
  }
  for (const [i, g] of ["Mid-range accuracy to 80%", "Maintain ladder drill speed"].entries()) {
    await user.click(btn(/Add Goal/));
    await user.type(field(`goals.${i}`), g);
  }
  for (const n of opts.athletes ?? ["Ava Stone", "Ben Torres"]) await user.click(screen.getByRole("checkbox", { name: new RegExp(n) }));
}

beforeAll(async () => {
  [coach, ava, ben, cleo] = await Promise.all(["coachv", "ava_test.edu", "ben_test.edu", "cleo_test.edu"].map(login));
  sql("DELETE FROM training_plans; DELETE FROM coach_athlete_connections");
  await connect(ava); await connect(ben);
  await api(cleo, "POST", "/api/connections/requests", { userId: coach.id }); // pending only: must NOT be assignable
});
beforeEach(() => {
  sql("DELETE FROM training_plans");
  hook = null; requests = []; navigateSpy.mockClear();
  vi.mocked(toast.success).mockClear(); vi.mocked(toast.error).mockClear();
});
afterEach(() => cleanup());

describe("Create Training Plan page (authenticated coach)", () => {
  it("1. shows the form from the design: header actions, status, empty schedule/goals, and only CONNECTED athletes", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    hook = (url) => (url.includes("/api/connections") ? gate.then(() => realFetch(url, { headers: { authorization: `Bearer ${coach.token}` } })) : undefined);
    await open();
    expect(screen.getByRole("heading", { name: "Create Training Plan" })).toBeTruthy();
    expect(screen.getByText("Draft / Unpublished")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to Dashboard/ }).getAttribute("href")).toBe("/coach/dashboard");
    for (const b of [/Preview/, /Save Draft/, /Publish/]) expect(btn(b)).toBeTruthy();
    expect(screen.getByRole("status", { name: "Loading athletes" })).toBeTruthy();        // loading state
    release();
    await screen.findByText("Ava Stone");
    expect(screen.getByText("Ben Torres")).toBeTruthy();
    expect(screen.queryByText("Cleo Park")).toBeNull();                                    // pending only: not listed
    expect(screen.getByText(/No workouts scheduled yet/)).toBeTruthy();
    expect(screen.getByText(/No goals yet/)).toBeTruthy();
  });

  it("2. a coach with no connected athletes sees the empty state", async () => {
    await open("coachu");
    expect(await screen.findByText(/no connected athletes yet/i)).toBeTruthy();
  });

  it("3. athlete list failure shows an error with retry, then recovers", async () => {
    let fail = true;
    hook = (url) => (fail && url.includes("/api/connections") ? Promise.reject(new TypeError("offline")) : undefined);
    const { user } = await open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't reach the server/i);
    fail = false;
    await user.click(btn(/Try again/));
    expect(await screen.findByText("Ava Stone")).toBeTruthy();
  });

  it("4. Save Draft with no title: inline error, focus on the field, nothing sent", async () => {
    const { user } = await open();
    await screen.findByText("Ava Stone");
    await user.click(btn(/Save Draft/));
    expect((await screen.findAllByText("Enter a plan title.")).length).toBeGreaterThan(0);
    await waitFor(() => expect(document.activeElement).toBe(field("title")));
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Fix 1 field to continue.");
    expect(posts()).toHaveLength(0);
    // fixing it clears the error live
    await user.type(field("title"), "Warm-up");
    await waitFor(() => expect(screen.queryByText("Enter a plan title.")).toBeNull());
  });

  it("5. Publish / Preview on an empty form lists every missing piece and does not open the preview", async () => {
    const { user } = await open();
    await screen.findByText("Ava Stone");
    await user.click(btn(/^Publish/));
    for (const m of ["Enter a plan title.", "Choose a sport.", "Enter a skill focus.", "Choose a start date.", "Choose an end date.",
      "Add at least one day to the weekly schedule.", "Add at least one target goal.", "Assign the plan to at least one athlete."])
      expect(screen.getAllByText(m).length, m).toBeGreaterThan(0);
    expect(screen.getAllByRole("alert").some((a) => /Fix 8 fields/.test(a.textContent ?? ""))).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(posts()).toHaveLength(0);
    await user.click(btn(/Preview/));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("6. field-level rules: end before start, bad duration, blank drill/goal", async () => {
    const { user } = await open();
    await screen.findByText("Ava Stone");
    await user.type(field("title"), "Rules");
    setDate("startDate", "2026-12-15"); setDate("endDate", "2026-11-10");
    await user.click(btn(/Add Day/)); await user.click(btn(/Add Goal/));
    await user.clear(field("schedule.0.durationMinutes")); await user.type(field("schedule.0.durationMinutes"), "9x");
    await user.click(btn(/Save Draft/));
    expect(await screen.findByText("The end date can't be before the start date.")).toBeTruthy();
    expect(screen.getByText("Enter a drill name.")).toBeTruthy();
    expect(screen.getByText(/Enter whole minutes, 1–600/)).toBeTruthy();
    expect(screen.getByText("Enter the goal or remove it.")).toBeTruthy();
    expect(posts()).toHaveLength(0);
    await user.click(btn("Delete workout 1")); await user.click(btn("Remove goal 1"));   // removing rows clears their errors
    setDate("endDate", "2026-12-20");
    await waitFor(() => expect(screen.queryByText("Enter a drill name.")).toBeNull());
  });

  it("7. full flow: preview shows the athlete's view, Back to Editing keeps data, Confirm Publish saves everything", async () => {
    const { user } = await open();
    await fillValidPlan(user);
    await user.click(btn(/^Publish/));
    const dlg = await screen.findByRole("dialog");
    const d = within(dlg);
    expect(d.getByText(/Athlete workspace preview/i)).toBeTruthy();
    expect(d.getByText(/How Ava Stone & Ben Torres will see this plan/)).toBeTruthy();
    expect(d.getByText("BASKETBALL • SHOOTING & FOOTWORK", { exact: false })).toBeTruthy();
    expect(d.getByRole("heading", { name: "Pre-Season Shooting & Footwork Conditioning" })).toBeTruthy();
    expect(d.getByText(/Duration: Nov 10, 2026 – Dec 15, 2026/)).toBeTruthy();
    expect(d.getByText(/Assigned Coach: Kim Verified/)).toBeTruthy();
    expect(d.getByText("Mid-range accuracy to 80%")).toBeTruthy();
    const sched = within(d.getByLabelText("Weekly schedule")).getAllByRole("listitem").map((li) => li.textContent);
    expect(sched[0]).toMatch(/^Monday.*Shooting & Footwork Drills.*60 mins.*High/);      // sorted by weekday,
    expect(sched[1]).toMatch(/^Wednesday.*Agility/);                                       // although entered
    expect(sched[2]).toMatch(/^Friday.*Mid-Range Jumpers/);                                // Friday first
    expect(posts()).toHaveLength(0);                                                        // preview alone saves nothing

    await user.click(d.getByRole("button", { name: "Back to Editing" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(field("title").value).toBe("Pre-Season Shooting & Footwork Conditioning");      // nothing lost
    expect(sql("SELECT count(*) FROM training_plans")).toBe("0");

    await user.click(btn(/^Publish/));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Training plan published."));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(posts()).toHaveLength(1);
    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save Draft/ })).toBeNull();               // published: no draft button
    expect(btn("Save Changes")).toBeTruthy();
    // persisted for real
    expect(sql("SELECT status, title, sport, skill_focus, start_date, end_date FROM training_plans")).toBe("PUBLISHED|Pre-Season Shooting & Footwork Conditioning|Basketball|Shooting & Footwork|2026-11-10|2026-12-15");
    expect(sql("SELECT string_agg(day_of_week || ':' || duration_minutes, ',' ORDER BY position) FROM training_plan_schedule_items")).toBe("Friday:45,Monday:60,Wednesday:45");
    expect(sql("SELECT count(*) FROM training_plan_goals")).toBe("2");
    expect(sql("SELECT string_agg(u.display_name, ',' ORDER BY u.display_name) FROM training_plan_assignments a JOIN users u ON u.id=a.athlete_id")).toBe("Ava Stone,Ben Torres");
    const id = sql("SELECT id FROM training_plans");
    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ to: "/coach/training-plans/$planId", params: { planId: id }, replace: true }));
  });

  it("8. Save Draft creates once, then later saves update the same plan (no duplicates)", async () => {
    const { user } = await open();
    await screen.findByText("Ava Stone");
    await user.type(field("title"), "Half-done plan");
    await user.click(screen.getByRole("checkbox", { name: /Ava Stone/ }));
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    await user.click(btn(/Save Draft/));
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Draft saved."));
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(sql("SELECT status FROM training_plans")).toBe("DRAFT");
    expect(posts()).toHaveLength(1); expect(puts()).toHaveLength(0);
    await user.type(field("title"), " v2");
    await user.click(btn(/Save Draft/));
    await waitFor(() => expect(puts()).toHaveLength(1));
    await waitFor(() => expect(sql("SELECT title FROM training_plans")).toBe("Half-done plan v2"));
    expect(sql("SELECT count(*) FROM training_plans")).toBe("1");
    expect(posts()).toHaveLength(1);
  });

  it("9. opening a saved plan loads it (fields, schedule, goals, athletes); editing a published plan uses PUT", async () => {
    const made = await api(coach, "POST", "/api/training-plans", {
      status: "PUBLISHED", title: "Loaded plan", description: "d", sport: "Volleyball", skillFocus: "Serve", startDate: "2026-11-01", endDate: "2026-11-30",
      schedule: [{ day: "Tuesday", drillName: "Serve ladder", durationMinutes: 30, intensity: "Low" }], goals: ["Ace rate"], athleteIds: [ava.id],
    });
    const { user } = await open("coachv", `/coach/training-plans/${made.json.plan.id}`);
    expect(screen.getByRole("status", { name: "Loading training plan" })).toBeTruthy();
    await screen.findByDisplayValue("Loaded plan");
    expect(screen.getByRole("heading", { name: "Edit Training Plan" })).toBeTruthy();
    expect(field("sport").value).toBe("Volleyball");
    expect(field("startDate").value).toBe("2026-11-01");
    expect(field("schedule.0.drillName").value).toBe("Serve ladder");
    expect(field("goals.0").value).toBe("Ace rate");
    expect((await screen.findByRole("checkbox", { name: /Ava Stone/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Ben Torres/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText("Published")).toBeTruthy();
    await user.clear(field("title")); await user.type(field("title"), "Loaded plan edited");
    await user.click(btn("Save Changes"));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm Changes" }));
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Training plan updated."));
    expect(puts()).toHaveLength(1); expect(posts()).toHaveLength(0);
    expect(sql("SELECT title, status FROM training_plans")).toBe("Loaded plan edited|PUBLISHED");
  });

  it("10. someone else's / unknown plan id: clear message, no data leak, back link", async () => {
    const other = await login("coach2");
    const theirs = await api(other, "POST", "/api/training-plans", { status: "DRAFT", title: "Secret plan of coach two" });
    await open("coachv", `/coach/training-plans/${theirs.json.plan.id}`);
    expect(await screen.findByText("This training plan doesn't exist or isn't yours.")).toBeTruthy();
    expect(screen.queryByText(/Secret plan/)).toBeNull();
    expect(screen.getByRole("link", { name: /Back to Dashboard/ })).toBeTruthy();
  });

  it("11. the server refuses an athlete who disconnected after the page loaded: preview closes, error shown, list refreshes", async () => {
    const { user } = await open();
    await fillValidPlan(user);                                   // Ava + Ben selected
    const benConn = (await api(ben, "GET", "/api/connections")).json.items[0].id;
    expect((await api(ben, "POST", `/api/connections/${benConn}/disconnect`)).status).toBe(200);   // ...while the coach is editing
    await user.click(btn(/^Publish/));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("Some selected athletes aren't connected to you.")).toBeTruthy();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringMatching(/only assign plans to athletes you are connected with/i));
    await waitFor(() => expect(screen.queryByText("Ben Torres")).toBeNull());     // refreshed roster
    expect(sql("SELECT count(*) FROM training_plans")).toBe("0");                   // nothing saved
    // the coach unticks nobody (Ben is gone from the list), selects only Ava's remaining state and publishes
    await user.click(screen.getByRole("checkbox", { name: /Ava Stone/ }));          // untick
    await user.click(screen.getByRole("checkbox", { name: /Ava Stone/ }));          // tick again
    await connect(ben);                                                             // restore for later tests
  });

  it("12. a network failure while publishing keeps the preview open with a message; retry succeeds", async () => {
    const { user } = await open();
    await fillValidPlan(user, { athletes: ["Ava Stone"] });
    let fail = true;
    hook = (url, init) => (fail && init?.method === "POST" && url.includes("/api/training-plans") ? Promise.reject(new TypeError("offline")) : undefined);
    await user.click(btn(/^Publish/));
    const dlg = await screen.findByRole("dialog");
    await user.click(within(dlg).getByRole("button", { name: "Confirm Publish" }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/couldn't reach the server/i);
    expect(screen.getByRole("dialog")).toBeTruthy();                                // still open, data intact
    fail = false;
    await user.click(within(dlg).getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => expect(sql("SELECT status FROM training_plans")).toBe("PUBLISHED"));
    expect(sql("SELECT count(*) FROM training_plans")).toBe("1");
  });

  it("13. server field errors are shown on the right fields", async () => {
    const { user } = await open();
    await fillValidPlan(user, { athletes: ["Ava Stone"] });
    hook = (url, init) => (init?.method === "POST" && url.includes("/api/training-plans")
      ? Promise.resolve(new Response(JSON.stringify({ ok: false, code: "validation", message: "Fix 2 fields to continue.", fieldErrors: { title: "That title is taken.", "schedule.1.drillName": "Server says no." } }), { status: 400 }))
      : undefined);
    await user.click(btn(/^Publish/));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm Publish" }));
    expect(await screen.findByText("That title is taken.")).toBeTruthy();
    expect(screen.getByText("Server says no.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(field("title")));
  });

  it("14. double-clicking Confirm Publish sends exactly one request", async () => {
    const { user } = await open();
    await fillValidPlan(user, { athletes: ["Ava Stone"] });
    await user.click(btn(/^Publish/));
    const confirm = within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm Publish" });
    await user.dblClick(confirm);
    await waitFor(() => expect(sql("SELECT count(*) FROM training_plans")).toBe("1"));
    expect(posts()).toHaveLength(1);
  });

  it("15. schedule builder limits: Add Day stops at 21 rows; Add Goal stops at 10", async () => {
    const { user } = await open();
    await screen.findByText("Ava Stone");
    for (let i = 0; i < 21; i++) await user.click(btn(/Add Day/));
    expect((btn(/Add Day/) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole("group", { name: /Workout \d+/ })).toHaveLength(21);
    for (let i = 0; i < 10; i++) await user.click(btn(/Add Goal/));
    expect((btn(/Add Goal/) as HTMLButtonElement).disabled).toBe(true);
  });

  it("16. user-typed markup is rendered as text, never as HTML", async () => {
    const { user } = await open();
    await fillValidPlan(user, { athletes: ["Ava Stone"] });
    await user.clear(field("title")); await user.type(field("title"), "<img src=x onerror=alert(1)> Plan");
    await user.click(btn(/^Publish/));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByRole("heading", { name: "<img src=x onerror=alert(1)> Plan" })).toBeTruthy();
    expect(dlg.querySelector("img[src='x']")).toBeNull();
  });
});
