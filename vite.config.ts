import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'node:fs';
import path from 'path';
import { viteSourceLocator } from '@metagptx/vite-plugin-source-locator';
import { atoms } from '@metagptx/web-sdk/plugins';
import { vitePrerenderPlugin } from 'vite-prerender-plugin';
import Sitemap from 'vite-plugin-sitemap';
import { getBlogRoutes } from './prerender/blog-routes.js';
import { getSitemapLastmod } from './prerender/blog-sitemap.js';

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// `'shadcnui'`/`'Atoms Generated Project'` were the generator's own
// placeholders and reached published metadata. `APP_CONFIG.name` is the
// single source of truth for the product name at runtime; these are its
// build-time counterparts.
process.env.VITE_APP_TITLE ??= process.env.OVERVIEW_TITLE ?? 'Atlas';
process.env.VITE_APP_DESCRIPTION ??=
  process.env.OVERVIEW_DESCRIPTION ??
  'The operating system for education businesses.';
process.env.VITE_APP_TITLE = escapeHtmlAttr(process.env.VITE_APP_TITLE);
process.env.VITE_APP_DESCRIPTION = escapeHtmlAttr(
  process.env.VITE_APP_DESCRIPTION
);
// Was hotlinked to the generator vendor's CDN; `public/favicon.svg` is
// the asset this repository actually ships.
process.env.VITE_APP_LOGO_URL ??=
  process.env.OVERVIEW_LOGO_URL ?? '/favicon.svg';

