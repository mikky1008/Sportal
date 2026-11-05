// PostgreSQL database (works with Neon / Vercel Postgres, Supabase, or any Postgres).
//
// SERVER ONLY. The connection string comes from DATABASE_URL (or POSTGRES_URL, which Vercel's
// Neon integration also sets). Schema changes are applied automatically through the migrations
// below, once per server process, under a Postgres advisory lock so that two cold-starting
// serverless instances never run them at the same time.
//
// Everything that talks to the database uses tagged-template queries, which send user input as
// bound parameters, so it is never concatenated into SQL.

import postgres, { type Sql } from "postgres";

export type Db = Sql;

interface Migration {
  version: number;
  name: string;
  sql: string;
}

// Append new migrations to the END of this list. Never edit one that has already shipped.
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "init",
    sql: `
      CREATE TABLE users (
        id                  TEXT PRIMARY KEY,
        email               TEXT NOT NULL,
        username            TEXT NOT NULL,
        password_hash       TEXT NOT NULL,
        display_name        TEXT NOT NULL,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified_at   TIMESTAMPTZ,
        password_changed_at TIMESTAMPTZ NOT NULL,
        last_login_at       TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL,
        updated_at          TIMESTAMPTZ NOT NULL,
        deleted_at          TIMESTAMPTZ
      );
      -- Email and username are case-insensitive.
      CREATE UNIQUE INDEX users_email_key ON users (lower(email));
      CREATE UNIQUE INDEX users_username_key ON users (lower(username));

      -- Profile details live apart from credentials so profile features never touch auth data.
      CREATE TABLE user_profiles (
        user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT,
        last_name  TEXT,
        avatar_url TEXT,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE roles (
        id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE permissions (
        id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE role_permissions (
        role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      -- Many-to-many so a user can hold several roles later without a redesign.
      CREATE TABLE user_roles (
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id    INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        granted_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (user_id, role_id)
      );

      -- Only a SHA-256 hash of the session token is stored, so a leaked database cannot be
      -- replayed as live sessions.
      CREATE TABLE sessions (
        token_hash   TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL,
        last_seen_at TIMESTAMPTZ NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        remember     BOOLEAN NOT NULL DEFAULT FALSE,
        ip           TEXT,
        user_agent   TEXT,
        revoked_at   TIMESTAMPTZ
      );
      CREATE INDEX idx_sessions_user ON sessions(user_id);
      CREATE INDEX idx_sessions_expires ON sessions(expires_at);

      -- Ready for the password-reset feature (token hash only, single use, short lived).
      CREATE TABLE password_reset_tokens (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ
      );

      -- Used for login rate limiting.
      CREATE TABLE login_attempts (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        identifier TEXT NOT NULL,
        ip         TEXT,
        success    BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier, created_at);
      CREATE INDEX idx_login_attempts_ip ON login_attempts(ip, created_at);

      -- Used for sign-up rate limiting (kept in the database because serverless instances share
      -- no memory).
      CREATE TABLE signup_attempts (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ip         TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX idx_signup_attempts_ip ON signup_attempts(ip, created_at);

      -- Append-only trail of security-relevant events (login, logout, failures, user changes).
      CREATE TABLE audit_log (
        id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
        event      TEXT NOT NULL,
        identifier TEXT,
        ip         TEXT,
        user_agent TEXT,
        detail     TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX idx_audit_user ON audit_log(user_id, created_at);
      CREATE INDEX idx_audit_event ON audit_log(event, created_at);

      -- Role-specific details entered on the Sign up form. Names live in user_profiles already.
      CREATE TABLE coach_profiles (
        user_id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        organization         TEXT NOT NULL,
        coaching_position    TEXT NOT NULL,
        sport_specialization TEXT NOT NULL,
        created_at           TIMESTAMPTZ NOT NULL,
        updated_at           TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE university_representative_profiles (
        user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        university_name TEXT NOT NULL,
        designation     TEXT NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL,
        updated_at      TIMESTAMPTZ NOT NULL
      );

      -- Reference data (not user accounts): the roles the app knows about. People can register as
      -- student_athlete, coach or university_representative; admin is only given out by hand.
      INSERT INTO roles (name, description) VALUES
        ('student_athlete', 'Student-athlete: manages their own profile and practice sessions'),
        ('coach', 'Coach: reviews and verifies athlete sessions'),
        ('admin', 'Administrator: manages accounts and roles'),
        ('university_representative', 'University representative: represents a university''s athletics program');

      INSERT INTO permissions (name, description) VALUES
        ('sessions:verify', 'Mark a performance session as coach-verified'),
        ('users:read',      'View user accounts'),
        ('users:manage',    'Create, edit, activate and deactivate user accounts'),
        ('audit:read',      'View the login activity and audit log');

      -- A coach who signs up has NOT been approved yet, so the coach role alone does not grant
      -- 'sessions:verify'. Grant it to coaches when coach approval exists.
      INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';
    `,
  },
  {
    version: 2,
    name: "coach_athlete_connections",
    sql: `
      -- One row per coach-athlete pair. A coach is a user with the 'coach' role and an athlete is a
      -- user with the 'student_athlete' role (there is no separate athlete table), so both sides
      -- reference users(id). Role checks are the API's job; the database guarantees the shape.
      -- The row is reused for the life of the relationship: declining, cancelling or disconnecting
      -- changes status, and a later re-request flips the same row back to 'pending'.
      CREATE TABLE coach_athlete_connections (
        id           TEXT PRIMARY KEY,
        coach_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        athlete_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status       TEXT NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMPTZ NOT NULL,
        responded_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL,
        CONSTRAINT coach_athlete_connections_status_check
          CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'disconnected')),
        -- Nobody connects to themselves.
        CONSTRAINT coach_athlete_connections_distinct_users_check
          CHECK (coach_id <> athlete_id),
        -- Only one of the two people can have sent the request.
        CONSTRAINT coach_athlete_connections_requested_by_check
          CHECK (requested_by IN (coach_id, athlete_id)),
        -- A pending request has not been answered yet; an answer cannot predate the request.
        CONSTRAINT coach_athlete_connections_responded_check
          CHECK ((status <> 'pending' OR responded_at IS NULL)
             AND (responded_at IS NULL OR responded_at >= requested_at))
      );
      -- At most one record per coach-athlete pair, so a duplicate request (including a second
      -- pending or accepted one, from either side) is rejected by the database itself.
      CREATE UNIQUE INDEX coach_athlete_connections_pair_key
        ON coach_athlete_connections (coach_id, athlete_id);
      CREATE INDEX idx_coach_athlete_connections_coach   ON coach_athlete_connections (coach_id, status);
      CREATE INDEX idx_coach_athlete_connections_athlete ON coach_athlete_connections (athlete_id, status);
    `,
  },
];

