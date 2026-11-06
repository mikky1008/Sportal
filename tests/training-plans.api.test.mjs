// Backend tests for /api/training-plans against the REAL running API and Postgres.
// Run:  node --test tests/training-plans.api.test.mjs   (API on :8787, DB "sportal_test")
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const API = "http://localhost:8787";
const PW = "Test-Pass-12345!";
const sql = (q) => execSync(`psql -h /tmp -U postgres -d sportal_test -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();

async function login(identifier) {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password: PW, remember: false }) });
  const j = await r.json();
  assert.ok(j.ok, `login ${identifier}`);
  return { token: j.token, id: j.user.id };
}
async function call(who, method, path, body, extraHeaders = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(who ? { authorization: `Bearer ${who.token}` } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}), ...extraHeaders },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await r.json(); } catch { /* none */ }
  return { status: r.status, json };
}
const connect = async (athlete, coach) => {
  const sent = await call(athlete, "POST", "/api/connections/requests", { userId: coach.id });
  assert.equal(sent.status, 201);
  const ans = await call(coach, "POST", `/api/connections/requests/${sent.json.connection.id}/accept`);
  assert.equal(ans.status, 200);
  return sent.json.connection.id;
};

const good = (over = {}) => ({
  status: "PUBLISHED",
  title: "Pre-Season Shooting & Footwork Conditioning",
  description: "Focus on mid-range jump shots and lateral speed.",
  sport: "Basketball",
  skillFocus: "Shooting & Footwork",
  startDate: "2026-11-10",
  endDate: "2026-12-15",
  schedule: [
    { day: "Monday", drillName: "Shooting & Footwork Drills", durationMinutes: 60, intensity: "High" },
    { day: "Wednesday", drillName: "Agility & Footwork Ladder", durationMinutes: 45, intensity: "Medium" },
    { day: "Friday", drillName: "Mid-Range Jumpers & Free Throws", durationMinutes: 45, intensity: "High" },
  ],
  goals: ["Mid-range accuracy to 80%", "Maintain ladder drill speed"],
  athleteIds: [],
  ...over,
});

let coach, coach2, unverified, ava, ben, cleo, dev, avaConn;

before(async () => {
  [coach, coach2, unverified, ava, ben, cleo, dev] = await Promise.all(
    ["coachv", "coach2", "coachu", "ava_test.edu", "ben_test.edu", "cleo_test.edu", "dev_test.edu"].map(login),
  );
  sql("DELETE FROM training_plans; DELETE FROM coach_athlete_connections");
  avaConn = await connect(ava, coach);          // coach <-> ava, ben: accepted
  await connect(ben, coach);
  await call(cleo, "POST", "/api/connections/requests", { userId: coach.id }); // cleo: only pending
  await connect(dev, coach2);                    // dev belongs to the OTHER coach
});

const planCount = (title) => Number(sql(`SELECT count(*) FROM training_plans WHERE title = '${title.replace(/'/g, "''")}'`));

describe("authentication and role", () => {
  it("rejects anonymous callers on every route with 401", async () => {
    for (const [m, p, b] of [["GET", "/api/training-plans"], ["POST", "/api/training-plans", good()], ["GET", "/api/training-plans/" + crypto.randomUUID()], ["PUT", "/api/training-plans/" + crypto.randomUUID(), good()]]) {
      const r = await call(null, m, p, b);
      assert.equal(r.status, 401, `${m} ${p}`);
      assert.equal(r.json.code, "unauthenticated");
    }
  });
  it("rejects a bad token with 401", async () => {
    assert.equal((await call({ token: "nope" }, "GET", "/api/training-plans")).status, 401);
  });
  it("a student-athlete can't use training plan routes (403)", async () => {
    for (const [m, p, b] of [["GET", "/api/training-plans"], ["POST", "/api/training-plans", good()]]) {
      const r = await call(ava, m, p, b);
      assert.equal(r.status, 403, `${m}`);
      assert.equal(r.json.code, "role_not_allowed");
    }
  });
});

