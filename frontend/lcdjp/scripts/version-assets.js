#!/usr/bin/env node
/*
 * Cache-busting by content. Run before every deploy:  node scripts/version-assets.js
 *  - rewrites ?v=... on every local .js/.css reference in the HTML pages to a hash of that file's contents
 *    (so a file only gets a new URL when it really changed, and nobody has to bump versions by hand)
 *  - sets the service worker's CACHE_VERSION from the combined hash, so installed PWAs drop the old cache
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATIC = path.join(__dirname, '..', 'src', 'main', 'resources', 'static');
const hashOf = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 10);

const combined = crypto.createHash('md5');
let changed = 0;

for (const page of fs.readdirSync(STATIC).filter(f => f.endsWith('.html'))) {
  const file = path.join(STATIC, page);
  const html = fs.readFileSync(file, 'utf8');
  const out = html.replace(/((?:src|href)\s*=\s*")([^"#:?]+\.(?:js|css))(?:\?[^"]*)?(")/g, (all, pre, ref, post) => {
    const target = path.join(STATIC, ref.replace(/^\//, ''));
    if (!fs.existsSync(target)) return all;
    return `${pre}${ref}?v=${hashOf(target)}${post}`;
  });
  if (out !== html) { fs.writeFileSync(file, out); changed++; }
}

for (const f of fs.readdirSync(STATIC).filter(f => /\.(js|css)$/.test(f) && f !== 'service-worker.js').sort()) {
  combined.update(f + hashOf(path.join(STATIC, f)));
}
const swFile = path.join(STATIC, 'service-worker.js');
const sw = fs.readFileSync(swFile, 'utf8');
const swOut = sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = 'justicelink-${combined.digest('hex').slice(0, 10)}';`);
if (swOut !== sw) fs.writeFileSync(swFile, swOut);

console.log(`Updated ${changed} page(s); service worker cache = ${swOut.match(/'(justicelink-[^']+)'/)[1]}`);
