import type { ReactNode } from "react";
import type { DirectoryAthlete } from "@/types";
import { Pill } from "@/components/common";
import { PersonAvatar } from "@/components/avatar";

/**
 * Athlete profile card: avatar, name, position, school, sport. Wherever an athlete is listed
 * (coach dashboard today) the card looks the same; `actions` is where each role's buttons go.
 */
export function AthleteProfileCard({ athlete, actions }: { athlete: DirectoryAthlete; actions?: ReactNode }) {
  const name = `${athlete.firstName} ${athlete.lastName}`;
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card p-4 text-center transition hover:shadow-card">
      <PersonAvatar name={name} size="md" className="ring-4 ring-accent" />
      <p className="mt-3 font-semibold">{name}</p>
      <p className="text-sm text-muted-foreground">{athlete.position}</p>
      <p className="mt-0.5 max-w-full truncate text-xs text-muted-foreground" title={athlete.school}>{athlete.school}</p>
      <div className="mt-2"><Pill tone="primary">{athlete.sport}</Pill></div>
      {actions && <div className="mt-4 flex w-full flex-col gap-2">{actions}</div>}
    </div>
  );
}
