// Password hashing with scrypt (memory-hard, built into Node, recommended by OWASP).
//
// Stored format:  scrypt$N$r$p$<salt b64>$<hash b64>
// The parameters are stored with every hash, so they can be raised later: `needsRehash` tells the
// login code to quietly upgrade an old hash the next time that user signs in.

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const PARAMS = { N: 65536, r: 8, p: 2 } as const; // ~64 MiB per hash, OWASP-recommended profile
const KEY_LEN = 32;
const SALT_LEN = 16;
const MAX_PASSWORD_LENGTH = 128; // stops huge inputs from being used to burn CPU

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  const opts: ScryptOptions = { N, r, p, maxmem: 256 * N * r };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, PARAMS.N, PARAMS.r, PARAMS.p);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nS, rS, pS, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const N = Number(nS);
  const r = Number(rS);
  const p = Number(pS);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"), N, r, p);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  return !(
    parts[0] === "scrypt" &&
    Number(parts[1]) === PARAMS.N &&
    Number(parts[2]) === PARAMS.r &&
    Number(parts[3]) === PARAMS.p
  );
}

let dummyHash: Promise<string> | undefined;
/**
 * Verify against a throwaway hash. Called when the account does not exist so that "unknown user"
 * takes as long as "wrong password" and response timing does not reveal which accounts exist.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

export const PASSWORD_RULES = { min: 10, max: MAX_PASSWORD_LENGTH } as const;

/** Returns an error message, or null when the password is acceptable. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_RULES.min)
    return `Password must be at least ${PASSWORD_RULES.min} characters.`;
  if (password.length > PASSWORD_RULES.max)
    return `Password must be at most ${PASSWORD_RULES.max} characters.`;
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Password must contain both letters and numbers.";
  return null;
}
