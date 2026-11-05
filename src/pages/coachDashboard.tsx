import { toast } from "sonner";
import { Activity, ArrowRight, GraduationCap, Handshake, Trophy, UserCheck, UserPlus, Users, type LucideIcon } from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { useCoachProfile } from "@/lib/coachProfileStore";
import { directoryAthletes } from "@/data/mock";
import { Card, Pill, btn } from "@/components/common";
import { cn } from "@/lib/utils";

/* UI ONLY. The numbers, activity and athlete cards below are labeled sample data: nothing here
   reads from or writes to a backend. The coach's name, university and sport come from the local
   coach profile and fall back to "not set" when empty. */

const stats: { label: string; value: number; hint: string; icon: LucideIcon }[] = [
  { label: "Total Athletes", value: 24, hint: "On your roster", icon: Users },
  { label: "Active Athletes", value: 18, hint: "Trained in the last 14 days", icon: Activity },
  { label: "Pending Requests", value: 5, hint: "Waiting for your review", icon: UserCheck },
  { label: "Active Recruitment", value: 7, hint: "Open conversations", icon: Handshake },
];

const activity: { icon: LucideIcon; title: string; detail: string; time: string }[] = [
  { icon: UserCheck, title: "New affiliation request", detail: "A student-athlete asked to join your team", time: "10 min ago" },
  { icon: UserPlus, title: "Athlete joined your roster", detail: "Kevin Ramos accepted your invitation", time: "2 hrs ago" },
  { icon: Handshake, title: "Recruitment inquiry sent", detail: "You contacted Marco Villanueva", time: "Yesterday" },
  { icon: Activity, title: "Training session verified", detail: "You verified a session for Paolo Santos", time: "2 days ago" },
];

// A few existing sample athletes, reused so the cards look like real profiles.
const sampleAthletes = directoryAthletes.slice(0, 4);

const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

function SampleTag() {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sample data</span>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">{message}</p>;
}

function CoachDashboard() {
  const { profile } = useCoachProfile();
  const name = `${profile.firstName} ${profile.lastName}`.trim() || "Coach";
  const university = profile.organizationName || "University not set";
  const sport = profile.primarySport || "Sport not set";

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome header */}
      <section className="relative overflow-hidden rounded-3xl bg-hero text-navy-foreground shadow-card">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#55b8ed]/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#55b8ed]">Welcome back</p>
            <h1 className="mt-1 truncate text-3xl font-bold sm:text-4xl">{name}</h1>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 md:min-w-[26rem]">
            {[
              { label: "University", value: university, icon: GraduationCap },
              { label: "Assigned sport", value: sport, icon: Trophy },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-3.5 backdrop-blur">
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-navy-muted">
                  <Icon className="h-3.5 w-3.5 text-[#55b8ed]" />
                  {label}
                </dt>
                <dd className="mt-1 truncate font-semibold" title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Statistics */}
      <section aria-label="Statistics">
        <div className="mb-2 flex justify-end"><SampleTag /></div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, hint, icon: Icon }) => (
            <div key={label} className="surface flex items-start gap-4 p-4 sm:p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#55b8ed]/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-3xl font-bold leading-none text-primary">{value}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <Card title="Recent Activity" action={<SampleTag />}>
        {activity.length === 0 ? (
          <EmptyState message="No recent activity yet. Requests, new athletes and recruitment updates will show up here." />
        ) : (
          <ul className="divide-y">
            {activity.map((a) => (
              <li key={a.title + a.time} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <a.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* My athletes */}
      <Card
        title="My Athletes"
        action={
          <span className="flex items-center gap-3">
            <SampleTag />
            <button
              type="button"
              onClick={() => toast("My Athletes is coming soon", { description: "This coach page hasn't been built yet." })}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:text-[#2a8fc4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </span>
        }
      >
        {sampleAthletes.length === 0 ? (
          <EmptyState message="No athletes on your roster yet. Athletes you affiliate with will appear here." />
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {sampleAthletes.map((a) => (
              <div key={a.id} className={cn("flex flex-col items-center rounded-2xl border bg-card p-4 text-center transition hover:shadow-card")}>
                <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-electric-gradient font-display text-xl font-bold text-primary-foreground ring-4 ring-accent">
                  {initials(a.firstName, a.lastName)}
                </span>
                <p className="mt-3 font-semibold">{a.firstName} {a.lastName}</p>
                <p className="text-sm text-muted-foreground">{a.position}</p>
                <div className="mt-2"><Pill tone="primary">{a.sport}</Pill></div>
                <button
                  type="button"
                  onClick={() => toast("Athlete profiles for coaches are coming soon")}
                  className={cn(btn.secondary, "mt-4 w-full !py-2")}
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
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
