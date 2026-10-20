/**
 * The help center's two Vite builds (DL-57), run by `pnpm build:docs`:
 *
 *   vite build -c vite.docs.config.ts
 *     The client bundle (`src/docs/client/main.ts` + its stylesheet), hashed
 *     into `dist/docs/assets/` with its manifest at
 *     `dist/docs/.vite/docs-manifest.json` (removed by the prerender script,
 *     never published).
 *
 *   vite build -c vite.docs.config.ts --ssr src/docs/prerender/entry.tsx
 *     The prerender bundle, into `dist-docs-ssr/`; imported by
 *     `scripts/docs/prerender.mjs`, which writes the pages into `dist/docs/`.
 *
 * `dist/docs/` is served by Caddy from /srv-docs on docs.<base> only; it
 * shares nothing with /srv (the app) or /srv-marketing.
 */
import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { ATLAS_ALIASES } from './vite.config';

export const DOCS_CLIENT_ENTRY = 'src/docs/client/main.ts';
export const DOCS_MANIFEST = '.vite/docs-manifest.json';
export const DOCS_OUT_DIR = 'dist/docs';
export const DOCS_SSR_OUT_DIR = 'dist-docs-ssr';

export default defineConfig(({ isSsrBuild }) => {
  const ssr = isSsrBuild === true;
  return {
    publicDir: false,
    resolve: { alias: ATLAS_ALIASES },
    css: {
      postcss: {
        plugins: [
          tailwindcss({ config: path.resolve(__dirname, 'tailwind.docs.config.ts') }),
          autoprefixer(),
        ],
      },
    },
    build: ssr
      ? {
          outDir: DOCS_SSR_OUT_DIR,
          emptyOutDir: true,
          ssrEmitAssets: false,
          copyPublicDir: false,
          rollupOptions: { output: { entryFileNames: 'entry.js' } },
        }
      : {
          outDir: DOCS_OUT_DIR,
          emptyOutDir: true,
          copyPublicDir: false,
          manifest: DOCS_MANIFEST,
          cssMinify: 'esbuild',
          assetsInlineLimit: 0,
          rollupOptions: {
            input: { docs: path.resolve(__dirname, DOCS_CLIENT_ENTRY) },
            output: {
              entryFileNames: 'assets/docs-[hash].js',
              chunkFileNames: 'assets/docs-[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]',
            },
          },
        },
  };
});
