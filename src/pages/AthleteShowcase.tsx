import { useParams } from "react-router-dom";
import { Link } from "@/router-compat";
import { Page } from "@/components/Page";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, BookmarkCheck, Ruler, School, Send } from "lucide-react";
import { currentAthlete, currentRecruiter, directoryAthletes } from "@/data/mock";
import { useAthleteProfile, withProfile } from "@/lib/profileStore";
import { useHeadlineRanks } from "@/lib/useRankings";
import { isDiscoverable, recruitmentStore, useRecruitment } from "@/lib/recruitmentStore";
import { TRUST_NOTE } from "@/lib/verification";
import { Card, Pill, StatTile, btn } from "@/components/common";
import { AthleteAvatar, InquiryModal } from "@/components/recruiting";
import type { DirectoryAthlete } from "@/types";
import { cn } from "@/lib/utils";


function AthleteShowcase({ loaded }: { loaded: DirectoryAthlete }) {
  const profile = useAthleteProfile();
  const a = withProfile(loaded, profile);
  const rank = useHeadlineRanks().get(a.id);
  const state = useRecruitment();
  const [modal, setModal] = useState(false);
  const watched = state.watchlist.includes(a.id);
  const hidden = !isDiscoverable(a, state, currentAthlete.id);
  const existing = state.inquiries.find(
    (i) => i.athleteId === a.id && i.recruiterName === currentRecruiter.name && i.status !== "Declined",
  );

  const toggleWatch = () => {
    try {
      recruitmentStore.toggleWatchlist(a.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the watchlist.");
    }
  };

  const sendInquiry = (message: string, organization: string) => {
    try {
      recruitmentStore.sendInquiry({
        athleteId: a.id,
        recruiterName: currentRecruiter.name,
        organization,
        message,
      });
      setModal(false);
      toast.success("Inquiry sent", {
        description: `${a.firstName} will decide whether to accept — a conversation only opens after they do.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the inquiry.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to="/recruiting" search={{ tab: undefined, thread: undefined }} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to recruiting
      </Link>

      <section className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <AthleteAvatar name={`${a.firstName} ${a.lastName}`} className="h-24 w-24 text-3xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-3xl font-bold sm:text-4xl">{a.firstName} {a.lastName}</h1>
            <Pill tone={a.teamStatus === "Not on a team" ? "default" : "primary"}>{a.teamStatus === "Not on a team" || !a.teamName ? a.teamStatus : `${a.teamStatus} · ${a.teamName}`}</Pill>
          </div>
          <p className="text-muted-foreground">{a.sport} • {a.position} · {a.year}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><School className="h-4 w-4" />{a.school}</span>
            <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4" />{a.height}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={toggleWatch} aria-pressed={watched} className={btn.secondary}>
            {watched ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {watched ? "On watchlist" : "Save to watchlist"}
          </button>
          {hidden ? (
            <Pill tone="warning">Showcase hidden by the athlete — inquiries closed</Pill>
          ) : existing ? (
            existing.status === "Accepted" ? (
              <Link to="/recruiting" search={{ tab: "messages", thread: existing.id }} className={btn.secondary}>
                <Send className="h-4 w-4" /> Open conversation
              </Link>
            ) : (
              <Pill tone="warning">Inquiry pending — awaiting athlete approval</Pill>
            )
          ) : (
            <button onClick={() => setModal(true)} className={btn.primary}><Send className="h-4 w-4" /> Send inquiry</button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Performance" value={String(a.performanceScore)} />
        <StatTile label={`${a.sport} Rank`} value={rank ? `#${rank}` : "Unranked"} />
        <StatTile label="Coach-Verified" value={`${a.verifiedSessions}/${a.totalSessions}`} hint={<span className="text-muted-foreground">sessions</span>} />
        <StatTile label="Position" value={a.position} hint={<span className="text-muted-foreground">{a.sport}</span>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Athletic Bio"><p className="text-muted-foreground">{a.bio}</p></Card>
          <Card title="Skills">
            <ul className="grid gap-4 sm:grid-cols-2">
              {a.skills.map((s) => (
                <li key={s.name} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="font-display text-lg font-bold">{s.value}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="About these results">
            <p className="text-sm text-muted-foreground">{TRUST_NOTE}</p>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Achievements">
            <ul className="flex flex-col gap-3">
              {a.achievements.map((x) => (
                <li key={x.title} className="text-sm"><p className="font-semibold">{x.title}</p><p className="text-xs text-muted-foreground">{x.year}</p></li>
              ))}
            </ul>
          </Card>
          <div className="rounded-2xl bg-hero p-6 text-navy-foreground">
            <p className="font-display text-lg font-bold">Controlled messaging</p>
            <p className="mt-1 text-sm text-navy-muted">
              Your inquiry is a request, not a direct message. {a.firstName} reviews it first and only
              accepting opens a conversation.
            </p>
          </div>
        </div>
      </div>

      {a.id === currentAthlete.id && (
        <p className={cn("text-xs text-muted-foreground")}>
          This is your own showcase — recruiters find it exactly like this when "Visible to coaches &amp; universities" is on in Settings.
        </p>
      )}

      <InquiryModal athlete={a} open={modal} onClose={() => setModal(false)} onSend={sendInquiry} />
    </div>
  );
}

export default function AthleteShowcasePage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const athlete = directoryAthletes.find((a) => a.id === athleteId);
  return (
    <Page title="Athlete Showcase" backTo="/recruiting">
      {athlete ? (
        <AthleteShowcase key={athlete.id} loaded={athlete} />
      ) : (
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-2xl font-bold">Athlete not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This showcase doesn't exist or has been removed.</p>
          <Link to="/recruiting" direction="back" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to recruiting</Link>
        </div>
      )}
    </Page>
  );
}
