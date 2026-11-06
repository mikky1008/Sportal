import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  answerConnectionRequest, listConnections, sendConnectionRequest,
  type ConnectionPage, type ConnectionView, type ListKind, type RequestAction,
} from "@/lib/connectionsApi";

type Lists = Record<ListKind, ConnectionPage>;
const EMPTY_PAGE: ConnectionPage = { items: [], total: 0, limit: 0, offset: 0 };

/** Server answers that mean "what you see is out of date": the lists are reloaded after them. */
const STALE_CODES = new Set([
  "not_pending", "not_connected", "request_conflict", "connection_not_found",
  "already_connected", "request_already_sent", "request_already_received",
]);

const SUCCESS: Record<RequestAction, string> = {
  accept: "Request accepted. The athlete is now on your roster.",
  decline: "Request declined.",
  cancel: "Request cancelled.",
};

export type ConnectionsState = "loading" | "ready" | "error";

/**
 * Everything the coach dashboard shows about connections, straight from the API: incoming and
 * outgoing pending requests and accepted athletes. After any successful action the three lists
 * are reloaded, so every card, count and button reflects the server without a page refresh.
 */
export function useCoachConnections() {
  const [lists, setLists] = useState<Lists>({ incoming: EMPTY_PAGE, outgoing: EMPTY_PAGE, accepted: EMPTY_PAGE });
  const [state, setState] = useState<ConnectionsState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const loadId = useRef(0);
  const alive = useRef(true);
  const busyRef = useRef(new Set<string>());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** `quiet` keeps the current lists on screen while reloading (used after an action). */
  const load = useCallback(async (quiet = false) => {
    const mine = ++loadId.current;
    if (!quiet) setState("loading");
    const [incoming, outgoing, accepted] = await Promise.all([
      listConnections("incoming"), listConnections("outgoing"), listConnections("accepted"),
    ]);
    if (!alive.current || mine !== loadId.current) return; // a newer load replaced this one
    const failed = [incoming, outgoing, accepted].find((r) => !r.ok);
    if (failed && !failed.ok) {
      setError(failed.message);
      setState("error");
      return;
    }
    if (incoming.ok && outgoing.ok && accepted.ok) {
      setLists({ incoming: incoming.data, outgoing: outgoing.data, accepted: accepted.data });
      setError(null);
      setState("ready");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const track = (key: string, on: boolean) => {
    if (on) busyRef.current.add(key);
    else busyRef.current.delete(key);
    setBusy(new Set(busyRef.current));
  };

  /** Runs one write. Returns true when the server accepted it. Ignores a second click while it runs. */
  const run = useCallback(async (key: string, call: () => Promise<{ ok: true } | { ok: false; code: string; message: string }>, success: string) => {
    if (busyRef.current.has(key)) return false;
    track(key, true);
    try {
      const res = await call();
      if (!alive.current) return res.ok;
      if (res.ok) {
        toast.success(success);
        await load(true);
        return true;
      }
      toast.error(res.message);
      if (STALE_CODES.has(res.code) || res.code === "unauthenticated") await load(true);
      return false;
    } finally {
      track(key, false);
    }
  }, [load]);

  const respond = useCallback(
    (c: ConnectionView, action: RequestAction) => run(c.id, () => answerConnectionRequest(c.id, action), SUCCESS[action]),
    [run],
  );
  const connect = useCallback(
    (userId: string) => run(`user:${userId}`, () => sendConnectionRequest(userId), "Connection request sent."),
    [run],
  );

  return {
    state, error, busy,
    incoming: lists.incoming, outgoing: lists.outgoing, accepted: lists.accepted,
    reload: () => load(), respond, connect,
  };
}

export type CoachConnections = ReturnType<typeof useCoachConnections>;
