import { toast } from "sonner";
import {
  BadgeCheck, Clock, Handshake, Inbox, MessageSquare,
  Send, ShieldX, Star, UserCheck, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { useCoachProfile, type CoachVerificationStatus } from "@/lib/coachProfileStore";
import { directoryAthletes } from "@/data/mock";
import type { DirectoryAthlete } from "@/types";
import { Card, Delta, EmptyState, Pill, ProgressBar, SectionLink, StatTile, btn } from "@/components/common";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "@/router-compat";
import { useCoachConnections, type CoachConnections } from "@/lib/useCoachConnections";
import { AthleteSearchCard, ConnectionRequestsCard, MyAthletesCard } from "@/components/coach-connections";
import { PersonAvatar } from "@/components/avatar";
import { CoachHeroCard } from "@/components/coach-hero-card";
import { CoachCompletionBanner } from "@/components/profile-completion-cards";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------------------------
   COACH DASHBOARD

   Live data: the coach's name, university, sport, position and verification badge come from the
   coach profile store. Roster, pending and sent-request counts, the incoming/outgoing request
   lists, My Athletes and athlete search come from the connections API (useCoachConnections).
   Sample data: the Recruitment Overview and Team Performance Snapshot cards, and the three
   non-connection rows of Pending Actions, are still placeholders and are tagged "Sample data".
--------------------------------------------------------------------------------------------- */

const comingSoon = (what: string) => toast(`${what} is coming soon`, { description: "This coach page hasn't been built yet." });

/* ---- sample data ---- */

/** Pending Actions rows that don't have a backend yet. The connection-request row is live. */
const pendingActions: { label: string; detail: string; count: number; icon: LucideIcon }[] = [
  { label: "Unanswered recruitment inquiries", detail: "Waiting for your reply", count: 3, icon: Inbox },
  { label: "Unread messages", detail: "From athletes and recruiters", count: 8, icon: MessageSquare },
  { label: "New athlete applications", detail: "Athletes showing interest in your program", count: 4, icon: UserPlus },
];

const shortlist = ["a-002", "a-003", "a-005"];
const conversations: { athleteId: string; last: string; time: string }[] = [
  { athleteId: "a-002", last: "Thanks coach, I'd love to visit the campus.", time: "1 hr ago" },
  { athleteId: "a-005", last: "Can you share the tryout schedule?", time: "Yesterday" },
];
const inquiryStatuses: { label: string; count: number; tone: "default" | "primary" | "gold" | "success" | "warning" }[] = [
  { label: "Awaiting response", count: 3, tone: "warning" },
  { label: "Replied", count: 2, tone: "primary" },
  { label: "Accepted", count: 1, tone: "success" },
  { label: "Declined", count: 1, tone: "default" },
];

const performance = {
  updated: 14,
  total: 24,
  skills: [
    { name: "Shooting", avg: 78, change: 4 },
    { name: "Dribbling", avg: 74, change: 2 },
    { name: "Passing", avg: 81, change: 3 },
    { name: "Agility", avg: 70, change: -1 },
  ],
};

/* ---- helpers ---- */

const fullName = (a: DirectoryAthlete) => `${a.firstName} ${a.lastName}`;
const byId = (id: string) => directoryAthletes.find((a) => a.id === id);

const verification: Record<CoachVerificationStatus, { label: string; tone: "success" | "warning" | "default"; icon: LucideIcon }> = {
  Verified: { label: "Verified", tone: "success", icon: BadgeCheck },
  Pending: { label: "Verification pending", tone: "warning", icon: Clock },
  Rejected: { label: "Verification rejected", tone: "default", icon: ShieldX },
};

function SampleTag() {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample data</span>;
}

/** "Sample data" tag followed by the standard section link. */
function SectionAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <span className="flex items-center gap-3">
      <SampleTag />
      <SectionLink label={label} onClick={onClick} />
    </span>
  );
}

/* ---- sections ---- */

const counts = (conn: CoachConnections) =>
  conn.state === "ready"
    ? { roster: conn.accepted.total, pending: conn.incoming.total, sent: conn.outgoing.total }
    : { roster: null, pending: null, sent: null };

function ProfileOverview({ conn }: { conn: CoachConnections }) {
  const { profile, verificationStatus } = useCoachProfile();
  const name = `${profile.firstName} ${profile.lastName}`.trim() || "Coach";
  const v = verification[verificationStatus];
  const c = counts(conn);
  const navigate = useNavigate();

  return (
    <CoachHeroCard
      coachName={name}
      coachingPosition={profile.positionTitle}
      assignedSport={profile.primarySport}
      schoolName={profile.organizationName}
      totalRosterCount={c.roster}
      pendingRequestsCount={c.pending}
      sentRequestsCount={c.sent}
      footerNote="Roster and request counts come from your connections and update as you respond."
      badge={
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white",
          verificationStatus === "Verified" ? "bg-success/20" : verificationStatus === "Pending" ? "bg-warning/25" : "bg-white/15",
        )}>
          <v.icon className="h-3.5 w-3.5" /> {v.label}
        </span>
      }
      onCreateTrainingPlan={() => navigate({ to: "/coach/training-plans/new" })}
    />
  );
}

