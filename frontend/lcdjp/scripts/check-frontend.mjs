// Frontend checks run by CI (node scripts/check-frontend.mjs):
//  1. every static/*.js parses (node --check)
//  2. every inline onclick="fn(...)" in static JS/HTML calls a function that exists somewhere in static/*.js
// Exits 1 with a list of problems.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = "src/main/resources/static";
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith(".js"));
const problems = [];

for (const f of js) {
  const r = spawnSync(process.execPath, ["--check", join(dir, f)], { encoding: "utf8" });
  if (r.status !== 0) problems.push(`syntax: ${f}\n${r.stderr.trim()}`);
}

const source = js.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const defined = new Set();
for (const m of source.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
for (const m of source.matchAll(/(?:window\.|globalThis\.)([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
for (const m of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);

const builtins = new Set(["if", "return", "event", "this", "confirm", "alert", "window", "document", "history",
  "location", "setTimeout", "prompt", "open", "void", "typeof", "String", "Number", "JSON", "encodeURIComponent"]);
const markup = files.filter((f) => f.endsWith(".js") || f.endsWith(".html"));
for (const f of markup) {
  const text = readFileSync(join(dir, f), "utf8");
  for (const m of text.matchAll(/onclick\s*=\s*\\?["']\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (!defined.has(name) && !builtins.has(name)) problems.push(`dead onclick: ${f} calls ${name}() which is not defined in static/*.js`);
  }
}

const unique = [...new Set(problems)];
if (unique.length) {
  console.error(unique.join("\n"));
  console.error(`\n${unique.length} problem(s)`);
  process.exit(1);
}
console.log(`ok: ${js.length} scripts parse, onclick handlers resolve`);
