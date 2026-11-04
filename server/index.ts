// Local / self-hosted Node server for the Sportal API. It is a thin adapter around the same
// handler the Vercel Function uses (server/handler.ts), so local runs behave like production.
//
// Run:  npm run api      (needs Node 22.5+ and DATABASE_URL pointing at a Postgres database)

import { createServer } from "node:http";
import { Readable } from "node:stream";
import { handle, SOCKET_IP_HEADER } from "./handler.ts";

const PORT = Number(process.env["PORT"] ?? 8787);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const server = createServer((nodeReq, nodeRes) => {
  void (async () => {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(nodeReq.headers)) {
        if (k.toLowerCase() === SOCKET_IP_HEADER) continue; // never trust a client-supplied value
        if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
        else if (v !== undefined) headers.set(k, v);
      }
      if (nodeReq.socket.remoteAddress) headers.set(SOCKET_IP_HEADER, nodeReq.socket.remoteAddress);

      const hasBody = nodeReq.method !== "GET" && nodeReq.method !== "HEAD";
      const request = new Request(new URL(nodeReq.url ?? "/", "http://localhost"), {
        method: nodeReq.method ?? "GET",
        headers,
        ...(hasBody ? { body: Readable.toWeb(nodeReq) as ReadableStream, duplex: "half" } : {}),
      } as RequestInit);

      const response = await handle(request);
      nodeRes.writeHead(response.status, Object.fromEntries(response.headers));
      nodeRes.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error("[api] adapter error:", err instanceof Error ? err.message : "unknown error");
      if (!nodeRes.headersSent) nodeRes.writeHead(500, { "content-type": "application/json" });
      nodeRes.end(JSON.stringify({ error: "server_error" }));
    }
  })();
});

server.listen(PORT, HOST, () => {
  console.log(`Sportal API listening on http://${HOST}:${PORT}`);
});