function SummaryStats({ conn }: { conn: CoachConnections }) {
  const c = counts(conn);
  const show = (n: number | null) => (n === null ? "—" : String(n));
  return (
    <section aria-label="Team and request summary">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total Athletes" value={show(c.roster)} icon={<Users />} hint={<span className="text-muted-foreground">Connected to you</span>} />
        <StatTile label="Pending Requests" value={show(c.pending)} icon={<UserCheck />} hint={<span className="text-muted-foreground">Athlete requests to review</span>} />
        <StatTile label="Sent Requests" value={show(c.sent)} icon={<Send />} hint={<span className="text-muted-foreground">Waiting for an athlete to answer</span>} />
      </div>
    </section>
  );
}

function PendingActions({ conn }: { conn: CoachConnections }) {
  const live = conn.state === "ready" ? conn.incoming.total : null;
  const total = live ?? 0;
  const goToRequests = () => document.getElementById("connection-requests")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const row = "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const iconBox = "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground";
  const badge = "grid h-7 min-w-7 place-items-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground";

  return (
    <Card title="Pending Actions" action={total > 0 ? <Pill tone="warning">{total} need attention</Pill> : undefined}>
      <ul className="flex flex-col gap-2">
        <li>
          <button type="button" onClick={goToRequests} className={row}>
            <span className={iconBox}><UserCheck className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">New connection requests</span>
              <span className="block truncate text-xs text-muted-foreground">
                {conn.state === "error" ? "Couldn't load, open to retry" : "Athletes asking to connect with you"}
              </span>
            </span>
            <span className={badge}>{live === null ? "—" : live}</span>
          </button>
        </li>
        {pendingActions.map(({ label, detail, count, icon: Icon }) => (
          <li key={label}>
            <button type="button" onClick={() => comingSoon(label)} className={row}>
              <span className={iconBox}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{detail}</span>
              </span>
              <span className="flex items-center gap-2"><SampleTag /><span className={badge}>{count}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RecruitmentOverview() {
  const shortlisted = shortlist.map(byId).filter((a): a is DirectoryAthlete => !!a);
  const convos = conversations.map((c) => ({ ...c, athlete: byId(c.athleteId) })).filter((c) => c.athlete);
  const total = inquiryStatuses.reduce((n, s) => n + s.count, 0);
  const sub = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <Card title="Recruitment Overview" action={<SectionAction label="Open" onClick={() => comingSoon("Recruitment")} />}>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h3 className={cn(sub, "mb-2 flex items-center gap-1.5")}><Star className="h-3.5 w-3.5" /> Shortlisted athletes</h3>
          {shortlisted.length === 0 ? <EmptyState message="No shortlisted athletes yet." /> : (
            <ul className="flex flex-wrap gap-2">
              {shortlisted.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3">
                  <PersonAvatar name={fullName(a)} size="sm" className="ring-2 ring-accent" />
                  <span className="text-sm font-medium">{fullName(a)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className={cn(sub, "mb-2 flex items-center gap-1.5")}><MessageSquare className="h-3.5 w-3.5" /> Ongoing conversations</h3>
          {convos.length === 0 ? <EmptyState message="No ongoing conversations." /> : (
            <ul className="divide-y">
              {convos.map(({ athlete, last, time }) => (
                <li key={athlete!.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <PersonAvatar name={fullName(athlete!)} size="sm" className="ring-2 ring-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{fullName(athlete!)}</p>
                    <p className="truncate text-sm text-muted-foreground">{last}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className={cn(sub, "mb-2 flex items-center gap-1.5")}><Handshake className="h-3.5 w-3.5" /> Inquiry status ({total})</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {inquiryStatuses.map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card p-3">
                <p className="font-display text-2xl font-bold text-primary">{s.count}</p>
                <div className="mt-1"><Pill tone={s.tone}>{s.label}</Pill></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PerformanceSnapshot() {
  const pct = performance.total ? Math.round((performance.updated / performance.total) * 100) : 0;
  return (
    <Card title="Team Performance Snapshot" action={<SampleTag />}>
      {performance.updated === 0 ? (
        <EmptyState message="No performance records shared yet. Trends will appear once athletes share their records." />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm text-muted-foreground">Athletes with updated records</p>
              <p className="font-display text-xl font-bold text-primary">{performance.updated}<span className="text-sm font-medium text-muted-foreground"> / {performance.total}</span></p>
            </div>
            <ProgressBar value={pct} />
            <p className="mt-1.5 text-xs text-muted-foreground">{pct}% of your team has shared recent records.</p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent progress by skill</h3>
            <ul className="flex flex-col gap-3">
              {performance.skills.map((s) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{s.avg}% avg</span>
                      <Delta value={s.change} />
                    </span>
                  </div>
                  <ProgressBar value={s.avg} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---- page ---- */

function CoachDashboard() {
  const conn = useCoachConnections();
  const { user } = useAuth();
  // The API only lets a verified coach send or accept requests; the permission comes with the session.
  const canAct = !!user?.permissions.includes("sessions:verify");

  return (
    <div className="flex flex-col gap-6">
      <ProfileOverview conn={conn} />
      <CoachCompletionBanner />
      <SummaryStats conn={conn} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MyAthletesCard conn={conn} />
        <PendingActions conn={conn} />
      </div>
      <div id="connection-requests" className="grid scroll-mt-4 grid-cols-1 gap-6 lg:grid-cols-2">
        <ConnectionRequestsCard conn={conn} canAct={canAct} />
        <AthleteSearchCard conn={conn} canAct={canAct} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecruitmentOverview />
        <PerformanceSnapshot />
      </div>
    </div>
  );
}

export default function CoachDashboardPage() {
  return (
    <CoachLayout>
      <CoachDashboard />
    </CoachLayout>
  );
}
