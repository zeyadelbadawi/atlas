// Seeds the Help Center demo dataset into the LOCAL stack, through the real
// HTTP API (direct SQL only where the API cannot express a fact; each such
// place says why). Idempotent per step: ids land in seed/state.json and a
// re-run skips what already exists. Run on a freshly reset database:
//
//   scripts/docs/stack/reset-db.sh && scripts/docs/stack/start-backend.sh
//   pnpm docs:seed                    # all steps
//   pnpm docs:seed -- --only 04       # one step (by number prefix)
//   pnpm docs:seed -- --from 05       # this step and the ones after it
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { HERE, API, call, state, save } from './lib.mjs';
import { renderAssets } from './assets.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt('--only');
const from = opt('--from');

const up = await call('GET', '/public/plans', { ok: false }).catch((e) => ({ status: 0, json: String(e) }));
if (up.status !== 200) {
  console.error(`The docs API is not answering at ${API} (start it with scripts/docs/stack/start-backend.sh).`);
  process.exit(1);
}

await renderAssets();
const steps = readdirSync(path.join(HERE, 'steps'))
  .filter((f) => /^\d\d-.*\.mjs$/.test(f))
  .sort()
  .filter((f) => (!only || f.startsWith(only)) && (!from || f >= from));

for (const file of steps) {
  console.log(`▶ ${file}`);
  const started = Date.now();
  const mod = await import(path.join(HERE, 'steps', file));
  await mod.default();
  state.seededSteps = { ...(state.seededSteps ?? {}), [file.slice(0, 2)]: new Date().toISOString() };
  save();
  console.log(`  ✓ ${file} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
console.log('seed complete →', path.join(HERE, 'state.json'));