describe("validation (400, per-field messages)", () => {
  it("draft needs only a title", async () => {
    const r = await call(coach, "POST", "/api/training-plans", { status: "DRAFT" });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "validation");
    assert.deepEqual(Object.keys(r.json.fieldErrors), ["title"]);
    const ok = await call(coach, "POST", "/api/training-plans", { status: "DRAFT", title: "Bare draft" });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.plan.status, "DRAFT");
    assert.equal(ok.json.plan.publishedAt, null);
    assert.equal(ok.json.plan.startDate, null);
  });
  it("publishing an incomplete plan lists every missing piece", async () => {
    const r = await call(coach, "POST", "/api/training-plans", { status: "PUBLISHED", title: "Incomplete" });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(r.json.fieldErrors).sort(), ["athleteIds", "endDate", "goals", "schedule", "skillFocus", "sport", "startDate"]);
    assert.equal(planCount("Incomplete"), 0);
  });
  it("status must be DRAFT or PUBLISHED", async () => {
    for (const status of [undefined, "", "draft", "ARCHIVED", 5, null]) {
      const r = await call(coach, "POST", "/api/training-plans", good({ status, athleteIds: [ava.id] }));
      assert.equal(r.status, 400, String(status));
      assert.ok(r.json.fieldErrors.status);
    }
  });
  const bad = [
    ["end before start", { endDate: "2026-11-01" }, "endDate"],
    ["impossible date", { startDate: "2026-02-31" }, "startDate"],
    ["wrong date format", { startDate: "11/10/2026" }, "startDate"],
    ["sport not offered", { sport: "Curling" }, "sport"],
    ["title too long", { title: "x".repeat(121) }, "title"],
    ["description too long", { description: "x".repeat(1001) }, "description"],
    ["whitespace-only title", { title: "    " }, "title"],
    ["duration 0", { schedule: [{ day: "Monday", drillName: "d", durationMinutes: 0, intensity: "Low" }] }, "schedule.0.durationMinutes"],
    ["duration 601", { schedule: [{ day: "Monday", drillName: "d", durationMinutes: 601, intensity: "Low" }] }, "schedule.0.durationMinutes"],
    ["duration 1.5", { schedule: [{ day: "Monday", drillName: "d", durationMinutes: 1.5, intensity: "Low" }] }, "schedule.0.durationMinutes"],
    ["duration text", { schedule: [{ day: "Monday", drillName: "d", durationMinutes: "abc", intensity: "Low" }] }, "schedule.0.durationMinutes"],
    ["unknown day", { schedule: [{ day: "Funday", drillName: "d", durationMinutes: 30, intensity: "Low" }] }, "schedule.0.day"],
    ["unknown intensity", { schedule: [{ day: "Monday", drillName: "d", durationMinutes: 30, intensity: "Extreme" }] }, "schedule.0.intensity"],
    ["blank drill name", { schedule: [{ day: "Monday", drillName: " ", durationMinutes: 30, intensity: "Low" }] }, "schedule.0.drillName"],
    ["blank goal", { goals: ["ok", " "] }, "goals.1"],
    ["goal too long", { goals: ["g".repeat(201)] }, "goals.0"],
    ["schedule not an array", { schedule: "Monday" }, "schedule"],
    ["title wrong type", { title: 123 }, "title"],
  ];
  for (const [name, patch, key] of bad) {
    it(`rejects: ${name}`, async () => {
      const r = await call(coach, "POST", "/api/training-plans", good({ ...patch, athleteIds: [ava.id] }));
      assert.equal(r.status, 400, JSON.stringify(r.json));
      assert.ok(r.json.fieldErrors[key], `expected error at ${key}, got ${JSON.stringify(r.json.fieldErrors)}`);
    });
  }
  it("rejects more than 21 schedule rows and more than 10 goals", async () => {
    const row = { day: "Monday", drillName: "d", durationMinutes: 30, intensity: "Low" };
    const a = await call(coach, "POST", "/api/training-plans", good({ schedule: Array(22).fill(row), athleteIds: [ava.id] }));
    assert.equal(a.status, 400); assert.ok(a.json.fieldErrors.schedule);
    const b = await call(coach, "POST", "/api/training-plans", good({ goals: Array(11).fill("g"), athleteIds: [ava.id] }));
    assert.equal(b.status, 400); assert.ok(b.json.fieldErrors.goals);
  });
  it("a non-JSON or non-object body is a 400, never a 500", async () => {
    assert.equal((await call(coach, "POST", "/api/training-plans", "{not json")).status, 400);
    const r = await call(coach, "POST", "/api/training-plans", "[1,2]");
    assert.equal(r.status, 400);
    assert.equal((await call(coach, "POST", "/api/training-plans", "null")).status, 400);
  });
  it("an oversized body is refused (413)", async () => {
    const r = await call(coach, "POST", "/api/training-plans", good({ description: "x".repeat(20000) }));
    assert.equal(r.status, 413);
  });
});

