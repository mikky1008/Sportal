import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, RefreshCw, Search, TriangleAlert, UserPlus, X } from "lucide-react";
import { Card, EmptyState, Pill, btn } from "@/components/common";
import { AthleteProfileCard } from "@/components/athlete-card";
import { PersonAvatar } from "@/components/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { searchAthletes, type AthleteSearchResult, type ConnectionView } from "@/lib/connectionsApi";
import type { CoachConnections } from "@/lib/useCoachConnections";
import { cn } from "@/lib/utils";

/* Coach-side connection sections. All data comes from useCoachConnections (the connections API);
   nothing here is sample data. Built from the app's existing Card, Pill, btn, EmptyState,
   PersonAvatar and AthleteProfileCard. */

const sub = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const field = "h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring";

const nameOf = (c: ConnectionView["counterpart"]) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || c.displayName;
const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
}

function RowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center">
      <TriangleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className={cn(btn.secondary, btn.sm)}><RefreshCw className="h-4 w-4" /> Try again</button>
    </div>
  );
}

/** One person in a list: avatar, name, small caption, and the buttons for that row. */
function PersonRow({ name, caption, actions }: { name: string; caption: string; actions?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <PersonAvatar name={name} size="sm" className="ring-2 ring-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{caption}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </li>
  );
}

/* ---- Connection requests (incoming + outgoing) ---- */

