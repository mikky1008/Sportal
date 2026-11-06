import { format, parseISO } from "date-fns";
import { Loader2, TriangleAlert } from "lucide-react";
import { Pill, btn } from "@/components/common";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DAYS, type PlanInput } from "@/lib/trainingPlanRules";
import { cn } from "@/lib/utils";

const fmt = (iso: string) => (iso ? format(parseISO(iso), "MMM d, yyyy") : "");
const dayRank = (d: string) => (DAYS as readonly string[]).indexOf(d);
const INTENSITY_TONE = { Low: "success", Medium: "warning", High: "primary" } as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanInput;
  coachName: string;
  /** display names of the selected athletes */
  athleteNames: string[];
  /** true once the plan is already published (the confirm button then saves changes) */
  alreadyPublished: boolean;
  confirming: boolean;
  error: string | null;
  onConfirm: () => void;
}

/**
 * "How the athlete will see this plan". Shows the plan as the Athlete Workspace will present it
 * (sport and focus, title, dates, coach, goals, weekly schedule) and asks for the final OK.
 */
export function TrainingPlanPreview({ open, onOpenChange, plan, coachName, athleteNames, alreadyPublished, confirming, error, onConfirm }: Props) {
  // Same day order as the week, rows within a day keep the order the coach arranged them.
  const schedule = plan.schedule
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => dayRank(a.day) - dayRank(b.day) || a.i - b.i);
  const who = athleteNames.length <= 2 ? athleteNames.join(" & ") : `${athleteNames.slice(0, 2).join(", ")} & ${athleteNames.length - 2} more`;

  return (
    <Dialog open={open} onOpenChange={(v) => !confirming && onOpenChange(v)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete workspace preview</DialogTitle>
          <DialogDescription>How {who || "your athletes"} will see this plan.</DialogDescription>
        </DialogHeader>

        <article aria-label="Plan preview" className="flex flex-col gap-5 rounded-2xl border bg-card p-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{[plan.sport, plan.skillFocus].filter(Boolean).join(" • ")}</p>
            <h3 className="mt-1 font-display text-2xl font-bold">{plan.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Duration: {fmt(plan.startDate)} – {fmt(plan.endDate)} <span aria-hidden="true">|</span> Assigned Coach: {coachName}
            </p>
            {plan.description && <p className="mt-3 whitespace-pre-line text-sm">{plan.description}</p>}
          </header>

          <section aria-label="Target goals">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Goals</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {plan.goals.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </section>

          <section aria-label="Weekly schedule">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Workout Schedule</h4>
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
          </section>
        </article>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" disabled={confirming} onClick={() => onOpenChange(false)} className={cn(btn.secondary)}>Back to Editing</button>
          <button type="button" disabled={confirming} onClick={onConfirm} className={cn(btn.primary)}>
            {confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {alreadyPublished ? "Confirm Changes" : "Confirm Publish"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
