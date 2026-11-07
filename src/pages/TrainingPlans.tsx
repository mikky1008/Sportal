// The athlete's Training Plans screen: every published plan a connected coach has assigned to them.
// Data comes from GET /api/athletes/me/training-plans. Tapping a plan opens its schedule and goals.

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardList, RefreshCw, TriangleAlert } from "lucide-react";
import { Link } from "@/router-compat";
import { PageHeader, Pill, btn } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  localToday, planPhase, useAssignedPlans,
  type AssignedPlanSummary, type LoadState, type PlanPhase,
} from "@/lib/assignedPlansApi";

const fmt = (iso: string | null) => (iso ? format(parseISO(iso), "MMM d, yyyy") : "");

export const PHASE_LABEL: Record<PlanPhase, string> = { active: "Active", upcoming: "Upcoming", completed: "Completed" };
export const PHASE_TONE = { active: "success", upcoming: "primary", completed: "default" } as const;
const FILTERS: ("all" | PlanPhase)[] = ["all", "active", "upcoming", "completed"];

export function dateRange(p: Pick<AssignedPlanSummary, "startDate" | "endDate">): string {
  if (p.startDate && p.endDate) return `${fmt(p.startDate)} – ${fmt(p.endDate)}`;
  return fmt(p.startDate ?? p.endDate) || "No dates set";
}

function PlanCard({ plan, today }: { plan: AssignedPlanSummary; today: string }) {
  const phase = planPhase(plan, today);
  return (
    <li>
      <Link to="/training-plans/$planId" params={{ planId: plan.id }} className="surface flex flex-col gap-2 p-5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{[plan.sport, plan.skillFocus].filter(Boolean).join(" • ")}</p>
          <Pill tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Pill>
        </div>
        <h2 className="font-display text-lg font-bold">{plan.title}</h2>
        <p className="text-sm text-muted-foreground">{dateRange(plan)}</p>
        <p className="text-sm text-muted-foreground">Coach: <span className="font-medium text-foreground">{plan.coach.displayName}</span></p>
      </Link>
    </li>
  );
}

export function TrainingPlansList({ plans, state = "ready", error, onRetry, today = localToday() }: {
  plans: AssignedPlanSummary[]; state?: LoadState; error?: string | null; onRetry?: () => void; today?: string;
}) {
  const [filter, setFilter] = useState<"all" | PlanPhase>("all");
  const counts = useMemo(() => {
    const c: Record<PlanPhase, number> = { active: 0, upcoming: 0, completed: 0 };
    for (const p of plans) c[planPhase(p, today)]++;
    return c;
  }, [plans, today]);
  const shown = filter === "all" ? plans : plans.filter((p) => planPhase(p, today) === filter);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Training Plans" subtitle="Plans your coaches have assigned to you." />

      {state === "loading" ? (
        <ul role="status" aria-label="Loading training plans" className="flex flex-col gap-3">
          {[0, 1].map((i) => <li key={i} className="surface p-5"><Skeleton className="h-20 w-full rounded-xl" /></li>)}
        </ul>
      ) : state === "error" ? (
        <div role="alert" className="surface flex flex-col items-center gap-3 px-6 py-10 text-center">
          <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{error ?? "Couldn't load your training plans."}</p>
          <button type="button" onClick={onRetry} className={cn(btn.secondary, btn.sm)}><RefreshCw className="h-4 w-4" /> Try again</button>
        </div>
      ) : plans.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <ClipboardList className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold">No training plans yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">When a coach you're connected with assigns you a plan, it will show up here.</p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter plans">
            {FILTERS.map((f) => (
              <button
                key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold", filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
              >
                {f === "all" ? `All (${plans.length})` : `${PHASE_LABEL[f]} (${counts[f]})`}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No {filter === "all" ? "" : PHASE_LABEL[filter].toLowerCase() + " "}plans.</p>
          ) : (
            <ul className="flex flex-col gap-3">{shown.map((p) => <PlanCard key={p.id} plan={p} today={today} />)}</ul>
          )}
        </>
      )}
    </div>
  );
}

export default function TrainingPlansPage() {
  const { plans, state, error, reload } = useAssignedPlans();
  return <TrainingPlansList plans={plans} state={state} error={error?.message ?? null} onRetry={reload} />;
}