function ensureBuildOutDir() {
  let outDir = path.resolve(__dirname, 'dist');

  return {
    name: 'ensure-build-out-dir',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      fs.mkdirSync(outDir, { recursive: true });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const blogPrerenderRoutes = command === 'build' ? getBlogRoutes() : [];
  // Theme baseline fixture build (`pnpm theme-baseline:build`, Theme 1 plan
  // Phase 0) — its own output folder, so it can never overwrite `dist/`.
  // The sitemap plugin writes to a fixed folder, hence passing it too.
  const outDir = mode === 'theme-fixtures' ? 'dist-theme-fixtures' : 'dist';

  return {
    plugins: [
      /*
       * SCAFFOLD TOOLING — DEVELOPMENT ONLY.
       *
       * Both of these came from the project generator Atlas was scaffolded
       * with and are authoring aids for that generator's own editor. Until
       * now they ran for `vite build` too, and both left real traces in the
       * shipped bundle:
       *
       *   - `viteSourceLocator` stamps every element with `data-mgx-*`
       *     attributes naming the SOURCE FILE AND LINE it came from, so the
       *     production DOM published on customers' domains disclosed the
       *     internal layout of the codebase to anyone opening devtools.
       *   - `atoms()` injects a route-scanning module that logs
       *     `[routes-scanner] ...` and `postMessage`s the application's
       *     route table to `window.parent` — behaviour that makes sense
       *     inside the generator's preview iframe and none at all on a
       *     public website.
       *
       * Restricting them to `serve` keeps the authoring experience exactly
       * as it was in development while removing both from every build. They
       * are deliberately left as dependencies rather than uninstalled: the
       * dev server still uses them.
       */
      ...(command === 'serve'
        ? [
            viteSourceLocator({
              prefix: 'mgx', // Prefix used to identify source locations; do not change.
            }),
          ]
        : []),
      react(),
      ...(command === 'serve' ? [atoms()] : []),
      ensureBuildOutDir(),
      Sitemap({
        // Phase 7 — was a leftover scaffold placeholder nobody owns
        // (baked verbatim into the shipped sitemap.xml/robots.txt).
        // Overridable via env for any environment that isn't the real
        // production domain (e.g. a future staging deploy).
        hostname: process.env.VITE_SITE_URL || 'https://atlass.dpdns.org',
        outDir,
        lastmod: getSitemapLastmod(),
        readable: true,
        generateRobotsTxt: true,
      }),
      ...(blogPrerenderRoutes.length > 0
        ? vitePrerenderPlugin({
            renderTarget: '#root',
            prerenderScript: path.resolve(__dirname, 'prerender/blog.js'),
            additionalPrerenderRoutes: blogPrerenderRoutes,
          })
        : []),
    ],
    resolve: {
      // Atlas path aliases. Mirrored in tsconfig.json / tsconfig.app.json.
      // Deep relative imports ("../../../") are forbidden by the Atlas Constitution.
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@app': path.resolve(__dirname, './src/app'),
        '@tokens': path.resolve(__dirname, './src/design-system/tokens'),
        '@ui': path.resolve(__dirname, './src/design-system/ui'),
        '@motion': path.resolve(__dirname, './src/design-system/motion'),
        '@components': path.resolve(__dirname, './src/shared/components'),
        '@hooks': path.resolve(__dirname, './src/shared/hooks'),
        '@utils': path.resolve(__dirname, './src/shared/utils'),
        '@forms': path.resolve(__dirname, './src/shared/forms'),
        '@services': path.resolve(__dirname, './src/services'),
        '@api': path.resolve(__dirname, './src/services/api'),
        '@query': path.resolve(__dirname, './src/services/query'),
        '@config': path.resolve(__dirname, './src/config'),
        '@constants': path.resolve(__dirname, './src/constants'),
        '@localization': path.resolve(__dirname, './src/localization'),
        '@types': path.resolve(__dirname, './src/types'),
        '@features': path.resolve(__dirname, './src/features'),
      },
    },
    server: {
      host: '0.0.0.0', // Listen on all network interfaces.
      // 3001 by default: the API's own default port is 3000, which the
      // /api proxy below targets (override with VITE_PORT / BACKEND_PORT).
      port: parseInt(process.env.VITE_PORT || '3001'),
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.BACKEND_PORT || '3000'}`,
          changeOrigin: true,
          // Local-only: learner endpoints resolve the academy from the
          // request HOST (the frontend never sends an academy id by
          // design). Set `VITE_DEV_PROXY_HOST=<slug>.<platform domain>` to
          // have the dev proxy present that host to the backend, so the
          // learner dashboard, certificates and the Playwright journeys
          // work on localhost without a separate reverse proxy.
          ...(process.env.VITE_DEV_PROXY_HOST
            ? {
                configure: (proxy: {
                  on: (
                    event: 'proxyReq',
                    handler: (proxyReq: {
                      setHeader: (name: string, value: string) => void;
                    }) => void
                  ) => void;
                }) => {
                  // Set after `changeOrigin` has done its own rewrite, so
                  // this host is the one the backend actually sees.
                  proxy.on('proxyReq', (proxyReq) => {
                    proxyReq.setHeader(
                      'host',
                      process.env.VITE_DEV_PROXY_HOST as string
                    );
                    // The session cookie is honoured only from the host's own
                    // origin (CSRF gate on /auth/refresh and /auth/sign-out).
                    // The browser's page IS that host in this simulated
                    // topology, so present it as such. Local dev only.
                    proxyReq.setHeader(
                      'origin',
                      `http://${process.env.VITE_DEV_PROXY_HOST}`
                    );
                  });
                },
              }
            : {}),
        },
      },
      watch: { usePolling: true, interval: 600 },
    },
    build: {
      outDir,
      rollupOptions: {
        // The app's own TypeScript modules are side-effect free (the only
        // import-for-effect statements are CSS). Declaring it lets Rollup
        // drop modules a barrel re-exports but a chunk never uses, so an
        // Academy website no longer ships the dashboard code its barrels
        // reach (Reports/LCP_ROOT_CAUSE.md). Dependencies keep their own
        // package.json `sideEffects`.
        treeshake: {
          // `main.tsx` is the exception: its whole job is the side effect
          // of mounting the app.
          moduleSideEffects: (id: string) =>
            id === path.resolve(__dirname, 'src/main.tsx') ||
            !(
              id.startsWith(path.resolve(__dirname, 'src')) &&
              /\.(ts|tsx)$/.test(id)
            ),
        },
        output: {
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            // Radix primitives, the form libraries, date-fns and the icon
            // set are NOT pinned: Rollup places each where it is used, so
            // an Academy website doesn't download the dashboard's
            // components before it can paint (Reports/LCP_ROOT_CAUSE.md).
            'utils-vendor': [
              'axios',
              'clsx',
              'tailwind-merge',
              'class-variance-authority',
            ],
            'query-vendor': ['@tanstack/react-query'],
            'table-vendor': ['@tanstack/react-table'],
            'chart-vendor': ['recharts'],
            'motion-vendor': ['framer-motion'],
            'i18n-vendor': ['i18next', 'react-i18next'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
