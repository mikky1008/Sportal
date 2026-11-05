import type { ReactNode } from "react";
import { Mail, Plus, Users, Zap, type LucideIcon } from "lucide-react";
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

function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-3 backdrop-blur sm:p-4">
      <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
      <p className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-navy-muted sm:text-xs">{label}</p>
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
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d2340] via-[#122e52] to-[#163962] text-white shadow-card"
    >
      <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center">
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
          <StatCard icon={Users} value={totalRosterCount} label="Total Roster" />
          <StatCard icon={Zap} value={activeTrainedCount} label="Active Trained" />
          <StatCard icon={Mail} value={pendingRequestsCount} label="Pending Req" />
        </div>
      </div>

      <div className="relative flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-sm text-navy-muted">{FOOTER_NOTE}</p>
        <button type="button" onClick={onCreateTrainingPlan} className={`${btn.primary} sm:ml-auto`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Training Plan
        </button>
      </div>
    </section>
  );
}
