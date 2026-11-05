-- Reference copy of migration 2 in server/db.server.ts (applied automatically on API start).
-- Run by hand only if schema_migrations has no version 2 yet; otherwise the app would try to
-- create the table again and fail.

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
