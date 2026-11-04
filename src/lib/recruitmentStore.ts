// Recruitment & talent-discovery state with persistence.
//
// PROTOTYPE LIMIT: this lives in the browser's localStorage, so anyone can edit it in devtools.
// The controlled-messaging rule below (an athlete must accept an inquiry before anyone can
// exchange messages) is enforced here in code, but it can only be *trusted* once the same check
// runs on the server. Swap this module's storage for an API and keep the same function names.

import { useSyncExternalStore } from "react";
import { currentAthlete, directoryAthletes, recruitmentSeed } from "@/data/mock";
import type { DirectoryAthlete, Inquiry, InquiryStatus, ThreadMessage, UserRole } from "@/types";

const KEY = "sportal.recruitment.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface Actor {
  role: UserRole;
  name: string;
}

export interface RecruitmentState {
  watchlist: string[];
  inquiries: Inquiry[];
  messages: ThreadMessage[];
  /** private recruiter notes keyed by athlete id; only exist for watchlisted athletes */
  notes?: Record<string, string>;
  /** whether the signed-in athlete's showcase can be discovered. Missing means visible. */
  showcaseVisible?: boolean;
}

export const MAX_NOTE_LENGTH = 500;

/** An athlete is discoverable unless their own visibility switch (or the directory flag) hides them. */
export function isDiscoverable(
  athlete: Pick<DirectoryAthlete, "id" | "visible">,
  state: RecruitmentState,
  ownAthleteId?: string,
): boolean {
  if (!athlete.visible) return false;
  if (athlete.id === ownAthleteId && state.showcaseVisible === false) return false;
  return true;
}

export interface NewInquiry {
  athleteId: string;
  recruiterName: string;
  organization: string;
  message: string;
}

function isState(x: unknown): x is RecruitmentState {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  const inquiries = s["inquiries"];
  return (
    Array.isArray(s["watchlist"]) &&
    Array.isArray(s["messages"]) &&
    (s["notes"] === undefined || (!!s["notes"] && typeof s["notes"] === "object" && !Array.isArray(s["notes"]))) &&
    (s["showcaseVisible"] === undefined || typeof s["showcaseVisible"] === "boolean") &&
    Array.isArray(inquiries) &&
    inquiries.every((i) => {
      const q = i as Inquiry;
      return (
        !!q && typeof q === "object" &&
        typeof q.id === "string" &&
        typeof q.athleteId === "string" &&
        typeof q.recruiterName === "string" &&
        typeof q.status === "string" &&
        ["Pending", "Accepted", "Declined"].includes(q.status)
      );
    })
  );
}

