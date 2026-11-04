import { Link } from "@/router-compat";
import { Page } from "@/components/Page";
import { Plus, Trophy, Gauge, Repeat, CalendarCheck } from "lucide-react";
import { skills } from "@/data/mock";
import { useAthleteProfile } from "@/lib/profileStore";
import { useHeadlineRanks } from "@/lib/useRankings";
import { useSessions } from "@/lib/sessionStore";
import { StatTile, Delta, btn } from "@/components/common";
import { PerformanceChart, SkillCard } from "@/components/performance";
import { AthleteCompletionCard } from "@/components/profile-completion-cards";
import juan from "@/assets/juan.jpg";
import court from "@/assets/court.jpg";


function Dashboard() {
  const a = useAthleteProfile();
  const sessions = useSessions();
  const myRank = useHeadlineRanks().get(a.id);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold sm:text-4xl">Good morning, {a.firstName}!</h1>
        <p className="text-muted-foreground">Keep pushing. Every practice gets you closer to your goals.</p>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-hero text-navy-foreground shadow-card">
        <img src={court} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" width={1600} height={640} />
        <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <img src={juan} alt={`${a.firstName} ${a.lastName}`} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-electric sm:h-24 sm:w-24" width={816} height={816} />
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{a.firstName} {a.lastName}</h2>
              <p className="text-navy-muted">{a.sport} • {a.position}</p>
              <p className="text-sm text-navy-muted">{a.school}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:ml-auto">
            {[
              { label: "Basketball Rank", value: myRank ? `#${myRank}` : "Unranked", icon: Trophy },
              { label: "Performance", value: a.performanceScore.toString(), icon: Gauge },
              { label: "Consistency", value: `${a.consistency}%`, icon: Repeat },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-navy-foreground/10 p-3 backdrop-blur sm:p-4">
                <Icon className="h-4 w-4 text-gold" />
                <p className="mt-1 font-display text-2xl font-bold sm:text-3xl">{value}</p>
                <p className="text-[11px] text-navy-muted sm:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex flex-col gap-3 border-t border-navy-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-navy-muted">Rankings are sport-specific — you're compared only with basketball players.</p>
          <Link to="/performance/new" className={btn.primary}><Plus className="h-4 w-4" />Start New Practice</Link>
        </div>
      </section>

      <AthleteCompletionCard />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Accuracy" value="82%" hint={<Delta value={12} />} />
        <StatTile label="Consistency" value="78%" hint={<Delta value={8} />} />
        <StatTile label="Improvement" value="+20%" hint={<span className="text-muted-foreground">last 5 sessions</span>} />
        <StatTile label="Sessions" value={String(sessions.length)} icon={<CalendarCheck className="h-4 w-4" />} hint={<span className="text-muted-foreground">this season</span>} />
      </div>

      <PerformanceChart />


      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Skills</h2>
          <Link to="/performance" className="text-sm font-semibold text-primary">View history</Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => <SkillCard key={s.id} skill={s} />)}
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Page title="Dashboard">
      <Dashboard />
    </Page>
  );
}
