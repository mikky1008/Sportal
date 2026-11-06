import { useMemo, useState } from "react";
import { Eye, Search, UserRound } from "lucide-react";
import { CoachLayout } from "@/layouts/CoachLayout";
import { PersonAvatar } from "@/components/avatar";
import { AthleteDetailDialog } from "@/components/athlete-detail-dialog";
import { PageHeader, Pill, btn } from "@/components/common";
import { connectedAthletes, type ConnectedAthlete } from "@/data/coachAthletes";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------------------------
   COACH: MY ATHLETES
   Frontend only. The list comes from data/coachAthletes.ts (mock data). Search is by name, and
   "View Athlete Profile" opens a popup.
--------------------------------------------------------------------------------------------- */

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
            <Pill tone="primary">{athlete.sport}</Pill>
          </div>
          <p className="text-sm text-muted-foreground">{athlete.position}</p>
          <p className="truncate text-sm text-muted-foreground" title={athlete.school}>{athlete.school}</p>
        </div>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-muted px-4 py-2.5 text-sm">
        <div className="flex gap-1.5"><dt className="text-muted-foreground">Rank:</dt><dd className="font-semibold">#{String(athlete.rank).padStart(2, "0")}</dd></div>
        <div className="flex gap-1.5"><dt className="text-muted-foreground">Perf:</dt><dd className="font-semibold">{athlete.performance}%</dd></div>
        <div className="flex gap-1.5"><dt className="text-muted-foreground">Consistency:</dt><dd className="font-semibold">{athlete.consistency}%</dd></div>
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
      <button type="button" onClick={onReset} className={cn(btn.secondary, btn.sm, "mt-2")}>Clear Search</button>
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

/** The screen itself. `athletes` defaults to the mock list; pass [] to see the empty state. */
export function MyAthletes({ athletes = connectedAthletes }: { athletes?: ConnectedAthlete[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const term = query.trim().toLowerCase();
  const visible = useMemo(
    () => athletes.filter((a) => term === "" || fullName(a).toLowerCase().includes(term)),
    [athletes, term],
  );
  const selected = athletes.find((a) => a.id === selectedId) ?? null;
  const reset = () => setQuery("");
  const total = athletes.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Athletes"
        subtitle="Manage and monitor performance metrics for all connected athletes."
        action={<p className="text-sm font-medium text-muted-foreground" aria-live="polite">Total Connected: {total} {total === 1 ? "Athlete" : "Athletes"}</p>}
      />

      {total === 0 ? (
        <NoConnections />
      ) : (
        <>
          <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80}
                placeholder="Search athlete by name..." aria-label="Search athletes by name" className={field} />
            </div>
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
  return (
    <CoachLayout>
      <MyAthletes />
    </CoachLayout>
  );
}
