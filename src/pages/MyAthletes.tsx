import { useMemo, useState } from "react";
import { Eye, RefreshCw, Search, TriangleAlert, UserRound } from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { PersonAvatar } from "@/components/avatar";
import { AthleteDetailDialog } from "@/components/athlete-detail-dialog";
import { PageHeader, Pill, Select, btn } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAthletes, type ConnectedAthlete, type LoadState } from "@/lib/coachApi";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------------------------
   COACH: MY ATHLETES
   The list comes from GET /api/coach/athletes (connected athletes only). Search is by name, the
   sport filter is built from the sports in the list, and "View Athlete Profile" opens a popup.
--------------------------------------------------------------------------------------------- */

const ALL_SPORTS = "all";
const field = "h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const fullName = (a: ConnectedAthlete) => `${a.firstName} ${a.lastName}`;

function AthleteCard({ athlete, onView }: { athlete: ConnectedAthlete; onView: () => void }) {
  const name = fullName(athlete);
  return (
    <li className="surface flex flex-col p-5">
      <div className="flex items-start gap-4">
        <PersonAvatar name={name} {...(athlete.photo ? { src: athlete.photo } : {})} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold">{name}</h2>
            {athlete.sport && <Pill tone="primary">{athlete.sport}</Pill>}
          </div>
          {athlete.position && <p className="text-sm text-muted-foreground">{athlete.position}</p>}
          {athlete.school && <p className="truncate text-sm text-muted-foreground" title={athlete.school}>{athlete.school}</p>}
        </div>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-muted px-4 py-2.5 text-sm">
        <div className="flex gap-1.5"><dt className="text-muted-foreground">Rank:</dt><dd className="font-semibold">{athlete.rank === null ? "—" : `#${String(athlete.rank).padStart(2, "0")}`}</dd></div>
        <div className="flex gap-1.5"><dt className="text-muted-foreground">Perf:</dt><dd className="font-semibold">{athlete.performance === null ? "—" : `${athlete.performance}%`}</dd></div>
        <div className="flex gap-1.5"><dt className="text-muted-foreground">Consistency:</dt><dd className="font-semibold">{athlete.consistency === null ? "—" : `${athlete.consistency}%`}</dd></div>
      </dl>

      <button type="button" onClick={onView} aria-label={`View ${name}'s profile`} className={cn(btn.secondary, btn.sm, btn.block, "mt-4")}>
        <Eye className="h-4 w-4" /> View Athlete Profile
      </button>
    </li>
  );
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div role="status" className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><UserRound className="h-6 w-6" aria-hidden="true" /></span>
      <h2 className="text-lg font-bold">No Connected Athletes Found</h2>
      <p className="max-w-md text-sm text-muted-foreground">We couldn't find any connected athletes matching your current search criteria.</p>
      <button type="button" onClick={onReset} className={cn(btn.secondary, btn.sm, "mt-2")}>Reset Filters</button>
    </div>
  );
}

function NoConnections() {
  return (
    <div role="status" className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><UserRound className="h-6 w-6" aria-hidden="true" /></span>
      <h2 className="text-lg font-bold">No connected athletes yet</h2>
      <p className="max-w-md text-sm text-muted-foreground">Athletes appear here once they accept your connection request, or once you accept theirs.</p>
    </div>
  );
}

function LoadingList() {
  return (
    <ul role="status" aria-label="Loading athletes" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1].map((i) => <li key={i} className="surface p-5"><Skeleton className="h-24 w-full rounded-xl" /></li>)}
    </ul>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="surface flex flex-col items-center gap-3 px-6 py-10 text-center">
      <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className={cn(btn.secondary, btn.sm)}><RefreshCw className="h-4 w-4" /> Try again</button>
    </div>
  );
}

/** The screen itself. Pass the athletes plus the load state; the page below fetches them. */
export function MyAthletes({ athletes, state = "ready", error, onRetry }: {
  athletes: ConnectedAthlete[]; state?: LoadState; error?: string | null; onRetry?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState(ALL_SPORTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sportOptions = useMemo(() => [...new Set(athletes.map((a) => a.sport).filter(Boolean))].sort(), [athletes]);
  const term = query.trim().toLowerCase();
  const visible = useMemo(
    () => athletes.filter((a) => (sport === ALL_SPORTS || a.sport === sport) && (term === "" || fullName(a).toLowerCase().includes(term))),
    [athletes, sport, term],
  );
  const selected = athletes.find((a) => a.id === selectedId) ?? null;
  const reset = () => { setQuery(""); setSport(ALL_SPORTS); };
  const total = athletes.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Athletes"
        subtitle="Manage and monitor performance metrics for all connected athletes."
        action={state === "ready" ? <p className="text-sm font-medium text-muted-foreground" aria-live="polite">Total Connected: {total} {total === 1 ? "Athlete" : "Athletes"}</p> : undefined}
      />

      {state === "loading" ? (
        <LoadingList />
      ) : state === "error" ? (
        <LoadError message={error ?? "Couldn't load your athletes."} onRetry={onRetry ?? (() => {})} />
      ) : total === 0 ? (
        <NoConnections />
      ) : (
        <>
          <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80}
                placeholder="Search athlete by name..." aria-label="Search athletes by name" className={field} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <span className="whitespace-nowrap">Filter by Sport:</span>
              <Select value={sport} onChange={(e) => setSport(e.target.value)} aria-label="Filter by sport" wrapperClassName="min-w-40">
                <option value={ALL_SPORTS}>All Sports</option>
                {sportOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </label>
          </div>

          {visible.length === 0 ? (
            <NoResults onReset={reset} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Connected athletes">
              {visible.map((a) => <AthleteCard key={a.id} athlete={a} onView={() => setSelectedId(a.id)} />)}
            </ul>
          )}
        </>
      )}

      <AthleteDetailDialog athlete={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

export default function MyAthletesPage() {
  const { athletes, state, error, reload } = useMyAthletes();
  return (
    <CoachLayout>
      <MyAthletes athletes={athletes} state={state} error={error} onRetry={reload} />
    </CoachLayout>
  );
}
