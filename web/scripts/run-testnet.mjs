// Testnet supervisor: runs the price bot, keeper and seeder together and restarts any that exit. TESTNET ONLY.
//
// Usage: npm run testnet          (needs web/.env.testnet, created by scripts/testnet-setup.mjs)
// Output goes to the terminal with a [bot] prefix and is appended to logs/<bot>.log. Ctrl+C stops everything.
//
// Start order matters: the price bot goes first so feeds are fresh, the keeper follows (opening rounds needs a fresh price),
// then the seeder (it stakes into rounds the keeper has opened).
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
mkdirSync(`${ROOT}logs`, { recursive: true });

const BOTS = [
  { name: "pricer", file: "scripts/pricer.mjs", delayMs: 0 },
  { name: "keeper", file: "scripts/keeper.mjs", delayMs: 20_000 },
  { name: "seeder", file: "scripts/seeder.mjs", delayMs: 35_000 },
];

const children = new Map();
let stopping = false;

function line(bot, text) {
  const out = `${new Date().toISOString()} [${bot}] ${text}`;
  console.log(out);
  try {
    appendFileSync(`${ROOT}logs/${bot}.log`, out + "\n");
  } catch {
    /* logging must never crash the supervisor */
  }
}

function start(bot, attempt = 0) {
  if (stopping) return;
  const child = spawn(process.execPath, ["--env-file-if-exists=.env.testnet", bot.file], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  children.set(bot.name, child);
  line(bot.name, `started (pid ${child.pid})`);

  const forward = (chunk) => String(chunk).split("\n").filter(Boolean).forEach((l) => line(bot.name, l));
  child.stdout.on("data", forward);
  child.stderr.on("data", forward);

  child.on("exit", (code, signal) => {
    children.delete(bot.name);
    if (stopping) return;
    // Back off a little more after each quick failure, capped at 60 seconds.
    const wait = Math.min(60_000, 3_000 * 2 ** Math.min(attempt, 4));
    line(bot.name, `exited (${signal ?? code}); restarting in ${wait / 1000}s`);
    setTimeout(() => start(bot, attempt + 1), wait);
  });
}

for (const bot of BOTS) setTimeout(() => start(bot), bot.delayMs);

// Free web hosts (for example Render's free web service) only run processes that listen on $PORT, and they sleep when idle.
// When PORT is set, answer a tiny health check so an uptime pinger can keep the supervisor awake. No data is exposed.
if (process.env.PORT) {
  const { createServer } = await import("node:http");
  createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`ok ${[...children.keys()].join(",") || "starting"}\n`);
  }).listen(Number(process.env.PORT), () => line("supervisor", `health check on :${process.env.PORT}`));
}

function stopAll() {
  if (stopping) return;
  stopping = true;
  console.log("\nstopping bots…");
  for (const c of children.values()) c.kill("SIGTERM");
  setTimeout(() => process.exit(0), 1500);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