function timeLabel(now: () => Date) {
  return now().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function createRecruitmentStore(
  storage: StorageLike | null,
  seed: RecruitmentState,
  athletes: DirectoryAthlete[],
  now: () => Date = () => new Date(),
  /** the signed-in athlete, whose visibility switch the store honours */
  ownAthleteId?: string,
) {
  let cache: RecruitmentState | null = null;
  const listeners = new Set<() => void>();
  const athleteIds = new Set(athletes.map((a) => a.id));

  function load(): RecruitmentState {
    if (!storage) return seed;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return seed;
      const parsed: unknown = JSON.parse(raw);
      if (!isState(parsed)) return seed;
      return parsed;
    } catch {
      return seed;
    }
  }

  function commit(next: RecruitmentState) {
    cache = next;
    try {
      storage?.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage full or blocked: keep working in memory
    }
    listeners.forEach((l) => l());
  }

  function getSnapshot() {
    if (cache === null) cache = load();
    return cache;
  }

  return {
    getSnapshot,
    getServerSnapshot: () => seed,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    /** Save or unsave an athlete to the recruiter's watchlist. */
    toggleWatchlist(athleteId: string) {
      if (!athleteIds.has(athleteId)) throw new Error(`Unknown athlete: ${athleteId}`);
      const cur = getSnapshot();
      const removing = cur.watchlist.includes(athleteId);
      const watchlist = removing ? cur.watchlist.filter((x) => x !== athleteId) : [...cur.watchlist, athleteId];
      const notes = { ...(cur.notes ?? {}) };
      if (removing) delete notes[athleteId];
      commit({ ...cur, watchlist, notes });
    },

    /** A private note on a saved athlete ("saw him at the Jr. NBA camp"). Empty text clears it. */
    setNote(athleteId: string, note: string) {
      const cur = getSnapshot();
      if (!cur.watchlist.includes(athleteId)) throw new Error("Save the athlete to your watchlist before adding a note.");
      const text = note.trim();
      if (text.length > MAX_NOTE_LENGTH) throw new Error(`Notes are limited to ${MAX_NOTE_LENGTH} characters.`);
      const notes = { ...(cur.notes ?? {}) };
      if (text) notes[athleteId] = text;
      else delete notes[athleteId];
      commit({ ...cur, notes });
    },

    /** Only the athlete decides whether recruiters can find their showcase. */
    setShowcaseVisible(visible: boolean, actor: Actor) {
      if (actor.role !== "athlete") throw new Error("Only the athlete can change their showcase visibility.");
      commit({ ...getSnapshot(), showcaseVisible: visible });
    },

    /** A recruiter asks for contact. The conversation stays closed until the athlete accepts. */
    sendInquiry(input: NewInquiry): Inquiry {
      if (!athleteIds.has(input.athleteId)) throw new Error(`Unknown athlete: ${input.athleteId}`);
      if (!input.recruiterName.trim()) throw new Error("An inquiry must name the recruiter.");
      if (!input.organization.trim()) throw new Error("An inquiry must name your organization or program.");
      if (!input.message.trim()) throw new Error("An inquiry needs a message.");
      const cur = getSnapshot();
      if (input.athleteId === ownAthleteId && cur.showcaseVisible === false) {
        throw new Error("This athlete has hidden their showcase, so new inquiries are closed.");
      }
      const open = cur.inquiries.find(
        (i) => i.athleteId === input.athleteId && i.recruiterName === input.recruiterName && i.status !== "Declined",
      );
      if (open) throw new Error("You already have an open inquiry with this athlete.");
      const inquiry: Inquiry = {
        ...input,
        recruiterName: input.recruiterName.trim(),
        organization: input.organization.trim(),
        message: input.message.trim(),
        id: `i-${now().getTime()}-${cur.inquiries.length}`,
        status: "Pending",
        createdAt: timeLabel(now),
      };
      commit({ ...cur, inquiries: [inquiry, ...cur.inquiries] });
      return inquiry;
    },

    /** Only the athlete can answer an inquiry, and only while it is still pending. */
    respond(inquiryId: string, decision: "Accepted" | "Declined", actor: Actor) {
      if (actor.role !== "athlete") throw new Error("Only the athlete can accept or decline an inquiry.");
      const cur = getSnapshot();
      const target = cur.inquiries.find((i) => i.id === inquiryId);
      if (!target) throw new Error(`Unknown inquiry: ${inquiryId}`);
      if (target.status !== "Pending") throw new Error("This inquiry has already been answered.");
      commit({
        ...cur,
        inquiries: cur.inquiries.map((i) =>
          i.id === inquiryId ? { ...i, status: decision satisfies InquiryStatus } : i,
        ),
      });
    },

    /** Controlled messaging: no messages in either direction until the inquiry is Accepted. */
    sendMessage(inquiryId: string, from: "recruiter" | "athlete", body: string): ThreadMessage {
      if (!body.trim()) throw new Error("A message cannot be empty.");
      const cur = getSnapshot();
      const target = cur.inquiries.find((i) => i.id === inquiryId);
      if (!target) throw new Error(`Unknown inquiry: ${inquiryId}`);
      if (target.status !== "Accepted") {
        throw new Error("Messaging unlocks only after the athlete accepts the inquiry.");
      }
      const message: ThreadMessage = {
        id: `m-${now().getTime()}-${cur.messages.length}`,
        inquiryId,
        from,
        body: body.trim(),
        time: timeLabel(now),
      };
      commit({ ...cur, messages: [...cur.messages, message] });
      return message;
    },

    reset() {
      commit(seed);
    },
  };
}

export const recruitmentStore = createRecruitmentStore(
  typeof window === "undefined" ? null : safeLocalStorage(),
  recruitmentSeed,
  directoryAthletes,
  undefined,
  currentAthlete.id,
);

function safeLocalStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useRecruitment(): RecruitmentState {
  return useSyncExternalStore(
    recruitmentStore.subscribe,
    recruitmentStore.getSnapshot,
    recruitmentStore.getServerSnapshot,
  );
}