const MIGRATION_LOCK_ID = 727_274_001;

async function migrate(db: Db): Promise<void> {
  await db.begin(async (tx) => {
    // Held until this transaction ends, so concurrent cold starts queue up instead of colliding.
    await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`;
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL
    )`);
    const rows = await tx<{ version: number }[]>`SELECT version FROM schema_migrations`;
    const applied = new Set(rows.map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (applied.has(m.version)) continue;
      await tx.unsafe(m.sql);
      await tx`INSERT INTO schema_migrations (version, name, applied_at) VALUES (${m.version}, ${m.name}, ${new Date()})`;
    }
  });
}

export function connectionString(): string {
  const url = process.env["DATABASE_URL"] || process.env["POSTGRES_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add your Postgres connection string (see .env.example).");
  }
  return url;
}

/** Open (and migrate) a database. */
export async function openDatabase(url: string): Promise<Db> {
  const db = postgres(url, {
    // Serverless: keep the pool tiny, since every warm instance holds its own connections.
    max: Number(process.env["DB_POOL_MAX"] ?? 3),
    idle_timeout: 20,
    connect_timeout: 10,
    // Required behind PgBouncer-style poolers (Neon's pooled URL, Supabase's pooler).
    prepare: false,
    // Postgres returns timestamptz as Date objects and bigint as strings; keep it that way.
    onnotice: () => {},
  });
  try {
    await migrate(db);
  } catch (err) {
    await db.end({ timeout: 1 }).catch(() => {});
    throw err;
  }
  return db;
}

const globalKey = Symbol.for("sportal.db");
type GlobalWithDb = typeof globalThis & { [globalKey]?: Promise<Db> };

/** One shared pool per server process (also survives dev-server hot reloads). */
export function getDb(): Promise<Db> {
  const g = globalThis as GlobalWithDb;
  if (!g[globalKey]) {
    const p = openDatabase(connectionString());
    // A failed start (bad URL, database waking up) must not be cached forever.
    p.catch(() => {
      if (g[globalKey] === p) delete g[globalKey];
    });
    g[globalKey] = p;
  }
  return g[globalKey];
}

/** Close the pool (command-line scripts and tests; a server never needs this). */
export async function closeDb(): Promise<void> {
  const g = globalThis as GlobalWithDb;
  const p = g[globalKey];
  delete g[globalKey];
  if (p) await (await p.catch(() => null))?.end({ timeout: 5 });
}
