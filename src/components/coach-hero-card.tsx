import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { PersonAvatar } from "@/components/avatar";
import { btn } from "@/components/common";

export interface CoachHeroCardProps {
  coachName: string;
  coachingPosition: string;
  assignedSport: string;
  schoolName: string;
  totalRosterCount: number;
  activeTrainedCount: number;
  pendingRequestsCount: number;
  /** optional verification badge shown under the organization */
  badge?: ReactNode;
  onCreateTrainingPlan: () => void;
}

const FOOTER_NOTE = "Roster updates reflect real-time team activity. Figures shown are sample data for now.";

function StatCard({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-3 backdrop-blur sm:p-4">
      <p className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
        <span className="text-xl sm:text-2xl" aria-hidden="true">{emoji}</span>
        <span className="truncate">{value}</span>
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-navy-muted sm:text-xs">{label}</p>
    </div>
  );
}

/**
 * Coach hero card. Same structure as the athlete's hero (avatar and details on the left, three stat
 * cards on the right, a note and the main action along the bottom) in a dark-navy gradient container.
 */
export function CoachHeroCard({
  coachName, coachingPosition, assignedSport, schoolName,
  totalRosterCount, activeTrainedCount, pendingRequestsCount, badge, onCreateTrainingPlan,
}: CoachHeroCardProps) {
  const title = [coachingPosition, assignedSport].filter(Boolean).join(" • ") || "Position not set";
  return (
    <section
      aria-label="Coach profile overview"
      className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d2340] via-[#122e52] to-[#163962] p-5 text-white shadow-card sm:p-8"
    >
      {/* top: coach on the left, three stat cards on the right */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <PersonAvatar name={coachName} size="lg" shape="xl" tone="onDark" className="ring-2 ring-electric" />
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold sm:text-3xl">{coachName}</h2>
            <p className="break-words text-navy-muted">{title}</p>
            <p className="break-words text-sm text-navy-muted">{schoolName || "University not set"}</p>
            {badge && <div className="mt-2">{badge}</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:ml-auto lg:min-w-[30rem]">
          <StatCard emoji="👥" value={totalRosterCount} label="Total Roster" />
          <StatCard emoji="⚡" value={activeTrainedCount} label="Active Trained" />
          <StatCard emoji="📩" value={pendingRequestsCount} label="Pending Req" />
        </div>
      </div>

      {/* bottom: note on the left, main action in the bottom-right corner (no divider line) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-navy-muted">{FOOTER_NOTE}</p>
        <button type="button" onClick={onCreateTrainingPlan} className={`${btn.primary} shrink-0`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Training Plan
        </button>
      </div>
    </section>
  );
}
