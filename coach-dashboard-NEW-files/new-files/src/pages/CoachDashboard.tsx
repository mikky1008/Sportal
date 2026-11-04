import type { ReactNode } from "react";
import {
  Users, Activity, UserCheck, Handshake, UserPlus, UserCog, Compass, ClipboardCheck, MessageSquare,
  Trophy, MapPin, BadgeCheck, ArrowRight, type LucideIcon,
} from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { useCoachProfile } from "@/lib/coachProfileStore";
import { Card, Pill, btn } from "@/components/common";
import { cn } from "@/lib/utils";

/* PART 1 — UI ONLY. Every number and list below is a labeled placeholder; nothing here reads
   from or writes to the backend. Profile fields come from the local coach profile and fall back
   to placeholders when empty. */

const PLACEHOLDER = {
  university: "University not set",
  sport: "Sport not set",
  position: "Position not set",
};

const stats: { label: string; value: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { label: "Total Athletes", value: "24", hint: "On your roster", icon: Users, tone: "bg-primary/10 text-primary" },
  { label: "Active Athletes", value: "18", hint: "Trained in the last 14 days", icon: Activity, tone: "bg-success/15 text-success" },
  { label: "Pending Affiliation Requests", value: "5", hint: "Waiting for your review", icon: UserCheck, tone: "bg-warning/25 text-foreground" },
  { label: "Recruitment Inquiries", value: "7", hint: "Open conversations", icon: Handshake, tone: "bg-accent text-accent-foreground" },
];

const activity: { icon: LucideIcon; title: string; detail: string; time: string; tag: string; tone: "primary" | "warning" | "success" | "default" }[] = [
  { icon: UserCheck, title: "New affiliation request", detail: "Placeholder Athlete A wants to join your team", time: "10 min ago", tag: "Request", tone: "warning" },
  { icon: UserPlus, title: "Athlete joined", detail: "Placeholder Athlete B is now on your roster", time: "2 hrs ago", tag: "Joined", tone: "success" },
  { icon: UserCog, title: "Profile updated", detail: "Placeholder Athlete C added new achievements", time: "Yesterday", tag: "Update", tone: "primary" },
  { icon: Handshake, title: "New recruitment inquiry", detail: "Placeholder Recruiter D sent an inquiry", time: "Yesterday", tag: "Inquiry", tone: "default" },
  { icon: UserCheck, title: "New affiliation request", detail: "Placeholder Athlete E wants to join your team", time: "2 days ago", tag: "Request", tone: "warning" },
];

const athletes = [
  { name: "Athlete Name 1", position: "Point Guard", sport: "Basketball" },
  { name: "Athlete Name 2", position: "Shooting Guard", sport: "Basketball" },
  { name: "Athlete Name 3", position: "Center", sport: "Basketball" },
  { name: "Athlete Name 4", position: "Small Forward", sport: "Basketball" },
];

const quickActions: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: "Discover Athletes", hint: "Find new talent", icon: Compass },
  { label: "Review Requests", hint: "5 waiting", icon: ClipboardCheck },
  { label: "View All Athletes", hint: "Open your roster", icon: Users },
  { label: "Open Messages", hint: "3 unread", icon: MessageSquare },
];

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center bg-electric-gradient font-display font-bold text-primary-foreground", className)}>
      {initials(name) || "C"}
    </span>
  );
}

function Sample({ children = "Sample data" }: { children?: ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;
}

function CoachDashboard() {
  const { profile, verificationStatus } = useCoachProfile();
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const university = profile.organizationName || PLACEHOLDER.university;
  const sport = profile.primarySport || PLACEHOLDER.sport;
  const position = profile.positionTitle || PLACEHOLDER.position;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-hero text-navy-foreground shadow-card">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-8 md:flex-row md:items-center">
          <Avatar name={fullName || "Coach"} className="h-20 w-20 rounded-2xl text-3xl ring-2 ring-white/70 sm:h-24 sm:w-24 sm:text-4xl" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-muted">Coach Dashboard</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome back, Coach!</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold">
              {fullName || "Coach Name"}
              {verificationStatus === "Verified" && <BadgeCheck className="h-5 w-5 text-gold" aria-label="Verified" />}
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 md:ml-auto md:max-w-xl md:flex-1">
            {[
              { label: "University", value: university, icon: MapPin },
              { label: "Sport", value: sport, icon: Trophy },
              { label: "Position", value: position, icon: UserCog },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-navy-muted"><Icon className="h-3.5 w-3.5" />{label}</dt>
                <dd className="mt-1 truncate font-semibold" title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Statistics */}
      <section aria-label="Statistics">
        <div className="mb-2 flex items-center justify-end"><Sample>Placeholder values</Sample></div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, hint, icon: Icon, tone }) => (
            <div key={label} className="surface flex items-start gap-4 p-4 sm:p-5">
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tone)}><Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-3xl font-bold leading-none">{value}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent activity */}
        <Card title="Recent Activity" action={<Sample />} className="lg:col-span-3">
          <ul className="divide-y">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><a.icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.detail}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Pill tone={a.tone}>{a.tag}</Pill>
                  <span className="text-[11px] text-muted-foreground">{a.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Quick actions */}
        <Card title="Quick Actions" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {quickActions.map(({ label, hint, icon: Icon }, i) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === 0 ? "border-transparent bg-electric-gradient text-primary-foreground shadow-glow" : "bg-card hover:border-primary/40",
                )}
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", i === 0 ? "bg-white/20" : "bg-primary/10 text-primary")}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={cn("block text-xs", i === 0 ? "text-white/80" : "text-muted-foreground")}>{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* My athletes preview */}
      <Card
        title="My Athletes"
        action={
          <span className="flex items-center gap-3">
            <Sample />
            <button type="button" className="hidden items-center gap-1 text-sm font-semibold text-primary sm:inline-flex">View all<ArrowRight className="h-4 w-4" /></button>
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {athletes.map((a) => (
            <div key={a.name} className="flex flex-col items-center rounded-2xl border bg-card p-4 text-center transition hover:shadow-card">
              <Avatar name={a.name} className="h-16 w-16 rounded-full text-xl ring-4 ring-accent" />
              <p className="mt-3 font-semibold">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.position}</p>
              <div className="mt-2"><Pill tone="primary">{a.sport}</Pill></div>
              <button type="button" className={cn(btn.secondary, "mt-4 w-full !py-2")}>View Profile</button>
            </div>
          ))}
        </div>
      </Card>
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
