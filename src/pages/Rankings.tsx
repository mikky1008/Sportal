import { Page } from "@/components/Page";
import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useRankingCandidates } from "@/lib/useRankings";
import {
  ALL,
  MIN_COUNTED_SESSIONS,
  SPORT_METRICS,
  SURIGAO_DEL_NORTE_MUNICIPALITIES,
  computeRankings,
  filterOptions,
} from "@/lib/rankings";
import { Card, PageHeader, Select } from "@/components/common";
import { RankingItem } from "@/components/listings";
import { cn } from "@/lib/utils";


const labelCls =
  "flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

type FilterMode = "municipality" | "school";
const MODES: { id: FilterMode; label: string }[] = [
  { id: "municipality", label: "Municipality" },
  { id: "school", label: "School" },
];

function Rankings() {
  const candidates = useRankingCandidates();
  const [sport, setSport] = useState("Basketball");
  const [metric, setMetric] = useState("");
  const [category, setCategory] = useState("Men's Collegiate");
  const [mode, setMode] = useState<FilterMode>("municipality");
  const [municipality, setMunicipality] = useState(ALL);
  const [school, setSchool] = useState(ALL);

  const sports = Object.keys(SPORT_METRICS);
  const metrics = SPORT_METRICS[sport] ?? [];
  const m = metrics.includes(metric) ? metric : (metrics[0] ?? "");

  // Only schools that have athletes in this sport are offered. A saved choice that stops being
  // valid (e.g. after switching sport) falls back to "All".
  const schools = useMemo(() => filterOptions(candidates, { sport }).schools, [candidates, sport]);
  const sch = schools.includes(school) ? school : ALL;
  const muni = (SURIGAO_DEL_NORTE_MUNICIPALITIES as readonly string[]).includes(municipality)
    ? municipality
    : ALL;

  // Only the active tab's filter is applied, so a hidden dropdown can never filter silently.
  const outcome = useMemo(
    () =>
      computeRankings(candidates, {
        sport,
        metric: m,
        ...(mode === "municipality" && muni !== ALL ? { municipality: muni } : {}),
        ...(mode === "school" && sch !== ALL ? { school: sch } : {}),
      }),
    [candidates, sport, m, mode, muni, sch],
  );
  const { rows, me, notEnoughSessions } = outcome;
  const unit = m.includes("(s)") ? "s" : m === "Overall Performance" ? "" : "%";
  const place =
    mode === "municipality"
      ? muni !== ALL
        ? muni
        : "all municipalities"
      : sch !== ALL
        ? sch
        : "all schools";
  const filtered = place !== "all municipalities" && place !== "all schools";

  const switchMode = (next: FilterMode) => {
    setMode(next);
    setMunicipality(ALL);
    setSchool(ALL);
  };

  const basics = [
    {
      label: "Sport",
      value: sport,
      set: (v: string) => {
        setSport(v);
        setMetric("");
      },
      opts: sports,
    },
    { label: "Skill / Metric", value: m, set: setMetric, opts: metrics },
    {
      label: "Category",
      value: category,
      set: setCategory,
      opts: ["Men's Collegiate", "Women's Collegiate", "Juniors"],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${sport} Rankings`}
        subtitle="Sport-specific ranking computed from recorded/assessed performance."
      />

      {/* One toolbar row. Never wraps: on narrow screens it scrolls sideways instead. */}
      <div
        className="-mx-1 overflow-x-auto px-1 pb-2 pt-1"
        role="group"
        aria-label="Ranking filters"
      >
        <div className="flex min-w-max flex-nowrap items-end gap-3 lg:min-w-0">
          {basics.map((f) => (
            <label key={f.label} className={cn(labelCls, "min-w-[9.5rem] flex-1")}>
              {f.label}
              <Select value={f.value} onChange={(e) => f.set(e.target.value)}>
                {f.opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </label>
          ))}

          {/* Switch + the one dropdown it controls, stacked as a single group inside the same row. */}
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
            <div
              role="tablist"
              aria-label="Filter rankings by"
              className="relative inline-grid h-6 w-max grid-cols-2 self-start rounded-full bg-muted p-0.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none",
                  mode === "school" && "translate-x-full",
                )}
              />
              {MODES.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={mode === t.id}
                  onClick={() => switchMode(t.id)}
                  className={cn(
                    "relative z-10 rounded-full px-3 text-xs font-semibold leading-5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mode === t.id
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {mode === "municipality" ? (
              <Select
                aria-label="Municipality"
                value={muni}
                onChange={(e) => setMunicipality(e.target.value)}
              >
                <option value={ALL}>All Municipalities</option>
                {SURIGAO_DEL_NORTE_MUNICIPALITIES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            ) : (
              <Select aria-label="School" value={sch} onChange={(e) => setSchool(e.target.value)}>
                <option value={ALL}>All Schools</option>
                {schools.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title={`${sport} ${m}`}>
          {rows.length ? (
            <ol className="flex flex-col gap-2">
              {rows.map((r) => (
                <RankingItem key={r.athleteId ?? r.position} r={r} unit={unit} />
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No ranked athletes for this metric in {place}.
            </p>
          )}
          {notEnoughSessions > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {notEnoughSessions} {notEnoughSessions === 1 ? "athlete isn't" : "athletes aren't"}{" "}
              shown yet — a ranking needs at least {MIN_COUNTED_SESSIONS} AI-assessed or
              coach-verified sessions for this metric.
            </p>
          )}
        </Card>
        <div className="flex flex-col gap-4">
          {me?.row ? (
            <div className="rounded-2xl bg-hero p-6 text-navy-foreground">
              <p className="text-sm text-navy-muted">
                Your position{filtered ? ` in ${place}` : ""}
              </p>
              <p className="font-display text-6xl font-bold">#{me.row.position}</p>
              <p className="mt-1 text-sm">
                of {me.total} ranked · {sport} {m}:{" "}
                <b>
                  {me.row.value}
                  {unit}
                </b>
              </p>
            </div>
          ) : me ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                You're not ranked yet for {m}: you have {me.counted} of the {MIN_COUNTED_SESSIONS}{" "}
                counted sessions needed. Self-reported and pending-review sessions don't count.
              </p>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-muted-foreground">
                You're not in this view
                {sport !== "Basketball"
                  ? `: rankings only compare athletes within the same sport, and your sport is not ${sport}`
                  : `: your school isn't in ${place}`}
                .
              </p>
            </Card>
          )}
          <Card>
            <div className="flex gap-3 text-sm text-muted-foreground">
              <Info className="h-5 w-5 shrink-0 text-primary" />
              Rankings never compare across sports. Positions are calculated from each athlete's
              AI-assessed and coach-verified sessions, within the filters you pick. AI-assessed does
              not automatically mean verified — the AI may make mistakes.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RankingsPage() {
  return (
    <Page title="Rankings">
      <Rankings />
    </Page>
  );
}