export function ConnectionRequestsCard({ conn, canAct }: { conn: CoachConnections; canAct: boolean }) {
  const { state, error, incoming, outgoing, busy, respond, reload } = conn;
  const inTotal = incoming.total;

  return (
    <Card
      title="Connection Requests"
      action={state === "ready" && inTotal > 0 ? <Pill tone="warning">{inTotal} to review</Pill> : undefined}
    >
      {!canAct && (
        <p className="mb-4 rounded-2xl bg-warning/20 px-4 py-3 text-sm text-foreground">
          Your coach account isn't verified yet, so you can't send or accept requests until it is.
        </p>
      )}
      {state === "loading" ? (
        <RowsSkeleton rows={3} />
      ) : state === "error" ? (
        <ErrorState message={error ?? "We couldn't load your requests."} onRetry={reload} />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className={cn(sub, "mb-2")}>Incoming ({incoming.total})</h3>
            {incoming.items.length === 0 ? (
              <EmptyState message="No incoming requests. Athletes who ask to connect with you will appear here." />
            ) : (
              <ul className="divide-y">
                {incoming.items.map((c) => {
                  const working = busy.has(c.id);
                  return (
                    <PersonRow key={c.id} name={nameOf(c.counterpart)} caption={`Requested ${ago(c.requestedAt)}`}
                      actions={
                        <>
                          <button type="button" disabled={working} onClick={() => void respond(c, "decline")}
                            aria-label={`Decline request from ${nameOf(c.counterpart)}`} className={cn(btn.secondary, btn.sm)}>
                            <X className="h-4 w-4" /> Decline
                          </button>
                          <button type="button" disabled={working} onClick={() => void respond(c, "accept")}
                            aria-label={`Accept request from ${nameOf(c.counterpart)}`} className={cn(btn.primary, btn.sm)}>
                            {working ? <Spinner /> : <Check className="h-4 w-4" />} Accept
                          </button>
                        </>
                      } />
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className={cn(sub, "mb-2")}>Outgoing ({outgoing.total})</h3>
            {outgoing.items.length === 0 ? (
              <EmptyState message="No outgoing requests. Use Find Athletes to send one." />
            ) : (
              <ul className="divide-y">
                {outgoing.items.map((c) => {
                  const working = busy.has(c.id);
                  return (
                    <PersonRow key={c.id} name={nameOf(c.counterpart)} caption={`Sent ${ago(c.requestedAt)} · Awaiting response`}
                      actions={
                        <button type="button" disabled={working} onClick={() => void respond(c, "cancel")}
                          aria-label={`Cancel request to ${nameOf(c.counterpart)}`} className={cn(btn.secondary, btn.sm)}>
                          {working ? <Spinner /> : <X className="h-4 w-4" />} Cancel Request
                        </button>
                      } />
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---- My Athletes (accepted connections) ---- */

const FIRST_PAGE = 6;

export function MyAthletesCard({ conn }: { conn: CoachConnections }) {
  const { state, error, accepted, reload } = conn;
  const [all, setAll] = useState(false);
  const shown = all ? accepted.items : accepted.items.slice(0, FIRST_PAGE);
  const more = accepted.items.length > FIRST_PAGE;

  return (
    <Card
      title="My Athletes"
      className="lg:col-span-2"
      action={more ? (
        <button type="button" onClick={() => setAll((v) => !v)}
          className="rounded text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {all ? "Show fewer" : `View all (${accepted.total})`}
        </button>
      ) : undefined}
    >
      {state === "loading" ? (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3" role="status" aria-label="Loading">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : state === "error" ? (
        <ErrorState message={error ?? "We couldn't load your athletes."} onRetry={reload} />
      ) : accepted.items.length === 0 ? (
        <EmptyState message="No athletes yet. Athletes appear here once they accept your request, or once you accept theirs." />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {shown.map((c) => (
            <AthleteProfileCard key={c.id}
              athlete={{ firstName: c.counterpart.firstName ?? c.counterpart.displayName, lastName: c.counterpart.firstName ? (c.counterpart.lastName ?? "") : "" }}
              actions={<Pill tone="success">Connected {c.respondedAt ? ago(c.respondedAt) : ""}</Pill>} />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---- Athlete search + Connect ---- */

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; items: AthleteSearchResult[] }
  | { kind: "error"; message: string; unavailable: boolean };

const MIN_QUERY = 2;

export function AthleteSearchCard({ conn, canAct }: { conn: CoachConnections; canAct: boolean }) {
  const { incoming, outgoing, accepted, busy, connect, respond } = conn;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [retry, setRetry] = useState(0);
  const term = query.trim();
  const seq = useRef(0);

  useEffect(() => {
    const mine = ++seq.current;
    if (term.length < MIN_QUERY) {
      setSearch({ kind: "idle" });
      return;
    }
    setSearch({ kind: "loading" });
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const res = await searchAthletes(term, ctrl.signal);
      if (mine !== seq.current) return; // the text changed while this was running
      setSearch(res.ok
        ? { kind: "results", items: res.data.items }
        : { kind: "error", message: res.message, unavailable: res.code === "search_unavailable" });
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, retry]);

  // Where each person stands with this coach right now, read from the loaded lists so a result
  // flips from "Connect" to "Request sent" / "Connected" as soon as the lists reload.
  const relation = useMemo(() => {
    const m = new Map<string, { kind: "connected" | "sent" | "received"; connection: ConnectionView }>();
    for (const c of accepted.items) m.set(c.counterpart.id, { kind: "connected", connection: c });
    for (const c of outgoing.items) m.set(c.counterpart.id, { kind: "sent", connection: c });
    for (const c of incoming.items) m.set(c.counterpart.id, { kind: "received", connection: c });
    return m;
  }, [accepted.items, outgoing.items, incoming.items]);

  const rowActions = (a: AthleteSearchResult): ReactNode => {
    const rel = relation.get(a.id);
    if (rel?.kind === "connected") return <Pill tone="success">Connected</Pill>;
    if (rel?.kind === "sent")
      return (
        <>
          <Pill tone="primary">Request sent</Pill>
          <button type="button" disabled={busy.has(rel.connection.id)} onClick={() => void respond(rel.connection, "cancel")} className={cn(btn.secondary, btn.sm)}>
            Cancel
          </button>
        </>
      );
    if (rel?.kind === "received")
      return (
        <button type="button" disabled={busy.has(rel.connection.id)} onClick={() => void respond(rel.connection, "accept")} className={cn(btn.primary, btn.sm)}>
          <Check className="h-4 w-4" /> Accept request
        </button>
      );
    const working = busy.has(`user:${a.id}`);
    return (
      <button type="button" disabled={working || !canAct} onClick={() => void connect(a.id)}
        aria-label={`Connect with ${a.displayName}`} className={cn(btn.primary, btn.sm)}>
        {working ? <Spinner /> : <UserPlus className="h-4 w-4" />} Connect
      </button>
    );
  };

  return (
    <Card title="Find Athletes">
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">Search student-athletes by name and send a connection request.</p>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={field}
          placeholder="Search athletes by name" aria-label="Search athletes by name" maxLength={80} />
      </div>

      {search.kind === "idle" ? (
        <EmptyState message={term.length === 0 ? "Type at least 2 letters to find athletes." : "Keep typing, at least 2 letters are needed."} />
      ) : search.kind === "loading" ? (
        <RowsSkeleton rows={3} />
      ) : search.kind === "error" ? (
        search.unavailable ? (
          <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center">
            <TriangleAlert className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{search.message}</p>
          </div>
        ) : (
          <ErrorState message={search.message} onRetry={() => setRetry((n) => n + 1)} />
        )
      ) : search.items.length === 0 ? (
        <EmptyState message={`No athletes found for "${term}".`} />
      ) : (
        <ul className="divide-y" aria-label="Search results">
          {search.items.map((a) => (
            <PersonRow key={a.id} name={a.displayName} caption="Student-Athlete" actions={rowActions(a)} />
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">{search.kind === "results" ? `${search.items.length} athletes found` : ""}</p>
    </Card>
  );
}