describe("authorization: only connected athletes can be assigned", () => {
  it("publishes to two connected athletes and returns the full plan", async () => {
    const r = await call(coach, "POST", "/api/training-plans", good({ athleteIds: [ava.id, ben.id] }));
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const p = r.json.plan;
    assert.equal(p.status, "PUBLISHED");
    assert.ok(p.publishedAt);
    assert.deepEqual(p.schedule.map((s) => s.day), ["Monday", "Wednesday", "Friday"]);
    assert.deepEqual(p.goals, ["Mid-range accuracy to 80%", "Maintain ladder drill speed"]);
    assert.deepEqual(p.athletes.map((a) => a.displayName), ["Ava Stone", "Ben Torres"]);
    assert.ok(p.athletes.every((a) => a.connected));
    assert.equal(p.coach.displayName, "Kim Verified");
    assert.equal(p.startDate, "2026-11-10");
  });
  it("refuses an athlete whose request is only pending (403) and saves nothing", async () => {
    const r = await call(coach, "POST", "/api/training-plans", good({ title: "Pending athlete", athleteIds: [ava.id, cleo.id] }));
    assert.equal(r.status, 403);
    assert.equal(r.json.code, "athlete_not_connected");
    assert.deepEqual(r.json.athleteIds, [cleo.id]);
    assert.ok(r.json.fieldErrors.athleteIds);
    assert.equal(planCount("Pending athlete"), 0);
  });
  it("refuses another coach's athlete, even for a draft", async () => {
    for (const status of ["PUBLISHED", "DRAFT"]) {
      const r = await call(coach, "POST", "/api/training-plans", good({ status, title: "Other coach athlete", athleteIds: [dev.id] }));
      assert.equal(r.status, 403, status);
      assert.equal(r.json.code, "athlete_not_connected");
    }
    assert.equal(planCount("Other coach athlete"), 0);
  });
  it("refuses a coach id, a made-up id and a junk id as an athlete (403, not 500)", async () => {
    for (const id of [coach2.id, crypto.randomUUID(), "'; DROP TABLE users;--"]) {
      const r = await call(coach, "POST", "/api/training-plans", good({ title: "Junk athlete", athleteIds: [id] }));
      assert.equal(r.status, 403, id);
      assert.equal(r.json.code, "athlete_not_connected");
    }
    assert.equal(sql("SELECT count(*) FROM users"), sql("SELECT count(*) FROM users")); // users table still there
  });
  it("an unverified coach can keep drafts but has nobody to assign", async () => {
    const d = await call(unverified, "POST", "/api/training-plans", { status: "DRAFT", title: "Unverified draft" });
    assert.equal(d.status, 201);
    const p = await call(unverified, "POST", "/api/training-plans", good({ title: "Unverified publish", athleteIds: [ava.id] }));
    assert.equal(p.status, 403);
    assert.equal(p.json.code, "athlete_not_connected");
  });
  it("assigning a disconnected athlete is refused; the plan keeps its old data (atomic)", async () => {
    const made = await call(coach, "POST", "/api/training-plans", good({ title: "Disconnect test", athleteIds: [ava.id, ben.id] }));
    const id = made.json.plan.id;
    assert.equal((await call(ben, "POST", `/api/connections/${(await call(ben, "GET", "/api/connections")).json.items[0].id}/disconnect`)).status, 200);
    const view = await call(coach, "GET", `/api/training-plans/${id}`);
    assert.deepEqual(view.json.plan.athletes.map((a) => [a.displayName, a.connected]), [["Ava Stone", true], ["Ben Torres", false]]);
    const upd = await call(coach, "PUT", `/api/training-plans/${id}`, good({ title: "Changed title", athleteIds: [ava.id, ben.id] }));
    assert.equal(upd.status, 403);
    const after = await call(coach, "GET", `/api/training-plans/${id}`);
    assert.equal(after.json.plan.title, "Disconnect test");          // nothing half-applied
    assert.equal(after.json.plan.schedule.length, 3);
    const ok = await call(coach, "PUT", `/api/training-plans/${id}`, good({ title: "Disconnect test", athleteIds: [ava.id] }));
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json.plan.athletes.map((a) => a.displayName), ["Ava Stone"]);
    await connect(ben, coach); // restore for later tests
  });
});

