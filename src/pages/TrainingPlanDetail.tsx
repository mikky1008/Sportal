// One assigned training plan, as the athlete sees it: sport and focus, dates, coach, goals and the
// weekly schedule. Read-only. Data comes from GET /api/athletes/me/training-plans/:id.

import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Link } from "@/router-compat";
import { Pill, btn } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DAYS } from "@/lib/trainingPlanRules";
import { localToday, planPhase, useAssignedPlan, type AssignedPlan, type LoadState } from "@/lib/assignedPlansApi";
import { PHASE_LABEL, PHASE_TONE, dateRange } from "@/pages/TrainingPlans";

const INTENSITY_TONE = { Low: "success", Medium: "warning", High: "primary" } as const;
const dayRank = (d: string) => (DAYS as readonly string[]).indexOf(d);

function BackLink() {
  return <Link to="/training-plans" direction="back" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All training plans</Link>;
}

export function TrainingPlanDetailView({ plan, state = "ready", error, notFound, onRetry, today = localToday() }: {
  plan: AssignedPlan | null; state?: LoadState; error?: string | null; notFound?: boolean; onRetry?: () => void; today?: string;
}) {
  if (state === "loading") return (
    <div className="mx-auto max-w-3xl"><BackLink /><div role="status" aria-label="Loading plan" className="surface p-5"><Skeleton className="h-48 w-full rounded-xl" /></div></div>
  );
  if (state === "error" || !plan) return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <div role="alert" className="surface flex flex-col items-center gap-3 px-6 py-10 text-center">
        <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{notFound ? "This training plan isn't available. It may have been removed, or you're no longer connected to the coach." : error ?? "Couldn't load this plan."}</p>
        {!notFound && <button type="button" onClick={onRetry} className={cn(btn.secondary, btn.sm)}><RefreshCw className="h-4 w-4" /> Try again</button>}
      </div>
    </div>
  );

  const phase = planPhase(plan, today);
  const schedule = plan.schedule.map((s, i) => ({ ...s, i })).sort((a, b) => dayRank(a.day) - dayRank(b.day) || a.i - b.i);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <article aria-label="Training plan" className="surface flex flex-col gap-6 p-5 sm:p-6">
        <header>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{[plan.sport, plan.skillFocus].filter(Boolean).join(" • ")}</p>
            <Pill tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Pill>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">{plan.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Duration: {dateRange(plan)} <span aria-hidden="true">|</span> Assigned Coach: {plan.coach.displayName}</p>
          {plan.description && <p className="mt-3 whitespace-pre-line text-sm">{plan.description}</p>}
        </header>

        {plan.goals.length > 0 && (
          <section aria-label="Target goals">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Goals</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">{plan.goals.map((g, i) => <li key={i}>{g}</li>)}</ul>
          </section>
        )}

        <section aria-label="Weekly schedule">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Workout Schedule</h2>
          {schedule.length === 0 ? <p className="text-sm text-muted-foreground">Your coach hasn't added a schedule yet.</p> : (
            <ul className="divide-y rounded-xl border">
              {schedule.map((s) => (
                <li key={s.i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                  <span className="w-24 shrink-0 font-semibold">{s.day}</span>
                  <span className="min-w-0 flex-1">{s.drillName}</span>
                  <span className="text-muted-foreground">{s.durationMinutes} mins</span>
                  <Pill tone={INTENSITY_TONE[s.intensity as keyof typeof INTENSITY_TONE] ?? "default"}>{s.intensity}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </div>
  );
}

export default function TrainingPlanDetailPage() {
  const { pathname } = useLocation();
  const m = /^\/training-plans\/([^/]+)\/?$/.exec(pathname);
  const id = m ? decodeURIComponent(m[1] as string) : "";
  const { plan, state, error, reload } = useAssignedPlan(id);
  return <TrainingPlanDetailView plan={plan} state={state} error={error?.message ?? null} notFound={error?.code === "plan_not_found"} onRetry={reload} />;
}
