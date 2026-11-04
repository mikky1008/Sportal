// Sportal API request handler, written against the web-standard Request / Response so the same
// code runs as a Vercel Function (api/index.ts) and as a plain Node server (server/index.ts).
//
//   POST /api/auth/login      { identifier, password, remember }  -> { ok, user, token, expiresAt }
//   POST /api/auth/register   { accountType, ... }                -> { ok, user, role, token, expiresAt }
//   GET  /api/auth/me         Authorization: Bearer <token>       -> { user }
//   POST /api/auth/logout     Authorization: Bearer <token>       -> { ok }
//   GET  /api/health
//
// The session token is returned in the JSON body and sent back as an `Authorization: Bearer`
// header (a native app has no browser cookie jar). Only a SHA-256 hash of it is stored.

import { z } from "zod";
import { parseRegistration, type RegisterField } from "./registration.ts";
import {
  authenticate,
  createUser,
  deriveUsername,
  destroySession,
  getUserBySessionToken,
  signupAllowed,
  UserInputError,
  type RequestMeta,
} from "./auth.server.ts";

const TRUST_PROXY = process.env["TRUST_PROXY"] === "true" || !!process.env["VERCEL"];
const MAX_BODY_BYTES = 16 * 1024;

// The web app is served from the same origin as the API on Vercel, so it needs no CORS entry.
// These are for the native app's web view (Capacitor) and for local development. Add your own
// with CORS_ORIGINS=a,b,c.
const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:5173",
  "http://localhost:8100",
  ...(process.env["CORS_ORIGINS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
]);

/** Header the local Node adapter uses to pass the socket address (always overwritten there). */
export const SOCKET_IP_HEADER = "x-sportal-socket-ip";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
  remember: z.boolean().default(false),
});

function requestMeta(req: Request): RequestMeta {
  let ip: string | null;
  if (TRUST_PROXY) {
    // On Vercel the platform sets x-forwarded-for itself, so the first entry is the real client.
    const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    ip = first ?? req.headers.get("x-real-ip");
  } else {
    ip = req.headers.get(SOCKET_IP_HEADER);
  }
  return { ip: ip || null, userAgent: req.headers.get("user-agent") };
}

function bearer(req: Request): string | undefined {
  const h = req.headers.get("authorization");
  return (h ? /^Bearer\s+(\S+)$/i.exec(h) : null)?.[1];
}

function send(req: Request, status: number, body: unknown): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
  });
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "authorization, content-type");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-max-age", "600");
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new Error("too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("too_large");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("bad_json");
  }
}

async function handleLogin(req: Request): Promise<Response> {
  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return send(req, 200, {
      ok: false,
      code: "validation",
      message: "Please fix the highlighted fields.",
      fieldErrors: {
        ...(flat.identifier?.[0] ? { identifier: flat.identifier[0] } : {}),
        ...(flat.password?.[0] ? { password: flat.password[0] } : {}),
      },
    });
  }
  try {
    const result = await authenticate(parsed.data, requestMeta(req));
    if (!result.ok) {
      if (result.code === "rate_limited") {
        const mins = Math.ceil((result.retryAfterSec ?? 60) / 60);
        return send(req, 200, {
          ok: false,
          code: "rate_limited",
          message: `Too many failed attempts. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`,
          retryAfterSec: result.retryAfterSec ?? 60,
        });
      }
      if (result.code === "inactive")
        return send(req, 200, { ok: false, code: "inactive", message: "This account has been deactivated. Contact your administrator." });
      return send(req, 200, { ok: false, code: "invalid_credentials", message: "Incorrect username/email or password." });
    }
    return send(req, 200, { ok: true, user: result.user, token: result.token, expiresAt: result.expiresAt.toISOString() });
  } catch (err) {
    console.error("[api] login failed unexpectedly:", err instanceof Error ? err.message : "unknown error");
    return send(req, 200, { ok: false, code: "server_error", message: "Something went wrong. Please try again." });
  }
}

async function handleRegister(req: Request): Promise<Response> {
  const parsed = parseRegistration(await readJson(req));
  if (!parsed.ok) return send(req, 200, { ok: false, code: "validation", message: parsed.message, fieldErrors: parsed.fieldErrors });
  const input = parsed.data;
  const meta = requestMeta(req);

  let username = "";
  try {
    if (!(await signupAllowed(meta.ip)))
      return send(req, 200, { ok: false, code: "rate_limited", message: "Too many sign ups from this connection. Try again in an hour." });
    username = await deriveUsername(input.email);
    await createUser({
      email: input.email,
      username,
      password: input.password,
      displayName: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName,
      lastName: input.lastName,
      roles: [input.accountType],
      details: parsed.details,
    });
  } catch (err) {
    if (err instanceof UserInputError) {
      const field: RegisterField = err.field === "email" || err.field === "password" ? err.field : "email";
      if (err.field === "email" && /already registered/i.test(err.message))
        return send(req, 200, { ok: false, code: "taken", message: err.message, fieldErrors: { email: err.message } });
      return send(req, 200, { ok: false, code: "validation", message: err.message, fieldErrors: { [field]: err.message } });
    }
    console.error("[api] sign up failed unexpectedly:", err instanceof Error ? err.message : "unknown error");
    return send(req, 200, { ok: false, code: "server_error", message: "Something went wrong. Please try again." });
  }
  try {
    const result = await authenticate({ identifier: username, password: input.password, remember: false }, meta);
    if (!result.ok) return send(req, 200, { ok: false, code: "server_error", message: "Your account was created. Sign in to continue." });
    return send(req, 200, {
      ok: true, user: result.user, role: input.accountType, token: result.token, expiresAt: result.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[api] sign in after sign up failed:", err instanceof Error ? err.message : "unknown error");
    return send(req, 200, { ok: false, code: "server_error", message: "Your account was created. Sign in to continue." });
  }
}

export async function handle(req: Request): Promise<Response> {
  try {
    const path = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") return send(req, 204, null);

    if (req.method === "GET" && path === "/api/health") return send(req, 200, { ok: true });
    if (req.method === "POST" && path === "/api/auth/login") return await handleLogin(req);
    if (req.method === "POST" && path === "/api/auth/register") return await handleRegister(req);
    if (req.method === "GET" && path === "/api/auth/me") {
      const user = await getUserBySessionToken(bearer(req));
      return send(req, user ? 200 : 401, { user });
    }
    if (req.method === "POST" && path === "/api/auth/logout") {
      await destroySession(bearer(req), requestMeta(req));
      return send(req, 200, { ok: true });
    }
    return send(req, 404, { error: "not_found" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "too_large") return send(req, 413, { error: "too_large" });
    if (msg === "bad_json") return send(req, 400, { error: "bad_json" });
    console.error("[api] unhandled error:", msg || "unknown error");
    return send(req, 500, { error: "server_error" });
  }
}
