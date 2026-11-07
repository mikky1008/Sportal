// Coach / recruiter profile, loaded from and saved to the API (GET / PUT /api/coach/profile).
// Nothing is kept in the browser any more: a coach sees the same profile on every device.
//
// `verificationStatus` is deliberately NOT part of the editable profile. It is decided by Sportal's
// review (see server/coach-profile.server.ts): the coach can only ask for a review with
// `requestVerification()`, and the answer comes back from the server. It is never read by profile
// completion: a coach can have a 100% complete profile while their organization is still "Pending".
//
// The rules (limits, option lists, validateCoach) live in coachProfileRules.ts, shared with the server.

import { useSyncExternalStore } from "react";
import { apiRequest, type ApiResult } from "@/auth/authClient";
import { activeAccount } from "@/lib/accountScope";
import {
  CoachValidationError, EMPTY_COACH, hasCoachErrors, validateCoach,
  type CoachErrors, type CoachProfile, type CoachVerificationStatus,
} from "@/lib/coachProfileRules";

export * from "@/lib/coachProfileRules";

/** What the server says about the coach's verification. */
export interface CoachVerification {
  status: CoachVerificationStatus;
  /** a request is waiting for a reviewer */
  requested: boolean;
  /** the coach may send (or re-send) a request right now */
  canRequest: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  /** the reviewer's reason, shown after a decision */
  note: string;
}

export type CoachLoadState = "idle" | "loading" | "ready" | "error";

export interface CoachState {
  profile: CoachProfile;
  /** system-owned; see the note at the top of this file */
  verificationStatus: CoachVerificationStatus;
  verification: CoachVerification;
  /** where the load from the server stands (the form shows the blank profile until it is "ready") */
  load: CoachLoadState;
  loadError: string | null;
}

const NO_VERIFICATION: CoachVerification = {
  status: "Pending", requested: false, canRequest: false, submittedAt: null, reviewedAt: null, note: "",
};

interface ProfileResponse { profile: CoachProfile; verification: CoachVerification }

export interface CoachProfileApi {
  get(): Promise<ApiResult<ProfileResponse>>;
  put(profile: CoachProfile): Promise<ApiResult<ProfileResponse>>;
  requestVerification(): Promise<ApiResult<{ verification: CoachVerification }>>;
}

const httpApi: CoachProfileApi = {
  get: () => apiRequest<ProfileResponse>("/api/coach/profile"),
  put: (profile) => apiRequest<ProfileResponse>("/api/coach/profile", { method: "PUT", body: profile }),
  requestVerification: () => apiRequest<{ verification: CoachVerification }>("/api/coach/verification/request", { method: "POST" }),
};

export function createCoachProfileStore(api: CoachProfileApi = httpApi) {
  const listeners = new Set<() => void>();
  let generation = 0;

  /** A blank profile carrying just the name and email the account was created with. */
  function blank(): CoachProfile {
    const acct = activeAccount();
    return acct ? { ...EMPTY_COACH, firstName: acct.firstName, lastName: acct.lastName, email: acct.email } : { ...EMPTY_COACH };
  }
  const fresh = (): CoachState => ({
    profile: blank(), verificationStatus: "Pending", verification: NO_VERIFICATION, load: "idle", loadError: null,
  });

  let state: CoachState = fresh();
  const set = (next: CoachState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  const server = fresh();

  const fromServer = (r: ProfileResponse): Pick<CoachState, "profile" | "verification" | "verificationStatus"> => ({
    profile: { ...EMPTY_COACH, ...r.profile },
    verification: r.verification,
    verificationStatus: r.verification.status,
  });

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => server,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    /** Forget everything (sign in, sign out, new account). The next account starts blank. */
    refresh() {
      generation++;
      set(fresh());
    },

    /** Loads the signed-in coach's profile from the server. Call it only for coach accounts. */
    async load(): Promise<void> {
      const mine = ++generation;
      set({ ...state, load: "loading", loadError: null });
      const res = await api.get();
      if (mine !== generation) return; // signed out, or a newer load took over
      if (res.ok) set({ ...fromServer(res.data), load: "ready", loadError: null });
      else set({ ...state, load: "error", loadError: res.message });
    },

    /**
     * Validates, then saves to the server. Throws CoachValidationError (nothing is saved) when anything
     * filled in is invalid, and a plain Error with the server's message when the save itself fails.
     */
    async save(draft: CoachProfile): Promise<CoachState> {
      const errors = validateCoach(draft);
      if (hasCoachErrors(errors)) throw new CoachValidationError(errors);
      const mine = generation;
      const res = await api.put(draft);
      if (!res.ok) {
        if (res.fieldErrors) throw new CoachValidationError(res.fieldErrors as CoachErrors);
        throw new Error(res.message);
      }
      if (mine === generation) set({ ...fromServer(res.data), load: "ready", loadError: null });
      return state;
    },

    /** Sends the verification details to Sportal's reviewers. Throws an Error with the server's message on failure. */
    async requestVerification(): Promise<CoachVerification> {
      const mine = generation;
      const res = await api.requestVerification();
      if (!res.ok) {
        if (res.fieldErrors) throw new CoachValidationError(res.fieldErrors as CoachErrors);
        throw new Error(res.message);
      }
      if (mine === generation) set({ ...state, verification: res.data.verification, verificationStatus: res.data.verification.status });
      return res.data.verification;
    },
  };
}

export const coachProfileStore = createCoachProfileStore();

export function useCoachProfile(): CoachState {
  return useSyncExternalStore(coachProfileStore.subscribe, coachProfileStore.getSnapshot, coachProfileStore.getServerSnapshot);
}