describe("ownership (a coach only ever sees their own plans)", () => {
  let planId;
  before(async () => { planId = (await call(coach, "POST", "/api/training-plans", good({ title: "Coach one plan", athleteIds: [ava.id] }))).json.plan.id; });
  it("another coach gets 404 on GET and PUT, and the plan is unchanged", async () => {
    assert.equal((await call(coach2, "GET", `/api/training-plans/${planId}`)).status, 404);
    const put = await call(coach2, "PUT", `/api/training-plans/${planId}`, good({ title: "HIJACKED", athleteIds: [dev.id] }));
    assert.equal(put.status, 404);
    assert.equal(put.json.code, "plan_not_found");
    assert.equal(sql(`SELECT title FROM training_plans WHERE id='${planId}'`), "Coach one plan");
  });
  it("unknown, malformed and injection-style ids are 404", async () => {
    for (const id of [crypto.randomUUID(), "abc", "1' OR '1'='1", "..%2F..%2Fetc"]) {
      assert.equal((await call(coach, "GET", `/api/training-plans/${id}`)).status, 404, id);
      assert.equal((await call(coach, "PUT", `/api/training-plans/${id}`, good({ athleteIds: [ava.id] }))).status, 404, id);
    }
  });
  it("the list shows only the caller's plans, filters by status and pages", async () => {
    await call(coach2, "POST", "/api/training-plans", { status: "DRAFT", title: "Coach two draft" });
    const mine = await call(coach, "GET", "/api/training-plans");
    assert.equal(mine.status, 200);
    assert.ok(mine.json.items.every((p) => p.title !== "Coach two draft"));
    const drafts = await call(coach, "GET", "/api/training-plans?status=DRAFT");
    assert.ok(drafts.json.items.length >= 1 && drafts.json.items.every((p) => p.status === "DRAFT"));
    const pub = await call(coach, "GET", "/api/training-plans?status=PUBLISHED");
    assert.ok(pub.json.items.every((p) => p.status === "PUBLISHED"));
    assert.equal(drafts.json.total + pub.json.total, mine.json.total);
    const page = await call(coach, "GET", "/api/training-plans?limit=1&offset=1");
    assert.equal(page.json.items.length, 1);
    assert.equal(page.json.total, mine.json.total);
    assert.equal((await call(coach, "GET", "/api/training-plans?status=WHATEVER")).status, 400);
    const withCount = mine.json.items.find((p) => p.id === planId);
    assert.equal(withCount.athleteCount, 1);
  });
});

