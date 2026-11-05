// Which browser-stored profile belongs to which self-registered account.
//
// PROTOTYPE LIMIT: profile data still lives in this browser's localStorage (see profileStore.ts).
// To stop two accounts on one browser from sharing a profile, every account created on the Sign up
// page gets its own storage keys (`<key>:<userId>`) and starts with a BLANK profile. Accounts that
// were created by an administrator keep the original keys and the sample profile, exactly as before.

export type AccountType = "athlete" | "coach";

export interface LocalAccount {
  type: AccountType;
  firstName: string;
  lastName: string;
  email: string;
}

const REGISTRY_KEY = "sportal.accounts.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isAccount(v: unknown): v is LocalAccount {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    (r["type"] === "athlete" || r["type"] === "coach") &&
    typeof r["firstName"] === "string" &&
    typeof r["lastName"] === "string" &&
    typeof r["email"] === "string"
  );
}

function readRegistry(storage: StorageLike | null): Record<string, LocalAccount> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(REGISTRY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, LocalAccount> = {};
    for (const [id, acct] of Object.entries(parsed)) if (isAccount(acct)) out[id] = acct;
    return out;
  } catch {
    return {};
  }
}

let active: (LocalAccount & { id: string }) | null = null;

/**
 * Tell the stores who is signed in. Call it before anything reads a profile (the root route does).
 * Returns the account when it was created through Sign up, otherwise null (legacy behaviour).
 */
export function activateAccount(
  userId: string | null | undefined,
  storage: StorageLike | null = browserStorage(),
): (LocalAccount & { id: string }) | null {
  // No user id means "not known yet", not "signed out". Signing out calls deactivateAccount().
  if (!userId) return active;
  const acct = readRegistry(storage)[userId];
  active = acct && userId ? { ...acct, id: userId } : null;
  return active;
}

/** Forget the active account (sign out). The next account starts from its own storage keys. */
export function deactivateAccount(): void {
  active = null;
}

/** Remember a brand-new account and make it the active one. */
export function registerLocalAccount(
  userId: string,
  account: LocalAccount,
  storage: StorageLike | null = browserStorage(),
): void {
  if (storage) {
    try {
      storage.setItem(REGISTRY_KEY, JSON.stringify({ ...readRegistry(storage), [userId]: account }));
    } catch {
      // storage blocked: the account still works for this page view
    }
  }
  active = { ...account, id: userId };
}

/**
 * Make sure this browser knows the account. Used when someone signs in on a browser that did not
 * create the account (another device, cleared storage): the names come from the server, so the
 * profile starts with the signup name instead of the sample profile. An account this browser
 * already knows is left alone, so edits made in Settings are never overwritten.
 */
export function ensureLocalAccount(
  userId: string,
  account: LocalAccount,
  storage: StorageLike | null = browserStorage(),
): void {
  if (readRegistry(storage)[userId]) return;
  registerLocalAccount(userId, account, storage);
}

export function activeAccount(): (LocalAccount & { id: string }) | null {
  return active;
}

/** The storage key to use right now. Unchanged for legacy accounts. */
export function scopedKey(base: string): string {
  return active ? `${base}:${active.id}` : base;
}

/** Cache stamp: changes whenever the active account changes, so stores know to reload. */
export function scopeStamp(): string {
  return active?.id ?? "";
}
