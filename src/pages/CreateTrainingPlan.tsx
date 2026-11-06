import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Eye, Loader2, Plus, RefreshCw, Save, Send, Target, Trash2, TriangleAlert, Users } from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { Card, EmptyState, Pill, Select, btn } from "@/components/common";
import { PersonAvatar } from "@/components/avatar";
import { TrainingPlanPreview } from "@/components/training-plan-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/auth/AuthContext";
import { Link, useNavigate } from "@/router-compat";
import { listConnections, type ConnectionView } from "@/lib/connectionsApi";
import {
  createTrainingPlan, getTrainingPlan, updateTrainingPlan, type SavePlanBody, type TrainingPlan,
} from "@/lib/trainingPlansApi";
import {
  DAYS, INTENSITIES, LIMITS, SPORTS, sanitizePlanInput, summarizeErrors, validatePlan,
  type FieldErrors, type PlanInput, type PlanStatus,
} from "@/lib/trainingPlanRules";
import { cn } from "@/lib/utils";

/* Create / edit a training plan. `/coach/training-plans/new` starts a blank plan; a plan id in the
   URL opens that plan. Validation uses the same rules file as the API (lib/trainingPlanRules). */

const field = "h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring";
const invalid = "border-destructive focus:ring-destructive/40";
const labelCls = "flex flex-col gap-1.5 text-sm font-semibold";
const miniLabel = "text-xs font-medium text-muted-foreground md:hidden";

