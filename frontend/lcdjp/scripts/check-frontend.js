#!/usr/bin/env node
/*
 * Frontend sanity check. Run:  node scripts/check-frontend.js
 * Fails (exit 1) when it finds:
 *   1. a JS file with a syntax error
 *   2. an inline handler (onclick="foo()") whose function is never defined anywhere
 *   3. a <script src>, <link href> or image that points at a missing local file
 *   4. a duplicate element id inside one HTML page
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const STATIC = path.join(__dirname, '..', 'src', 'main', 'resources', 'static');
const files = fs.readdirSync(STATIC);
const jsFiles = files.filter(f => f.endsWith('.js'));
const htmlFiles = files.filter(f => f.endsWith('.html'));
const problems = [];

// 1. syntax
const jsSource = {};
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(STATIC, f), 'utf8');
  jsSource[f] = src;
  try { new vm.Script(src, { filename: f }); }
  catch (e) { problems.push(`SYNTAX  ${f}: ${e.message}`); }
}
const allJs = Object.values(jsSource).join('\n');

const BUILTINS = new Set(['alert', 'confirm', 'prompt', 'event', 'if', 'return', 'window', 'document', 'this', 'setTimeout', 'history', 'location', 'navigator', 'void']);
function isDefined(name) {
  const n = name.replace(/[$]/g, '\\$');
  return new RegExp(
    'function\\s+' + n + '\\b' +
    '|(?:window|self|globalThis)\\s*\\.\\s*' + n + '\\s*=' +
    '|(?:window|self|globalThis)\\s*\\[\\s*[\'"]' + n + '[\'"]\\s*\\]\\s*=' +
    '|(?:var|let|const)\\s+' + n + '\\s*=' +
    '|(?:^|[;{}\\s,])' + n + '\\s*=\\s*(?:async\\s*)?(?:function|\\()'
  ).test(allJs);
}

for (const h of htmlFiles) {
  const html = fs.readFileSync(path.join(STATIC, h), 'utf8');
  const inlineJs = (html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g) || []).join('\n');
  const known = (name) => isDefined(name) || new RegExp('function\\s+' + name + '\\b|' + name + '\\s*=').test(inlineJs);

  // 2. inline handlers
  const handlerRe = /\son[a-z]+\s*=\s*"\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/g;
  const seen = new Set();
  let m;
  while ((m = handlerRe.exec(html))) {
    const name = m[1];
    if (BUILTINS.has(name) || seen.has(name)) continue;
    seen.add(name);
    if (!known(name)) problems.push(`HANDLER ${h}: ${name}() is called from an inline handler but never defined`);
  }

  // 3. local references
  const refRe = /(?:src|href)\s*=\s*"([^"#:]+\.(?:js|css|png|jpe?g|svg|ico|json|webmanifest|webp))(?:\?[^"]*)?"/g;
  while ((m = refRe.exec(html))) {
    const ref = m[1].replace(/^\//, '');
    if (!fs.existsSync(path.join(STATIC, ref))) problems.push(`MISSING ${h}: ${ref}`);
  }

  // 4. duplicate ids
  const counts = {};
  for (const x of html.matchAll(/\sid\s*=\s*"([^"]+)"/g)) counts[x[1]] = (counts[x[1]] || 0) + 1;
  for (const [id, n] of Object.entries(counts)) if (n > 1) problems.push(`DUP-ID  ${h}: id="${id}" used ${n} times`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log(`OK: ${jsFiles.length} JS files, ${htmlFiles.length} HTML pages checked.`);
