import { Link } from "@/router-compat";
import { Page } from "@/components/Page";
import { Plus, Trophy, Gauge, Repeat, CalendarCheck, Target, TrendingUp } from "lucide-react";
import { skills } from "@/data/mock";
import { useAthleteProfile } from "@/lib/profileStore";
import { useHeadlineRanks } from "@/lib/useRankings";
import { useSessions } from "@/lib/sessionStore";
import { PageHeader, SectionHeading, SectionLink, StatTile, Delta, btn } from "@/components/common";
import { PersonAvatar } from "@/components/avatar";
import { ProfileHero } from "@/components/profile-hero";
import { PerformanceChart, SkillCard } from "@/components/performance";
import { AthleteCompletionCard } from "@/components/profile-completion-cards";
import juan from "@/assets/juan.jpg";
import court from "@/assets/court.jpg";


function Dashboard() {
  const a = useAthleteProfile();
  const sessions = useSessions();
  const myRank = useHeadlineRanks().get(a.id);
  const fullName = `${a.firstName} ${a.lastName}`;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader className="mb-0" title={`Good morning, ${a.firstName}!`} subtitle="Keep pushing. Every practice gets you closer to your goals." />

      <ProfileHero
        ariaLabel="Athlete profile overview"
        avatar={<PersonAvatar name={fullName} src={juan} size="lg" shape="xl" tone="onDark" className="ring-2 ring-electric" />}
        name={fullName}
        meta={[`${a.sport} • ${a.position}`, a.school]}
        tiles={[
          { label: "Basketball Rank", value: myRank ? `#${myRank}` : "Unranked", icon: Trophy },
          { label: "Performance", value: a.performanceScore.toString(), icon: Gauge },
          { label: "Consistency", value: `${a.consistency}%`, icon: Repeat },
        ]}
        backdrop={<img src={court} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" width={1600} height={640} />}
        footer={
          <>
            <p className="text-sm text-navy-muted">Rankings are sport-specific — you're compared only with basketball players.</p>
            <Link to="/performance/new" className={btn.primary}><Plus className="h-4 w-4" />Start New Practice</Link>
          </>
        }
      />

      <AthleteCompletionCard />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Accuracy" value="82%" icon={<Target />} hint={<Delta value={12} />} />
        <StatTile label="Consistency" value="78%" icon={<Repeat />} hint={<Delta value={8} />} />
        <StatTile label="Improvement" value="+20%" icon={<TrendingUp />} hint={<span className="text-muted-foreground">last 5 sessions</span>} />
        <StatTile label="Sessions" value={String(sessions.length)} icon={<CalendarCheck />} hint={<span className="text-muted-foreground">this season</span>} />
      </div>

      <PerformanceChart />

      <section>
        <SectionHeading title="Your Skills" action={<SectionLink to="/performance" label="View history" />} />
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
