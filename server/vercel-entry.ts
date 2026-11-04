// Entry for the Vercel Function. `npm run build:api` bundles this (plus the handler, auth code and
// the Postgres driver) into the single file api/index.mjs, which is what Vercel deploys.
// Vercel's "fetch" web-standard export: one function serves every /api/* route (see vercel.json).

import { handle } from "./handler.ts";

export default { fetch: handle };
