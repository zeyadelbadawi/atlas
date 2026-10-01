#!/usr/bin/env node
/**
 * Public website renderer — memory under load (H3, the `ssr` service's
 * memory limit in the backend repo's deploy/docker-compose.prod.yml).
 *
 * Runs the PRODUCTION renderer (`server/ssr/server.mjs` and the built
 * bundles) in the production base image (`node:20-alpine`) as a container,
 * against a mock public API that serves the theme baseline's rich Academy,
 * and reads the container's cgroup `memory.peak` (cgroup v2, as on the VPS)
 * after each scenario:
 *
 *   idle      started, one page rendered
 *   tenants   60 Academies × 6 pages × EN/AR (720 distinct pages, more than
 *             the 500-entry cache), concurrency 16, twice (misses, then hits)
 *   legacy    the same with every Academy carrying a ~99 KB inline logo
 *             (production's active Academies), so the byte cap is what
 *             bounds the cache
 *   oversized production's 3.4 MB inline logo and 1.9 MB inline section
 *             image, concurrency 16 — every page passes on the HTML budget
 *
 *   VITE_PLATFORM_BASE_DOMAIN=atlass.dpdns.org pnpm build && pnpm build:ssr
 *   node tools/ssr-memory/measure.mjs [--memory 512m] [--concurrency 16]
 *
 * With `--memory` the container runs under that limit (and the
 * NODE_OPTIONS the compose file sets), and the run fails if it was
 * OOM-killed or restarted.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildLiveData } from '../../e2e/theme-baseline/fixtures/live-data.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { values: args } = parseArgs({
  options: {
    memory: { type: 'string' },
    'node-options': { type: 'string' },
    concurrency: { type: 'string', default: '16' },
    image: { type: 'string', default: 'node:20-alpine' },
  },
});
const CONCURRENCY = Number(args.concurrency);
const BACKEND_PORT = 4590;
const SSR_PORT = 4591;
const BASE = 'atlass.dpdns.org';
const CONTAINER = 'atlas-ssr-measure';
const TEMPLATE = JSON.parse(
  readFileSync(
    join(ROOT, 'e2e/theme-baseline/fixtures/generated/modern-education.json'),
    'utf8'
  )
);

const inlineImage = (bytes) =>
  `data:image/png;base64,iVBORw0KGgo${'A'.repeat(Math.max(0, bytes - 33))}`;

const academies = new Map(); // host -> academy
function addAcademy(index, { logo, heroImage } = {}) {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const host = `a${index}.${BASE}`;
  const rebase = (value) =>
    JSON.parse(JSON.stringify(value).replaceAll('"fx-academy"', `"${id}"`));
  let pages = rebase(TEMPLATE.pages).filter((page) => page.visible);
  if (heroImage) {
    pages = pages.map((page) =>
      page.coreType === 'home'
        ? {
            ...page,
            sections: page.sections.map((section) =>
              section.type === 'hero'
                ? {
                    ...section,
                    config: { ...section.config, image: heroImage },
                  }
                : section
            ),
          }
        : page
    );
  }
  const brand = TEMPLATE.configuration.brand;
  academies.set(host, {
    id,
    resolve: {
      academyId: id,
      academyName: `Academy ${index}`,
      academySlug: `a${index}`,
      ...(logo ? { academyLogo: logo } : {}),
      presentation: { themeKey: 'modern-education', brand },
    },
    configuration: {
      ...rebase(TEMPLATE.configuration),
      status: 'published',
      publishedAt: '2026-09-01T09:00:00.000Z',
    },
    pages,
    live: buildLiveData(id, 'rich'),
  });
  return host;
}

function route(url) {
  const notFound = [404, { kind: 'notFound', status: 404 }];
  const segments = url.pathname
    .replace(/^\/api\/v1\/public\/websites\/?/, '')
    .split('/')
    .filter(Boolean);
  if (segments[0] === 'resolve') {
    const found = academies.get(url.searchParams.get('hostname'));
    return found ? [200, found.resolve] : notFound;
  }
  const target = [...academies.values()].find((a) => a.id === segments[0]);
  if (!target) return notFound;
  const [, resource, id, sub] = segments;
  const { live } = target;
  const page = (items) => ({
    items: items.slice(0, 12),
    pagination: {
      page: 1,
      pageSize: 12,
      totalItems: items.length,
      totalPages: 1,
    },
  });
  switch (resource) {
    case undefined:
      return [200, target.configuration];
    case 'pages':
      return [200, target.pages];
    case 'identity':
      return [200, live.identity];
    case 'statistics':
      return [200, live.statistics];
    case 'categories':
      return [200, live.categories];
    case 'courses': {
      if (!id) return [200, page(live.courses)];
      const course = live.courses.find((c) => c.id === id);
      if (!course) return notFound;
      if (!sub) return [200, course];
      if (sub === 'curriculum') return [200, live.curriculum];
      if (sub === 'reviews')
        return [200, page(live.reviews.filter((r) => r.courseId === id))];
      if (sub === 'rating')
        return [
          200,
          {
            courseId: id,
            averageRating: 4.5,
            totalReviews: 2,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
          },
        ];
      if (sub === 'recommendations')
        return [200, live.courses.filter((c) => c.id !== id).slice(0, 3)];
      return notFound;
    }
    default:
      return notFound;
  }
}

const backend = createServer((req, res) => {
  const [status, body] = route(new URL(req.url, 'http://backend'));
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

const docker = (...argv) =>
  execFileSync('docker', argv, { encoding: 'utf8' }).trim();
// cgroup v2 (the VPS) or v1, whichever the host runs.
const readCgroup = (v2, v1) =>
  docker(
    'exec',
    CONTAINER,
    'sh',
    '-c',
    `cat /sys/fs/cgroup/${v2} 2>/dev/null || cat /sys/fs/cgroup/memory/${v1}`
  );
const cgroup = (name) =>
  Number(
    name === 'memory.peak'
      ? readCgroup('memory.peak', 'memory.max_usage_in_bytes')
      : readCgroup('memory.current', 'memory.usage_in_bytes')
  );
const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

async function waitHealthy() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${SSR_PORT}/__ssr/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error('renderer did not start');
}

const tally = {};
async function load(hosts, paths) {
  const jobs = [];
  for (const host of hosts)
    for (const path of paths)
      for (const locale of ['', '/ar'])
        jobs.push([
          host,
          locale ? `${locale}${path === '/' ? '/' : path}` : path,
        ]);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const [host, path] = jobs[next++];
      // http.request, not fetch: fetch ignores a Host header.
      const kind = await new Promise((done, fail) => {
        request(
          { host: '127.0.0.1', port: SSR_PORT, path, headers: { Host: host } },
          (res) => {
            res.resume();
            res.on('end', () =>
              done(res.headers['x-atlas-ssr'] ?? String(res.statusCode))
            );
          }
        )
          .on('error', fail)
          .end();
      });
      tally[kind] = (tally[kind] ?? 0) + 1;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

const PAGES = [
  '/',
  '/courses',
  '/courses/fx-course-1',
  '/about',
  '/faqs',
  '/contact',
];

async function main() {
  await new Promise((done) => backend.listen(BACKEND_PORT, '127.0.0.1', done));
  try {
    docker('rm', '-f', CONTAINER);
  } catch {}
  const runArgs = [
    'run',
    '-d',
    '--name',
    CONTAINER,
    '--network',
    'host',
    '--init',
    '-v',
    `${ROOT}:${ROOT}:ro`,
    '-w',
    ROOT,
    '--user',
    'node',
    '--read-only',
    '-e',
    'NODE_ENV=production',
    '-e',
    `SSR_PORT=${SSR_PORT}`,
    '-e',
    `SSR_API_ORIGIN=http://127.0.0.1:${BACKEND_PORT}`,
  ];
  if (args.memory)
    runArgs.push('--memory', args.memory, '--memory-swap', args.memory);
  if (args['node-options'])
    runArgs.push('-e', `NODE_OPTIONS=${args['node-options']}`);
  runArgs.push(args.image, 'node', 'server/ssr/server.mjs');
  docker(...runArgs);
  const results = [];
  const record = (scenario) => {
    results.push({
      scenario,
      peak: cgroup('memory.peak'),
      current: cgroup('memory.current'),
    });
    console.error(`  ${scenario} done`);
  };
  try {
    await waitHealthy();
    const first = addAcademy(0);
    await load([first], ['/']);
    record('idle');

    const tenants = Array.from({ length: 60 }, (_, i) => addAcademy(i + 1));
    await load(tenants, PAGES);
    await load(tenants, PAGES);
    record('tenants');

    const legacy = Array.from({ length: 60 }, (_, i) =>
      addAcademy(100 + i, { logo: inlineImage(100 * 1024 - 1) })
    );
    await load(legacy, PAGES);
    await load(legacy, PAGES);
    record('legacy');

    const oversized = [
      ...Array.from({ length: 8 }, (_, i) =>
        addAcademy(200 + i, { logo: inlineImage(3_473_306) })
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        addAcademy(300 + i, { heroImage: inlineImage(1_938_534) })
      ),
    ];
    await load(oversized, PAGES);
    record('oversized');

    const state = JSON.parse(
      docker('inspect', '--format', '{{json .State}}', CONTAINER)
    );
    const events = Number(
      readCgroup('memory.events', 'memory.oom_control')
        .split('\n')
        .find((line) => line.startsWith('oom_kill '))
        ?.split(' ')[1] ?? 0
    );
    console.log(
      `image ${args.image}, concurrency ${CONCURRENCY}, limit ${args.memory ?? 'none'}, NODE_OPTIONS ${args['node-options'] ?? '(none)'}`
    );
    for (const r of results)
      console.log(
        `${r.scenario.padEnd(10)} peak ${mib(r.peak).padStart(10)}  current ${mib(r.current).padStart(10)}`
      );
    console.log('responses', JSON.stringify(tally));
    console.log(
      `oom_kill events ${events}, restarts ${state.RestartCount}, running ${state.Running}`
    );
    if (events > 0 || !state.Running) process.exitCode = 1;
  } catch (error) {
    let logs = '';
    try {
      logs = docker('logs', '--tail', '15', CONTAINER);
    } catch {}
    const oom = (() => {
      try {
        return docker(
          'inspect',
          '--format',
          '{{.State.OOMKilled}} exit={{.State.ExitCode}}',
          CONTAINER
        );
      } catch {
        return '?';
      }
    })();
    console.log(
      `FAILED after: ${results.map((r) => r.scenario).join(', ') || '(start)'}; OOMKilled ${oom}`
    );
    console.log(
      logs
        .split('\n')
        .filter((l) => !l.startsWith('{'))
        .join('\n')
    );
    process.exitCode = 1;
  } finally {
    try {
      docker('rm', '-f', CONTAINER);
    } catch {}
    backend.close();
  }
}

main().catch((error) => {
  console.error(error);
  try {
    console.error(docker('logs', '--tail', '20', CONTAINER));
    docker('rm', '-f', CONTAINER);
  } catch {}
  process.exit(1);
});
