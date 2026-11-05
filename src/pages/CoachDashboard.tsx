import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, Briefcase, Clock, GraduationCap, Handshake, Inbox, MessageSquare,
  Search, Send, ShieldX, Star, Trophy, UserCheck, UserPlus, Users, Activity, type LucideIcon,
} from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { useCoachProfile, type CoachVerificationStatus } from "@/lib/coachProfileStore";
import { directoryAthletes } from "@/data/mock";
import type { DirectoryAthlete } from "@/types";
import { Card, Delta, Pill, ProgressBar, btn } from "@/components/common";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------------------------
   COACH DASHBOARD (UI only)

   Real data: the coach's name, university, sport, position and verification status come from
   the existing coach profile store.
   Sample data: every number, list and athlete below is placeholder content (tagged "Sample data"
   on screen). Nothing here reads from or writes to a backend. Each section has an empty state.
   The profile has no photo field yet, so avatars show initials.
--------------------------------------------------------------------------------------------- */

const comingSoon = (what: string) => toast(`${what} is coming soon`, { description: "This coach page hasn't been built yet." });

/* ---- sample data ---- */

const stats: { label: string; value: number; hint: string; icon: LucideIcon }[] = [
  { label: "Total Athletes", value: 24, hint: "Under your team", icon: Users },
  { label: "Active Athletes", value: 18, hint: "Trained in the last 14 days", icon: Activity },
  { label: "Pending Requests", value: 5, hint: "Affiliation requests to review", icon: UserCheck },
  { label: "Active Recruitment", value: 7, hint: "Open recruitment inquiries", icon: Handshake },
];

const pendingActions: { label: string; detail: string; count: number; icon: LucideIcon }[] = [
  { label: "New affiliation requests", detail: "Athletes asking to join your team", count: 5, icon: UserCheck },
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

const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
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

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function Avatar({ athlete, size = "md" }: { athlete: DirectoryAthlete; size?: "sm" | "md" }) {
  return (
    <span aria-hidden="true" className={cn(
      "grid shrink-0 place-items-center rounded-full bg-electric-gradient font-display font-bold text-primary-foreground ring-4 ring-accent",
      size === "md" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm ring-2",
    )}>
      {initials(athlete.firstName, athlete.lastName)}
    </span>
  );
}

function SectionAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <span className="flex items-center gap-3">
      <SampleTag />
      <button type="button" onClick={onClick}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:text-[#2a8fc4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {label} <ArrowRight className="h-4 w-4" />
      </button>
    </span>
  );
}

function AthleteCard({ athlete, actions }: { athlete: DirectoryAthlete; actions: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card p-4 text-center transition hover:shadow-card">
      <Avatar athlete={athlete} />
      <p className="mt-3 font-semibold">{fullName(athlete)}</p>
      <p className="text-sm text-muted-foreground">{athlete.position}</p>
      <p className="mt-0.5 max-w-full truncate text-xs text-muted-foreground" title={athlete.school}>{athlete.school}</p>
      <div className="mt-2"><Pill tone="primary">{athlete.sport}</Pill></div>
      <div className="mt-4 flex w-full flex-col gap-2">{actions}</div>
    </div>
  );
}

/* ---- sections ---- */