describe("updates and status transitions", () => {
  it("PUT replaces schedule, goals and athletes; created_at is kept, updated_at moves", async () => {
    const made = await call(coach, "POST", "/api/training-plans", { status: "DRAFT", title: "Evolving", schedule: [{ day: "Monday", drillName: "A", durationMinutes: 10, intensity: "Low" }], goals: ["g1", "g2", "g3"], athleteIds: [ava.id] });
    const id = made.json.plan.id;
    await new Promise((r) => setTimeout(r, 15));
    const upd = await call(coach, "PUT", `/api/training-plans/${id}`, { status: "DRAFT", title: "Evolved", description: "now with words", schedule: [{ day: "Friday", drillName: "B", durationMinutes: 20, intensity: "High" }, { day: "Tuesday", drillName: "C", durationMinutes: 30, intensity: "Medium" }], goals: ["only one"], athleteIds: [ben.id] });
    assert.equal(upd.status, 200, JSON.stringify(upd.json));
    const p = upd.json.plan;
    assert.equal(p.title, "Evolved");
    assert.deepEqual(p.schedule.map((s) => s.drillName), ["B", "C"]);   // order as submitted
    assert.deepEqual(p.goals, ["only one"]);
    assert.deepEqual(p.athletes.map((a) => a.displayName), ["Ben Torres"]);
    assert.equal(p.createdAt, made.json.plan.createdAt);
    assert.ok(p.updatedAt > made.json.plan.updatedAt);
    assert.equal(sql(`SELECT count(*) FROM training_plan_goals WHERE plan_id='${id}'`), "1"); // no leftovers
  });
  it("draft -> published sets publishedAt; editing a published plan keeps it; it can't go back to draft", async () => {
    const made = await call(coach, "POST", "/api/training-plans", { status: "DRAFT", title: "Lifecycle" });
    const id = made.json.plan.id;
    const pub = await call(coach, "PUT", `/api/training-plans/${id}`, good({ title: "Lifecycle", athleteIds: [ava.id] }));
    assert.equal(pub.status, 200);
    assert.equal(pub.json.plan.status, "PUBLISHED");
    const stamp = pub.json.plan.publishedAt;
    assert.ok(stamp);
    const edit = await call(coach, "PUT", `/api/training-plans/${id}`, good({ title: "Lifecycle v2", athleteIds: [ava.id, ben.id] }));
    assert.equal(edit.json.plan.publishedAt, stamp);
    assert.equal(edit.json.plan.title, "Lifecycle v2");
    const back = await call(coach, "PUT", `/api/training-plans/${id}`, { status: "DRAFT", title: "Lifecycle v2" });
    assert.equal(back.status, 409);
    assert.equal(back.json.code, "cannot_unpublish");
    assert.equal((await call(coach, "GET", `/api/training-plans/${id}`)).json.plan.status, "PUBLISHED");
  });
  it("a published plan can't lose required parts through PUT", async () => {
    const made = await call(coach, "POST", "/api/training-plans", good({ title: "Stays complete", athleteIds: [ava.id] }));
    const r = await call(coach, "PUT", `/api/training-plans/${made.json.plan.id}`, good({ title: "Stays complete", goals: [], athleteIds: [ava.id] }));
    assert.equal(r.status, 400);
    assert.ok(r.json.fieldErrors.goals);
  });
  it("five simultaneous saves of one plan all succeed and leave one consistent state", async () => {
    const made = await call(coach, "POST", "/api/training-plans", good({ title: "Race", athleteIds: [ava.id] }));
    const id = made.json.plan.id;
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) =>
      call(coach, "PUT", `/api/training-plans/${id}`, good({ title: "Race", goals: [`goal ${i}`], schedule: Array.from({ length: i + 1 }, (_, k) => ({ day: "Monday", drillName: `drill ${i}-${k}`, durationMinutes: 10 + k, intensity: "Low" })), athleteIds: [ava.id] }))));
    assert.deepEqual(results.map((r) => r.status), [200, 200, 200, 200, 200]);
    const final = (await call(coach, "GET", `/api/training-plans/${id}`)).json.plan;
    assert.equal(final.goals.length, 1);
    const n = final.goals[0].split(" ")[1];
    assert.equal(final.schedule.length, Number(n) + 1);                 // schedule belongs to the same save as the goal
    assert.ok(final.schedule.every((s) => s.drillName.startsWith(`drill ${n}-`)));
  });
});

