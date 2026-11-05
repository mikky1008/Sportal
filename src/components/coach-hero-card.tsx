import type { ReactNode } from "react";
import { Plus, Mail, Users, Zap } from "lucide-react";
import { PersonAvatar } from "@/components/avatar";
import { ProfileHero } from "@/components/profile-hero";
import { btn } from "@/components/common";
import court from "@/assets/court.jpg";

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

/**
 * Coach hero card. It is drawn by the same `ProfileHero` the athlete dashboard uses, so the look is
 * identical (court photo, navy gradient, framed avatar, three stat tiles, footer strip with the
 * main action at the bottom right). Only the coach's content differs.
 */
export function CoachHeroCard({
  coachName, coachingPosition, assignedSport, schoolName,
  totalRosterCount, activeTrainedCount, pendingRequestsCount, badge, onCreateTrainingPlan,
}: CoachHeroCardProps) {
  const title = [coachingPosition, assignedSport].filter(Boolean).join(" • ") || "Position not set";
  return (
    <ProfileHero
      ariaLabel="Coach profile overview"
      avatar={<PersonAvatar name={coachName} size="lg" shape="xl" tone="onDark" className="ring-2 ring-electric" />}
      name={coachName}
      meta={[title, schoolName || "University not set"]}
      badge={badge}
      tiles={[
        { label: "Total Roster", value: String(totalRosterCount), icon: Users },
        { label: "Active Trained", value: String(activeTrainedCount), icon: Zap },
        { label: "Pending Req", value: String(pendingRequestsCount), icon: Mail },
      ]}
      backdrop={<img src={court} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" width={1600} height={640} />}
      footer={
        <>
          <p className="text-sm text-navy-muted">{FOOTER_NOTE}</p>
          <button type="button" onClick={onCreateTrainingPlan} className={btn.primary}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Training Plan
          </button>
        </>
      }
    />
  );
}
