import { Link, useSearch } from "@/router-compat";
import { Page } from "@/components/Page";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Info, Search } from "lucide-react";
import { currentAthlete, currentRecruiter, directoryAthletes as seedDirectory } from "@/data/mock";
import { useAthleteProfile, withProfile } from "@/lib/profileStore";
import { isDiscoverable, recruitmentStore, useRecruitment } from "@/lib/recruitmentStore";
import { Card, PageHeader, Select, btn } from "@/components/common";
import { AthleteCard, InquiryModal, InquiryRow, ThreadView, WatchNote } from "@/components/recruiting";
import { CoachCompletionCard } from "@/components/profile-completion-cards";
import type { DirectoryAthlete } from "@/types";
import { cn } from "@/lib/utils";



const parseRecruitingSearch = (search: Record<string, unknown>) => ({
  tab: typeof search["tab"] === "string" ? search["tab"] : undefined,
  thread: typeof search["thread"] === "string" ? search["thread"] : undefined,
});

type SortKey = "score" | "verified" | "name";
const sortOptions: { id: SortKey; label: string }[] = [
  { id: "score", label: "Highest score" },
  { id: "verified", label: "Most coach-verified" },
  { id: "name", label: "Name (A–Z)" },
];
const verifiedShare = (a: DirectoryAthlete) => (a.totalSessions ? a.verifiedSessions / a.totalSessions : 0);

const tabs = {
  recruiter: [
    { id: "discover", label: "Discover" },
    { id: "watchlist", label: "Watchlist" },
    { id: "messages", label: "Messages" },
  ],
  athlete: [{ id: "inbox", label: "Inbox" }],
} as const;