describe("data safety and the database itself", () => {
  it("stores hostile text literally (parameterised SQL) and returns it unchanged", async () => {
    const t = "'; DROP TABLE training_plans;-- <script>alert(1)</script>";
    const r = await call(coach, "POST", "/api/training-plans", { status: "DRAFT", title: t, description: "line1\nline2" });
    assert.equal(r.status, 201);
    assert.equal((await call(coach, "GET", `/api/training-plans/${r.json.plan.id}`)).json.plan.title, t);
    assert.equal((await call(coach, "GET", `/api/training-plans/${r.json.plan.id}`)).json.plan.description, "line1\nline2");
  });
  it("ignores unknown fields such as coachId, id and publishedAt (no mass assignment)", async () => {
    const r = await call(coach, "POST", "/api/training-plans", { status: "DRAFT", title: "Mass assign", coachId: coach2.id, coach_id: coach2.id, id: "x", publishedAt: "2020-01-01T00:00:00Z" });
    assert.equal(r.status, 201);
    assert.equal(r.json.plan.coach.id, coach.id);
    assert.equal(r.json.plan.publishedAt, null);
    assert.equal(sql(`SELECT coach_id FROM training_plans WHERE id='${r.json.plan.id}'`), coach.id);
  });
  it("the database refuses a PUBLISHED plan missing required fields, even bypassing the API", () => {
    assert.throws(() => sql(`INSERT INTO training_plans (id,coach_id,title,status,published_at,created_at,updated_at) VALUES ('bad1','${coach.id}','x','PUBLISHED',now(),now(),now())`), /training_plans_published_check/);
    assert.throws(() => sql(`INSERT INTO training_plans (id,coach_id,title,status,created_at,updated_at) VALUES ('bad2','${coach.id}','x','ARCHIVED',now(),now())`), /training_plans_(status|published)_check/);
    assert.throws(() => sql(`INSERT INTO training_plans (id,coach_id,title,start_date,end_date,created_at,updated_at) VALUES ('bad3','${coach.id}','x','2026-05-02','2026-05-01',now(),now())`), /training_plans_dates_check/);
  });
  it("deleting a plan removes its schedule, goals and assignments (cascade)", async () => {
    const r = await call(coach, "POST", "/api/training-plans", good({ title: "Cascade", athleteIds: [ava.id] }));
    const id = r.json.plan.id;
    assert.equal(sql(`SELECT count(*) FROM training_plan_assignments WHERE plan_id='${id}'`), "1");
    sql(`DELETE FROM training_plans WHERE id='${id}'`);
    for (const t of ["training_plan_schedule_items", "training_plan_goals", "training_plan_assignments"])
      assert.equal(sql(`SELECT count(*) FROM ${t} WHERE plan_id='${id}'`), "0", t);
  });
  it("writes audit entries without leaking plan content", async () => {
    const n = sql("SELECT count(*) FROM audit_log WHERE event LIKE 'training_plan.%'");
    assert.ok(Number(n) > 0);
    assert.equal(sql("SELECT count(*) FROM audit_log WHERE event LIKE 'training_plan.%' AND detail LIKE '%Shooting%'"), "0");
  });
  it("CORS preflight allows PUT from the dev origin", async () => {
    const r = await fetch(`${API}/api/training-plans/x`, { method: "OPTIONS", headers: { origin: "http://localhost:5173", "access-control-request-method": "PUT" } });
    assert.equal(r.status, 204);
    assert.match(r.headers.get("access-control-allow-methods"), /PUT/);
  });
  it("unsupported methods fall through to 404 (no accidental DELETE)", async () => {
    const r = await call(coach, "DELETE", "/api/training-plans/" + crypto.randomUUID());
    assert.equal(r.status, 404);
  });
});
