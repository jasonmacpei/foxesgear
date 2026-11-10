import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
const messages = [];
const keys = new Map();
let failNext = false;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4010");
  const reply = (status, data) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  if (url.pathname === "/health") return reply(200, { mock: true });
  if (url.pathname === "/messages") return reply(200, messages.filter(m => !url.searchParams.has("to") || m.to.includes(url.searchParams.get("to"))));
  if (url.pathname === "/fail-next" && req.method === "POST") { failNext = true; return reply(200, { ok: true }); }
  if (url.pathname === "/emails" && req.method === "POST") {
    let body = ""; for await (const chunk of req) body += chunk;
    if (failNext) { failNext = false; return reply(503, { name: "application_error", message: "Simulated temporary email outage" }); }
    const key = req.headers["idempotency-key"];
    if (keys.has(key)) return reply(200, { id: keys.get(key) });
    const data = JSON.parse(body); const id = randomUUID();
    messages.push({ ...data, to: Array.isArray(data.to) ? data.to : [data.to], id, key }); keys.set(key, id);
    return reply(200, { id });
  }
  reply(404, { error: "Not found" });
});
server.listen(4010, "127.0.0.1", () => console.log("Local email test server ready on 127.0.0.1:4010; no messages leave this process."));