interface Row { key: string; day: string; drillName: string; duration: string; intensity: string }
interface Goal { key: string; text: string }
interface Form {
  title: string; description: string; sport: string; skillFocus: string; startDate: string; endDate: string;
  rows: Row[]; goals: Goal[]; athleteIds: string[];
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const blankForm = (): Form => ({ title: "", description: "", sport: "", skillFocus: "", startDate: "", endDate: "", rows: [], goals: [], athleteIds: [] });

function formFromPlan(p: TrainingPlan): Form {
  return {
    title: p.title, description: p.description, sport: p.sport, skillFocus: p.skillFocus,
    startDate: p.startDate ?? "", endDate: p.endDate ?? "",
    rows: p.schedule.map((s) => ({ key: newKey(), day: s.day, drillName: s.drillName, duration: String(s.durationMinutes), intensity: s.intensity })),
    goals: p.goals.map((text) => ({ key: newKey(), text })),
    athleteIds: p.athletes.filter((a) => a.connected).map((a) => a.id),
  };
}

/** The form as the shared rules see it (trimmed, numbers parsed). */
const toInput = (f: Form): PlanInput =>
  sanitizePlanInput({
    ...f,
    schedule: f.rows.map((r) => ({ day: r.day, drillName: r.drillName, durationMinutes: r.duration, intensity: r.intensity })),
    goals: f.goals.map((g) => g.text),
  });

const nameOf = (c: ConnectionView) => [c.counterpart.firstName, c.counterpart.lastName].filter(Boolean).join(" ") || c.counterpart.displayName;

function Err({ id, msg }: { id: string; msg: string | undefined }) {
  return msg ? <span id={id} role="alert" className="text-xs font-normal text-destructive">{msg}</span> : null;
}

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center">
      <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className={cn(btn.secondary, btn.sm)}><RefreshCw className="h-4 w-4" /> Try again</button>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */

type Load = "loading" | "ready" | "error";

function TrainingPlanForm({ planIdFromUrl }: { planIdFromUrl: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const coachName = user?.displayName ?? "Coach";

  const [form, setForm] = useState<Form>(blankForm);
  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [savedStatus, setSavedStatus] = useState<PlanStatus>("DRAFT");
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<null | "draft" | "publish">(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // the plan being edited
  const [planLoad, setPlanLoad] = useState<Load>(planIdFromUrl ? "loading" : "ready");
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);
  const [droppedNames, setDroppedNames] = useState<string[]>([]);
  const loadedId = useRef<string | null>(null);

  // the coach's connected athletes
  const [athletes, setAthletes] = useState<ConnectionView[]>([]);
  const [athLoad, setAthLoad] = useState<Load>("loading");
  const [athError, setAthError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const loadAthletes = useCallback(async () => {
    setAthLoad("loading");
    const res = await listConnections("accepted");
    if (!alive.current) return;
    if (res.ok) { setAthletes(res.data.items); setAthLoad("ready"); }
    else { setAthError(res.message); setAthLoad("error"); }
  }, []);
  useEffect(() => { void loadAthletes(); }, [loadAthletes]);

  const loadPlan = useCallback(async (id: string) => {
    setPlanLoad("loading");
    const res = await getTrainingPlan(id);
    if (!alive.current) return;
    if (!res.ok) {
      setPlanLoadError(res.status === 404 ? "This training plan doesn't exist or isn't yours." : res.message);
      setPlanLoad("error");
      return;
    }
    loadedId.current = res.data.plan.id;
    setForm(formFromPlan(res.data.plan));
    setSavedStatus(res.data.plan.status);
    setDroppedNames(res.data.plan.athletes.filter((a) => !a.connected).map((a) => a.displayName));
    setDirty(false);
    setPlanLoad("ready");
  }, []);

  useEffect(() => {
    if (planIdFromUrl && planIdFromUrl !== loadedId.current) void loadPlan(planIdFromUrl);
  }, [planIdFromUrl, loadPlan]);

  const input = useMemo(() => toInput(form), [form]);
  const clientErrors = useMemo(() => validatePlan(input, "PUBLISHED"), [input]);
  // Errors shown on screen: the strict (publish) rules after a publish/preview attempt, the
  // lenient (draft) rules after a Save Draft attempt, plus whatever the server last rejected.
  const [mode, setMode] = useState<PlanStatus>("DRAFT");
  const shown: FieldErrors = useMemo(
    () => (showErrors ? { ...(mode === "PUBLISHED" ? clientErrors : validatePlan(input, "DRAFT")), ...serverErrors } : {}),
    [showErrors, mode, clientErrors, input, serverErrors],
  );

  const change = (patch: Partial<Form>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); setServerErrors({}); };
  const setRow = (key: string, patch: Partial<Row>) => change({ rows: form.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  const setGoal = (key: string, text: string) => change({ goals: form.goals.map((g) => (g.key === key ? { ...g, text } : g)) });

  const addDay = () => {
    if (form.rows.length >= LIMITS.scheduleMax) return;
    const used = new Set(form.rows.map((r) => r.day));
    const day = DAYS.find((d) => !used.has(d)) ?? DAYS[0];
    change({ rows: [...form.rows, { key: newKey(), day, drillName: "", duration: "45", intensity: "Medium" }] });
  };
  const addGoal = () => { if (form.goals.length < LIMITS.goalsMax) change({ goals: [...form.goals, { key: newKey(), text: "" }] }); };
  const toggleAthlete = (id: string) =>
    change({ athleteIds: form.athleteIds.includes(id) ? form.athleteIds.filter((a) => a !== id) : [...form.athleteIds, id] });

  const focusFirst = (errors: FieldErrors) => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      el?.focus?.();
    });
  };

  const applyServerFailure = (res: { code: string; message: string; fieldErrors?: Record<string, string> }) => {
    if (res.fieldErrors) { setServerErrors(res.fieldErrors); setShowErrors(true); focusFirst(res.fieldErrors); }
    if (res.code === "athlete_not_connected") void loadAthletes(); // the roster changed: show the truth
  };

  /** One call to the API: create when the plan has no id yet, otherwise replace it. */
  const persist = async (status: PlanStatus) => {
    const body: SavePlanBody = { ...input, status };
    const res = planId ? await updateTrainingPlan(planId, body) : await createTrainingPlan(body);
    if (!alive.current) return null;
    if (!res.ok) return res;
    const plan = res.data.plan;
    const wasNew = !planId;
    loadedId.current = plan.id; // we already hold this plan: don't reload it when the URL changes
    setPlanId(plan.id);
    setSavedStatus(plan.status);
    setDirty(false);
    setServerErrors({});
    if (wasNew) navigate({ to: "/coach/training-plans/$planId", params: { planId: plan.id }, replace: true });
    return plan;
  };

  const saveDraft = async () => {
    setMode("DRAFT"); setShowErrors(true);
    const errors = validatePlan(input, "DRAFT");
    if (Object.keys(errors).length > 0) { toast.error(summarizeErrors(errors)); focusFirst(errors); return; }
    setSaving("draft");
    const res = await persist("DRAFT");
    if (alive.current) setSaving(null);
    if (!res) return;
    if ("code" in res) { toast.error(res.message); applyServerFailure(res); return; }
    setShowErrors(false);
    toast.success("Draft saved.");
  };

  /** Publish / Preview: the plan must pass the strict rules before it can be previewed. */
  const openPreview = () => {
    setMode("PUBLISHED"); setShowErrors(true);
    if (Object.keys(clientErrors).length > 0) { toast.error(summarizeErrors(clientErrors)); focusFirst(clientErrors); return; }
    setPreviewError(null);
    setPreviewOpen(true);
  };

  const confirmPublish = async () => {
    setSaving("publish"); setPreviewError(null);
    const res = await persist("PUBLISHED");
    if (alive.current) setSaving(null);
    if (!res) return;
    if ("code" in res) {
      if (res.fieldErrors) { setPreviewOpen(false); toast.error(res.message); applyServerFailure(res); }
      else setPreviewError(res.message);
      return;
    }
    setPreviewOpen(false);
    setShowErrors(false);
    toast.success(savedStatus === "PUBLISHED" && planId ? "Training plan updated." : "Training plan published.");
  };

  const published = savedStatus === "PUBLISHED";
  const selectedNames = athletes.filter((c) => form.athleteIds.includes(c.counterpart.id)).map(nameOf).sort((a, b) => a.localeCompare(b));
  const errorCount = Object.keys(shown).length;

  if (planLoad === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Loading training plan">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div>
      </div>
    );
  }
  if (planLoad === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/coach/dashboard" direction="root" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        <Card><LoadError message={planLoadError ?? "We couldn't load this plan."} onRetry={() => planIdFromUrl && void loadPlan(planIdFromUrl)} /></Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link to="/coach/dashboard" direction="root" className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Dashboard
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">{planId ? "Edit Training Plan" : "Create Training Plan"}</h1>
            <p className="mt-1 text-muted-foreground">Design and assign performance routines for authorized athletes.</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-muted-foreground">Status:</span>
              <Pill tone={published ? "success" : "warning"}>{published ? "Published" : "Draft / Unpublished"}</Pill>
              {dirty && <Pill tone="default">Unsaved changes</Pill>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openPreview} disabled={saving !== null} className={btn.secondary}><Eye className="h-4 w-4" /> Preview</button>
            {!published && (
              <button type="button" onClick={() => void saveDraft()} disabled={saving !== null} className={btn.secondary}>
                {saving === "draft" ? <Spinner /> : <Save className="h-4 w-4" />} Save Draft
              </button>
            )}
            <button type="button" onClick={openPreview} disabled={saving !== null} className={btn.primary}>
              {saving === "publish" ? <Spinner /> : <Send className="h-4 w-4" />} {published ? "Save Changes" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {showErrors && errorCount > 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" /> {summarizeErrors(shown)}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="General Information" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={cn(labelCls, "sm:col-span-2")}>
              <span>Plan Title <span aria-hidden="true">*</span></span>
              <input data-field="title" value={form.title} maxLength={LIMITS.title + 20} onChange={(e) => change({ title: e.target.value })}
                aria-required="true" aria-invalid={!!shown["title"]} aria-describedby="err-title" placeholder="e.g. Pre-Season Shooting & Footwork Conditioning"
                className={cn(field, shown["title"] && invalid)} />
              <Err id="err-title" msg={shown["title"]} />
            </label>

            <label className={labelCls}>
              <span>Sport</span>
              <Select data-field="sport" value={form.sport} placeholder="Select a sport" onChange={(e) => change({ sport: e.target.value })}
                aria-invalid={!!shown["sport"]} aria-describedby="err-sport" className={cn(shown["sport"] && invalid)}>
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Err id="err-sport" msg={shown["sport"]} />
            </label>

            <label className={labelCls}>
              <span>Skill Focus</span>
              <input data-field="skillFocus" value={form.skillFocus} onChange={(e) => change({ skillFocus: e.target.value })}
                aria-invalid={!!shown["skillFocus"]} aria-describedby="err-skillFocus" placeholder="e.g. Shooting & Footwork"
                className={cn(field, shown["skillFocus"] && invalid)} />
              <Err id="err-skillFocus" msg={shown["skillFocus"]} />
            </label>

            <label className={cn(labelCls, "sm:col-span-2")}>
              <span className="flex items-baseline justify-between gap-2">Description <span className="text-xs font-normal text-muted-foreground">{form.description.length}/{LIMITS.description}</span></span>
              <textarea data-field="description" value={form.description} rows={3} onChange={(e) => change({ description: e.target.value })}
                aria-invalid={!!shown["description"]} aria-describedby="err-description" placeholder="What is this plan about?"
                className={cn(field, "h-auto min-h-24 py-2.5", shown["description"] && invalid)} />
              <Err id="err-description" msg={shown["description"]} />
            </label>

            <label className={labelCls}>
              <span>Start Date</span>
              <input data-field="startDate" type="date" value={form.startDate} onChange={(e) => change({ startDate: e.target.value })}
                aria-invalid={!!shown["startDate"]} aria-describedby="err-startDate" className={cn(field, shown["startDate"] && invalid)} />
              <Err id="err-startDate" msg={shown["startDate"]} />
            </label>
            <label className={labelCls}>
              <span>End Date</span>
              <input data-field="endDate" type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => change({ endDate: e.target.value })}
                aria-invalid={!!shown["endDate"]} aria-describedby="err-endDate" className={cn(field, shown["endDate"] && invalid)} />
              <Err id="err-endDate" msg={shown["endDate"]} />
            </label>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Assign Athletes" action={<span className="text-xs font-medium text-muted-foreground">Connected athletes only</span>}>
            {athLoad === "loading" ? (
              <div className="flex flex-col gap-3" role="status" aria-label="Loading athletes">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
              </div>
            ) : athLoad === "error" ? (
              <LoadError message={athError ?? "We couldn't load your athletes."} onRetry={() => void loadAthletes()} />
            ) : athletes.length === 0 ? (
              <EmptyState message="You have no connected athletes yet. Connect with athletes from your dashboard, then assign plans to them here." />
            ) : (
              <fieldset className="flex flex-col gap-2" aria-describedby="err-athleteIds">
                <legend className="sr-only">Athletes to assign this plan to</legend>
                {athletes.map((c) => {
                  const id = c.counterpart.id;
                  const on = form.athleteIds.includes(id);
                  return (
                    <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition hover:bg-muted", on && "border-primary bg-accent/40")}>
                      <input type="checkbox" checked={on} onChange={() => toggleAthlete(id)} className="h-4 w-4 accent-primary" data-field={athletes[0]?.id === c.id ? "athleteIds" : undefined} />
                      <PersonAvatar name={nameOf(c)} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{nameOf(c)}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}
            <div className="mt-2"><Err id="err-athleteIds" msg={shown["athleteIds"]} /></div>
            {droppedNames.length > 0 && (
              <p className="mt-3 rounded-xl bg-warning/20 px-3 py-2 text-xs text-foreground">
                No longer connected, removed from this plan: {droppedNames.join(", ")}. Save to apply.
              </p>
            )}
            {athLoad === "ready" && athletes.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" aria-hidden="true" /> {form.athleteIds.length} selected</p>
            )}
          </Card>

          <Card title="Target Goals" action={
            <button type="button" onClick={addGoal} disabled={form.goals.length >= LIMITS.goalsMax}
              className="inline-flex items-center gap-1 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add Goal
            </button>}>
            {form.goals.length === 0 ? (
              <EmptyState message="No goals yet. Add what athletes should achieve." />
            ) : (
              <ol className="flex flex-col gap-3">
                {form.goals.map((g, i) => (
                  <li key={g.key} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <input data-field={`goals.${i}`} value={g.text} onChange={(e) => setGoal(g.key, e.target.value)} aria-label={`Goal ${i + 1}`}
                        aria-invalid={!!shown[`goals.${i}`]} placeholder="e.g. Mid-range accuracy to 80%" className={cn(field, "h-10", shown[`goals.${i}`] && invalid)} />
                      <button type="button" aria-label={`Remove goal ${i + 1}`} onClick={() => change({ goals: form.goals.filter((x) => x.key !== g.key) })}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Err id={`err-goal-${i}`} msg={shown[`goals.${i}`]} />
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-2"><Err id="err-goals" msg={shown["goals"]} /></div>
          </Card>
        </div>
      </div>

      <Card title="Weekly Workout Schedule" action={
        <button type="button" onClick={addDay} disabled={form.rows.length >= LIMITS.scheduleMax}
          className="inline-flex items-center gap-1 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add Day
        </button>}>
        {form.rows.length === 0 ? (
          <EmptyState message="No workouts scheduled yet. Use Add Day to build the week." />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="hidden grid-cols-[9rem_1fr_7rem_8rem_2.75rem] gap-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid" aria-hidden="true">
              <span>Day</span><span>Drill Name</span><span>Duration</span><span>Intensity</span><span />
            </div>
            {form.rows.map((r, i) => (
              <div key={r.key} role="group" aria-label={`Workout ${i + 1}`} className="grid grid-cols-2 gap-3 rounded-2xl border p-3 md:grid-cols-[9rem_1fr_7rem_8rem_2.75rem] md:items-start md:border-0 md:p-0">
                <div className="flex flex-col gap-1">
                  <span className={miniLabel}>Day</span>
                  <Select data-field={`schedule.${i}.day`} aria-label={`Day for workout ${i + 1}`} value={r.day} onChange={(e) => setRow(r.key, { day: e.target.value })}>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                  <Err id={`err-day-${i}`} msg={shown[`schedule.${i}.day`]} />
                </div>
                <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
                  <span className={miniLabel}>Drill name</span>
                  <input data-field={`schedule.${i}.drillName`} aria-label={`Drill name for workout ${i + 1}`} value={r.drillName} onChange={(e) => setRow(r.key, { drillName: e.target.value })}
                    aria-invalid={!!shown[`schedule.${i}.drillName`]} placeholder="e.g. Shooting & Footwork Drills" className={cn(field, shown[`schedule.${i}.drillName`] && invalid)} />
                  <Err id={`err-drill-${i}`} msg={shown[`schedule.${i}.drillName`]} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={miniLabel}>Duration (mins)</span>
                  <input data-field={`schedule.${i}.durationMinutes`} aria-label={`Duration in minutes for workout ${i + 1}`} inputMode="numeric" value={r.duration}
                    onChange={(e) => setRow(r.key, { duration: e.target.value })} aria-invalid={!!shown[`schedule.${i}.durationMinutes`]}
                    placeholder="mins" className={cn(field, shown[`schedule.${i}.durationMinutes`] && invalid)} />
                  <Err id={`err-dur-${i}`} msg={shown[`schedule.${i}.durationMinutes`]} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={miniLabel}>Intensity</span>
                  <Select data-field={`schedule.${i}.intensity`} aria-label={`Intensity for workout ${i + 1}`} value={r.intensity} onChange={(e) => setRow(r.key, { intensity: e.target.value })}>
                    {INTENSITIES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </Select>
                  <Err id={`err-int-${i}`} msg={shown[`schedule.${i}.intensity`]} />
                </div>
                <button type="button" aria-label={`Delete workout ${i + 1}`} onClick={() => change({ rows: form.rows.filter((x) => x.key !== r.key) })}
                  className="col-span-2 grid h-11 place-items-center rounded-xl border text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-span-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2"><Err id="err-schedule" msg={shown["schedule"]} /></div>
      </Card>

      <TrainingPlanPreview
        open={previewOpen} onOpenChange={setPreviewOpen} plan={input} coachName={coachName} athleteNames={selectedNames}
        alreadyPublished={published} confirming={saving === "publish"} error={previewError} onConfirm={() => void confirmPublish()}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */

function CreateTrainingPlan(): ReactNode {
  const { pathname } = useLocation();
  const m = /^\/coach\/training-plans\/([^/]+)\/?$/.exec(pathname);
  const planId = m && m[1] !== "new" ? decodeURIComponent(m[1] as string) : null;
  return <TrainingPlanForm planIdFromUrl={planId} />;
}

export default function CreateTrainingPlanPage() {
  return (
    <CoachLayout>
      <CreateTrainingPlan />
    </CoachLayout>
  );
}