function ProfileOverview() {
  const { profile, verificationStatus } = useCoachProfile();
  const name = `${profile.firstName} ${profile.lastName}`.trim() || "Coach";
  const v = verification[verificationStatus];
  const facts: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "University / school", value: profile.organizationName || "Not set", icon: GraduationCap },
    { label: "Assigned sport", value: profile.primarySport || "Not set", icon: Trophy },
    { label: "Coaching position", value: profile.positionTitle || "Not set", icon: Briefcase },
  ];
  const ini = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <section aria-label="Coach profile overview" className="relative overflow-hidden rounded-3xl bg-hero text-navy-foreground shadow-card">
      <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#55b8ed]/25 blur-3xl" />
      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span aria-hidden="true" className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#55b8ed] font-display text-3xl font-bold text-[#142b4a] ring-4 ring-white/20 sm:h-24 sm:w-24 sm:text-4xl">{ini}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#55b8ed]">Welcome back</p>
            <h1 className="truncate text-3xl font-bold sm:text-4xl">{name}</h1>
            <span className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              verificationStatus === "Verified" ? "bg-success/20 text-white" : verificationStatus === "Pending" ? "bg-warning/25 text-white" : "bg-white/15 text-white",
            )}>
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </span>
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3 lg:ml-auto lg:min-w-[34rem]">
          {facts.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-3.5 backdrop-blur">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-navy-muted">
                <Icon className="h-3.5 w-3.5 text-[#55b8ed]" /> {label}
              </dt>
              <dd className="mt-1 truncate font-semibold" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SummaryStats() {
  return (
    <section aria-label="Team and athlete summary">
      <div className="mb-2 flex justify-end"><SampleTag /></div>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="surface flex items-start gap-4 p-4 sm:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#55b8ed]/15 text-primary"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-3xl font-bold leading-none text-primary">{value}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MyAthletes({ sport }: { sport: string }) {
  const athletes = directoryAthletes.filter((a) => a.sport === sport).slice(0, 3);
  return (
    <Card title="My Athletes" className="lg:col-span-2" action={<SectionAction label="View All" onClick={() => comingSoon("My Athletes")} />}>
      {athletes.length === 0 ? (
        <EmptyState message="No athletes yet. Athletes affiliated with your university and sport will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {athletes.map((a) => (
            <AthleteCard key={a.id} athlete={a}
              actions={<button type="button" onClick={() => comingSoon("Athlete profiles for coaches")} className={cn(btn.secondary, "w-full !py-2")}>View Profile</button>} />
          ))}
        </div>
      )}
    </Card>
  );
}

function PendingActions() {
  const total = pendingActions.reduce((n, a) => n + a.count, 0);
  return (
    <Card title="Pending Actions" action={total > 0 ? <Pill tone="warning">{total} need attention</Pill> : undefined}>
      {total === 0 ? (
        <EmptyState message="You're all caught up. Nothing needs your attention." />
      ) : (
        <ul className="flex flex-col gap-2">
          {pendingActions.map(({ label, detail, count, icon: Icon }) => (
            <li key={label}>
              <button type="button" onClick={() => comingSoon(label)}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                </span>
                <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#142b4a] px-2 text-xs font-bold text-white">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AthleteDiscovery({ sport }: { sport: string }) {
  // Same sport, skipping the ones already shown under My Athletes.
  const athletes = directoryAthletes.filter((a) => a.sport === sport && a.visible).slice(3, 7);
  return (
    <Card title="Athlete Discovery" action={<SectionAction label="Browse all" onClick={() => comingSoon("Athlete Discovery")} />}>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">Recommended {sport} athletes you haven't contacted yet.</p>
      {athletes.length === 0 ? (
        <EmptyState message={`No recommended ${sport} athletes right now. Check back soon.`} />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {athletes.map((a) => (
            <AthleteCard key={a.id} athlete={a}
              actions={
                <>
                  <button type="button" onClick={() => comingSoon("Athlete profiles for coaches")} className={cn(btn.secondary, "w-full !py-2")}>View Profile</button>
                  <button type="button" onClick={() => comingSoon("Recruitment inquiries")} className={cn(btn.primary, "w-full !py-2")}><Send className="h-4 w-4" /> Send Inquiry</button>
                </>
              } />
          ))}
        </div>
      )}
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
      <div className="grid gap-6">
        <div>
          <h3 className={cn(sub, "mb-2 flex items-center gap-1.5")}><Star className="h-3.5 w-3.5" /> Shortlisted athletes</h3>
          {shortlisted.length === 0 ? <EmptyState message="No shortlisted athletes yet." /> : (
            <ul className="flex flex-wrap gap-2">
              {shortlisted.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3">
                  <Avatar athlete={a} size="sm" />
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
                  <Avatar athlete={athlete!} size="sm" />
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
        <div className="grid gap-6">
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
  const { profile } = useCoachProfile();
  // Sample athletes are matched to the coach's sport; fall back to Basketball until a sport is set.
  const sport = profile.primarySport || "Basketball";

  return (
    <div className="flex flex-col gap-6">
      <ProfileOverview />
      <SummaryStats />
      <div className="grid gap-6 lg:grid-cols-3">
        <MyAthletes sport={sport} />
        <PendingActions />
      </div>
      <AthleteDiscovery sport={sport} />
      <div className="grid gap-6 lg:grid-cols-2">
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