function Recruiting() {
  const state = useRecruitment();
  const profile = useAthleteProfile();
  // the signed-in athlete's own entry reflects their saved profile edits
  const directoryAthletes = useMemo(() => seedDirectory.map((x) => withProfile(x, profile)), [profile]);
  const athleteById = (id: string) => directoryAthletes.find((x) => x.id === id);
  const search = useSearch(parseRecruitingSearch);
  const [view, setView] = useState<"recruiter" | "athlete">("recruiter");
  const [tab, setTab] = useState<"discover" | "watchlist" | "messages" | "inbox">("discover");
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("All sports");
  const [position, setPosition] = useState("All positions");
  const [school, setSchool] = useState("All schools");
  const [skill, setSkill] = useState("All skills");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [inquiryFor, setInquiryFor] = useState<DirectoryAthlete | null>(null);
  // undefined = follow the ?thread= deep link; null = explicitly closed
  const [threadPick, setThreadPick] = useState<string | null | undefined>(undefined);
  const openThreadId = threadPick === undefined ? (search.thread ?? null) : threadPick;

  const watched = (id: string) => state.watchlist.includes(id);
  const toggleWatch = (id: string) => recruitmentStore.toggleWatchlist(id);

  const sportOptions = useMemo(() => ["All sports", ...new Set(directoryAthletes.map((a) => a.sport))], []);
  const schoolOptions = useMemo(() => ["All schools", ...new Set(directoryAthletes.map((a) => a.school))], []);
  const positionOptions = useMemo(() => {
    const pool = sport === "All sports" ? directoryAthletes : directoryAthletes.filter((a) => a.sport === sport);
    return ["All positions", ...new Set(pool.map((a) => a.position))];
  }, [sport]);

  const skillOptions = useMemo(() => {
    const pool = directoryAthletes.filter((a) => sport === "All sports" || a.sport === sport);
    return ["All skills", ...new Set(pool.flatMap((a) => a.skills.map((s) => s.name)))];
  }, [sport]);

  const discovered = directoryAthletes
    .filter((a) => {
      if (!isDiscoverable(a, state, currentAthlete.id)) return false;
      if (sport !== "All sports" && a.sport !== sport) return false;
      if (position !== "All positions" && a.position !== position) return false;
      if (school !== "All schools" && a.school !== school) return false;
      if (skill !== "All skills" && !a.skills.some((s) => s.name === skill)) return false;
      if (verifiedOnly && a.verifiedSessions === 0) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [a.firstName, a.lastName, a.school, a.position, a.bio, ...a.skills.map((s) => s.name)]
        .some((x) => x.toLowerCase().includes(q));
    })
    .sort((x, y) =>
      sort === "score" ? y.performanceScore - x.performanceScore
        : sort === "verified" ? verifiedShare(y) - verifiedShare(x)
        : `${x.firstName} ${x.lastName}`.localeCompare(`${y.firstName} ${y.lastName}`),
    );
  const watchlisted = directoryAthletes.filter((a) => watched(a.id) && isDiscoverable(a, state, currentAthlete.id));

  const myInquiries = view === "recruiter"
    ? state.inquiries.filter((i) => i.recruiterName === currentRecruiter.name)
    : state.inquiries.filter((i) => i.athleteId === currentAthlete.id);
  const openInquiry = openThreadId ? myInquiries.find((i) => i.id === openThreadId) : undefined;

  const sendInquiry = (athlete: DirectoryAthlete, message: string, organization: string) => {
    try {
      recruitmentStore.sendInquiry({
        athleteId: athlete.id,
        recruiterName: currentRecruiter.name,
        organization,
        message,
      });
      setInquiryFor(null);
      toast.success("Inquiry sent", {
        description: `${athlete.firstName} will decide whether to accept — a conversation only opens after they do.`,
      });
      setTab("messages");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the inquiry.");
    }
  };

  const respond = (id: string, decision: "Accepted" | "Declined") => {
    try {
      recruitmentStore.respond(id, decision, {
        role: "athlete",
        name: `${currentAthlete.firstName} ${currentAthlete.lastName}`,
      });
      toast.success(decision === "Accepted" ? "Inquiry accepted — conversation unlocked" : "Inquiry declined");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the inquiry.");
    }
  };

  const saveNote = (id: string, note: string) => {
    try {
      recruitmentStore.setNote(id, note);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the note.");
    }
  };

  const sendReply = (inquiryId: string, from: "recruiter" | "athlete", body: string) => {
    try {
      recruitmentStore.sendMessage(inquiryId, from, body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the message.");
    }
  };

  const switchView = (r: "recruiter" | "athlete") => {
    setView(r);
    setTab(r === "recruiter" ? "discover" : "inbox");
    setThreadPick(undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recruiting"
        subtitle="Search athlete showcases, build a watchlist and send recruitment inquiries."
        action={
          <div className="flex rounded-xl border bg-card p-1" role="tablist" aria-label="Preview as">
            {(["recruiter", "athlete"] as const).map((r) => (
              <button
                key={r}
                onClick={() => switchView(r)}
                aria-pressed={view === r}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition", view === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {r === "recruiter" ? "Recruiter view" : "Athlete view"}
              </button>
            ))}
          </div>
        }
      />

      {view === "recruiter" && <CoachCompletionCard />}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs[view].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setThreadPick(undefined); }}
            aria-pressed={tab === t.id}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition",
              tab === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.id === "watchlist" && ` (${state.watchlist.length})`}
            {t.id === "messages" && ` (${myInquiries.length})`}
          </button>
        ))}
      </div>

      {view === "recruiter" && tab === "discover" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="relative flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2 lg:col-span-1">
              Search
              <span className="sr-only">Search athletes</span>
              <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, school, skill…"
                className="h-11 w-full rounded-xl border bg-card pl-9 pr-3 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            {[
              { label: "Sport", value: sport, set: (v: string) => { setSport(v); setPosition("All positions"); setSkill("All skills"); }, opts: sportOptions },
              { label: "Position", value: position, set: setPosition, opts: positionOptions },
              { label: "School", value: school, set: setSchool, opts: schoolOptions },
              { label: "Skill", value: skill, set: setSkill, opts: skillOptions },
            ].map((f) => (
              <label key={f.label} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {f.label}
                <Select value={f.value} onChange={(e) => f.set(e.target.value)}>
                  {f.opts.map((o) => <option key={o}>{o}</option>)}
                </Select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              Coach-verified results only
            </label>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground" aria-live="polite">{discovered.length} {discovered.length === 1 ? "athlete" : "athletes"}</span>
              <label className="flex items-center gap-2 font-medium">
                Sort
                <Select size="sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </Select>
              </label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {discovered.map((a) => (
              <AthleteCard key={a.id} a={a} watched={watched(a.id)} onToggleWatch={() => toggleWatch(a.id)} />
            ))}
          </div>
          {!discovered.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">No athletes match these filters yet.</p>
          )}
        </>
      )}

      {view === "recruiter" && tab === "watchlist" && (
        watchlisted.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {watchlisted.map((a) => (
              <AthleteCard
                key={a.id}
                a={a}
                watched
                onToggleWatch={() => toggleWatch(a.id)}
                footer={<WatchNote athleteId={a.id} value={state.notes?.[a.id] ?? ""} onSave={(n) => saveNote(a.id, n)} />}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No saved athletes yet — tap the bookmark on any showcase to add it here.
          </p>
        )
      )}

      {view === "recruiter" && tab === "messages" && (
        openInquiry ? (
          <ThreadView
            inquiry={openInquiry}
            title={`${athleteById(openInquiry.athleteId)?.firstName ?? "Athlete"} ${athleteById(openInquiry.athleteId)?.lastName ?? ""}`}
            subtitle={openInquiry.organization}
            side="recruiter"
            messages={state.messages.filter((m) => m.inquiryId === openInquiry.id)}
            onBack={() => setThreadPick(null)}
            onSend={(body) => sendReply(openInquiry.id, "recruiter", body)}
          />
        ) : myInquiries.length ? (
          <ul className="flex flex-col gap-2">
            {myInquiries.map((i) => {
              const a = athleteById(i.athleteId);
              return (
                <InquiryRow
                  key={i.id}
                  inquiry={i}
                  title={a ? `${a.firstName} ${a.lastName}` : "Athlete"}
                  subtitle={i.organization}
                  onClick={() => setThreadPick(i.id)}
                />
              );
            })}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No inquiries yet. Open an athlete showcase and send your first inquiry.
          </p>
        )
      )}

      {view === "athlete" && tab === "inbox" && (
        <>
          <Card>
            <div className="flex gap-3 text-sm text-muted-foreground">
              <Info className="h-5 w-5 shrink-0 text-primary" />
              <span>
                These are inquiries sent to your showcase, {currentAthlete.firstName}. You decide who
                can start a conversation — accepting unlocks messaging; declining closes it.
              </span>
            </div>
          </Card>
          {openInquiry ? (
            <ThreadView
              inquiry={openInquiry}
              title={openInquiry.recruiterName}
              subtitle={openInquiry.organization}
              side="athlete"
              messages={state.messages.filter((m) => m.inquiryId === openInquiry.id)}
              onBack={() => setThreadPick(null)}
              onSend={(body) => sendReply(openInquiry.id, "athlete", body)}
            />
          ) : myInquiries.length ? (
            <ul className="flex flex-col gap-2">
              {myInquiries.map((i) => (
                <InquiryRow
                  key={i.id}
                  inquiry={i}
                  title={i.recruiterName}
                  subtitle={i.organization}
                  onClick={() => setThreadPick(i.id)}
                  actions={
                    i.status === "Pending" ? (
                      <span className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        <button onClick={() => respond(i.id, "Accepted")} className={cn(btn.primary, "px-3 py-1.5 text-xs")}>Accept</button>
                        <button onClick={() => respond(i.id, "Declined")} className={cn(btn.secondary, "px-3 py-1.5 text-xs")}>Decline</button>
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No inquiries yet.</p>
          )}
        </>
      )}

      {inquiryFor && (
        <InquiryModal
          athlete={inquiryFor}
          open
          onClose={() => setInquiryFor(null)}
          onSend={(message, organization) => sendInquiry(inquiryFor, message, organization)}
        />
      )}
    </div>
  );
}

export default function RecruitingPage() {
  return (
    <Page title="Recruiting">
      <Recruiting />
    </Page>
  );
}
