#!/usr/bin/env node
/**
 * B0-OPS-04 — compares the Cloudflare edge ranges in the Caddyfile
 * (`trusted_proxies` and the `(origin_lock)` allow-list) with the lists
 * Cloudflare publishes. A range Cloudflare adds and the Caddyfile lacks
 * would make the origin lock drop real visitors routed through it, so a
 * difference exits 1 and names the ranges to add or remove.
 *
 * Read-only: fetches two public text files, changes nothing.
 * Usage: node scripts/edge/check-cloudflare-ranges.mjs [path/to/Caddyfile]
 * CLOUDFLARE_RANGES_FILE=<file> compares against a saved copy of the two
 * lists instead of fetching them (offline testing of this script).
 */
import { readFileSync } from 'node:fs';

const SOURCES = [
  'https://www.cloudflare.com/ips-v4',
  'https://www.cloudflare.com/ips-v6',
];
const file = process.argv[2] ?? 'Caddyfile';
const caddyfile = readFileSync(file, 'utf-8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

function list(label, pattern) {
  const match = caddyfile.match(pattern);
  if (!match) {
    console.error(`::error::${file}: no ${label} line found`);
    process.exit(1);
  }
  return match[1]
    .trim()
    .split(/\s+/)
    .filter((r) => r !== 'private_ranges');
}

async function fetchRanges(url) {
  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'text/plain' } });
  } catch (error) {
    console.error(
      `::error::${url} could not be fetched (${error.cause?.code ?? error.message})`
    );
    process.exit(1);
  }
  if (!response.ok) {
    console.error(`::error::${url} answered HTTP ${response.status}`);
    process.exit(1);
  }
  return response.text();
}

const texts = process.env.CLOUDFLARE_RANGES_FILE
  ? [readFileSync(process.env.CLOUDFLARE_RANGES_FILE, 'utf-8')]
  : await Promise.all(SOURCES.map(fetchRanges));
const published = texts.flatMap((text) => text.split(/\s+/).filter(Boolean));
if (
  published.length === 0 ||
  !published.every((r) => /^[0-9a-f.:]+\/\d+$/i.test(r))
) {
  console.error(
    '::error::the Cloudflare lists did not contain CIDR ranges only'
  );
  process.exit(1);
}

let drift = false;
for (const [label, pattern] of [
  ['trusted_proxies', /trusted_proxies static ([^\n]+)/],
  ['origin_lock', /not remote_ip ([^\n]+)/],
]) {
  const ours = list(label, pattern);
  const missing = published.filter((r) => !ours.includes(r));
  const extra = ours.filter((r) => !published.includes(r));
  if (missing.length || extra.length) {
    drift = true;
    console.log(`${label}: DRIFT`);
    if (missing.length)
      console.log(
        `  add (Cloudflare publishes, Caddyfile lacks): ${missing.join(' ')}`
      );
    if (extra.length)
      console.log(
        `  remove (Caddyfile has, Cloudflare no longer publishes): ${extra.join(' ')}`
      );
  } else {
    console.log(`${label}: matches Cloudflare (${ours.length} ranges)`);
  }
}
if (drift) {
  console.error(
    '::error::Cloudflare edge ranges changed; update both lists in the Caddyfile and redeploy'
  );
  process.exit(1);
}
