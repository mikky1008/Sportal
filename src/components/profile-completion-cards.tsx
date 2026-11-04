import { useMemo, useState } from "react";
import { Link } from "@/router-compat";
import { toast } from "sonner";
import { CompletionCard } from "@/components/profile-completion";
import { CoachProfileSheet } from "@/components/coach-profile-sheet";
import { Pill, btn } from "@/components/common";
import { profileStore, useAthleteProfile } from "@/lib/profileStore";
import { profileExtrasStore, useProfileExtras } from "@/lib/profileExtrasStore";
import { useCoachProfile, type CoachVerificationStatus } from "@/lib/coachProfileStore";
import {
  athleteMessage, coachMessage, computeAthleteCompletion, computeCoachCompletion,
  type AthleteSectionId, type CoachSectionId,
} from "@/lib/profileCompletion";

/** Live completion for the signed-in athlete, recalculated whenever a profile save lands. */
export function useAthleteCompletion() {
  const athlete = useAthleteProfile();
  const extras = useProfileExtras();
  return useMemo(() => computeAthleteCompletion(athlete, extras), [athlete, extras]);
}

export function AthleteCompletionCard() {
  const result = useAthleteCompletion();
  return (
    <CompletionCard
      testId="athlete-completion"
      title="Complete Your Athlete Profile"
      result={result}
      message={athleteMessage(result)}
      note="Profile completion only shows how much of your profile is filled in. It is not a performance score and doesn't change your rank."
      completeText={<Link to="/profile" className={btn.secondary}>View my showcase</Link>}
      renderAction={(s, className, children) => (
        <Link to="/complete-profile" search={{ section: s.id as AthleteSectionId }} className={className}>{children}</Link>
      )}
    />
  );
}

const verificationTone: Record<CoachVerificationStatus, "warning" | "success" | "default"> = {
  Pending: "warning",
  Verified: "success",
  Rejected: "default",
};
const verificationText: Record<CoachVerificationStatus, string> = {
  Pending: "Pending review",
  Verified: "Verified",
  Rejected: "Not approved",
};

/** Organization verification is reported next to — never inside — profile completion. */
function VerificationStatus({ status }: { status: CoachVerificationStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-testid="coach-verification">
      <span className="font-semibold">Organization verification</span>
      <Pill tone={verificationTone[status]}>{verificationText[status]}</Pill>
      <span className="text-xs text-muted-foreground">Reviewed separately by Sportal. It doesn't change your profile completion.</span>
    </div>
  );
}

export function CoachCompletionCard() {
  const { profile, verificationStatus } = useCoachProfile();
  const result = useMemo(() => computeCoachCompletion(profile), [profile]);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<CoachSectionId | null>(null);
  const openAt = (id: CoachSectionId) => {
    setSection(id);
    setOpen(true);
  };
  return (
    <>
      <CompletionCard
        testId="coach-completion"
        title="Complete Your Coach Profile"
        result={result}
        message={coachMessage(result)}
        footer={<VerificationStatus status={verificationStatus} />}
        completeText={<button type="button" className={btn.secondary} onClick={() => openAt("basic")}>Edit profile</button>}
        renderAction={(s, className, children) => (
          <button type="button" className={className} onClick={() => openAt(s.id as CoachSectionId)}>{children}</button>
        )}
      />
      <CoachProfileSheet open={open} section={section} onOpenChange={setOpen} />
    </>
  );
}

// ---------- helpers for the pages that save profile data ----------

/** Completion of the signed-in athlete right now, read straight from the stores. */
export function athleteCompletionNow() {
  return computeAthleteCompletion(profileStore.getSnapshot(), profileExtrasStore.getSnapshot());
}

/** Call after a successful save, passing the percent from before it, so the toast shows the gain. */
export function toastSaved(what: string, before: number) {
  const after = athleteCompletionNow().percent;
  toast.success(after > before ? `${what} · ${after}% complete (+${after - before}%)` : after === 100 ? `${what} · profile complete!` : what);
}
