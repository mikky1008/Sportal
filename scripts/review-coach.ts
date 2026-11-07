// Command-line coach verification review. Use it until the admin screen exists.
//
//   npm run review:coach -- list [pending|verified|rejected]     (default: pending)
//   npm run review:coach -- approve coach@school.edu
//   npm run review:coach -- reject  coach@school.edu --note "Reason the coach will read"
//
// Approving gives the coach the verified_coach role. Rejecting (also works on an approved coach, to
// revoke) removes it and stores the note, which the coach sees on their profile.
// Decisions are written to the audit log with no reviewer account (reviewed_by stays empty).

import { closeDb, getDb } from "../server/db.server.ts";
import { applyReview } from "../server/coach-profile.server.ts";
import { ConnectionError } from "../server/connections.server.ts";

const [command, arg] = process.argv.slice(2);
const noteIdx = process.argv.indexOf("--note");
const note = noteIdx === -1 ? "" : (process.argv[noteIdx + 1] ?? "");

function usage(): never {
  console.error('Usage:\n  review:coach list [pending|verified|rejected]\n  review:coach approve <email>\n  review:coach reject <email> --note "reason"');
  process.exit(2);
}

const db = await getDb();
try {
  if (command === "list") {
    const status = arg ?? "pending";
    if (!["pending", "verified", "rejected"].includes(status)) usage();
    const rows = await db<{ email: string; display_name: string; organization: string; official_email: string; credential_type: string; credential_reference: string; submitted_at: Date }[]>`
      SELECT u.email, u.display_name, v.organization, v.official_email, v.credential_type, v.credential_reference, v.submitted_at
      FROM coach_verifications v JOIN users u ON u.id = v.coach_id
      WHERE v.status = ${status} ORDER BY v.submitted_at`;
    if (rows.length === 0) console.log(`No ${status} requests.`);
    for (const r of rows)
      console.log(`${r.email}  ${r.display_name}\n  org: ${r.organization}\n  official email: ${r.official_email}\n  ${r.credential_type}: ${r.credential_reference}\n  submitted ${r.submitted_at.toISOString()}\n`);
  } else if ((command === "approve" || command === "reject") && arg && !arg.startsWith("--")) {
    const [coach] = await db<{ id: string }[]>`SELECT id FROM users WHERE lower(email) = ${arg.toLowerCase()} AND deleted_at IS NULL`;
    if (!coach) throw new Error(`No account with email ${arg}.`);
    await applyReview(db, { coachId: coach.id, decision: command, note, reviewerId: null });
    console.log(command === "approve" ? `Approved ${arg}. They are now a verified coach.` : `Rejected ${arg}.`);
  } else usage();
} catch (err) {
  if (err instanceof ConnectionError) {
    console.error(err.message);
    process.exitCode = 1;
  } else throw err;
} finally {
  await closeDb();
}
