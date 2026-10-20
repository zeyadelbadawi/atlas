/**
 * The static marketing site's two Vite builds (B1 / M1a, DL-50). Both run
 * after the app build, from `pnpm build` (see package.json):
 *
 *   vite build -c vite.marketing.config.ts
 *     The client bundle: `src/marketing/client/main.ts` and the stylesheet
 *     it imports, hashed into `dist/assets/` (immutable at the edge, like
 *     the app's chunks), with its own manifest at
 *     `dist/.vite/marketing-manifest.json` — the app's
 *     `dist/.vite/manifest.json` (read by the academy renderer) is untouched.
 *
 *   vite build -c vite.marketing.config.ts --ssr src/marketing/prerender/entry.tsx
 *     The prerender bundle, into `dist-marketing-ssr/`; imported by
 *     `scripts/marketing/prerender.mjs`, which writes `dist/marketing/`.
 *     Assets a page imports (images) are emitted there and copied into
 *     `dist/assets/` by the script.
 */
import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { ATLAS_ALIASES } from './vite.config';

export const MARKETING_CLIENT_ENTRY = 'src/marketing/client/main.ts';
export const MARKETING_MANIFEST = '.vite/marketing-manifest.json';
export const MARKETING_SSR_OUT_DIR = 'dist-marketing-ssr';

export default defineConfig(({ isSsrBuild }) => {
  const ssr = isSsrBuild === true;
  return {
    // The app's `public/` is copied by the app build; never twice.
    publicDir: false,
    resolve: { alias: ATLAS_ALIASES },
    css: {
      postcss: {
        plugins: [
          tailwindcss({
            config: path.resolve(__dirname, 'tailwind.marketing.config.ts'),
          }),
          autoprefixer(),
        ],
      },
    },
    build: ssr
      ? {
          outDir: MARKETING_SSR_OUT_DIR,
          emptyOutDir: true,
          ssrEmitAssets: true,
          copyPublicDir: false,
          rollupOptions: {
            output: {
              entryFileNames: 'entry.js',
              assetFileNames: 'assets/[name]-[hash][extname]',
            },
          },
        }
      : {
          outDir: 'dist',
          // The app build has just written dist/; add to it.
          emptyOutDir: false,
          copyPublicDir: false,
          manifest: MARKETING_MANIFEST,
          cssMinify: 'esbuild',
          // Below 4 KB Vite would inline fonts as data: URLs; keep files.
          assetsInlineLimit: 0,
          rollupOptions: {
            input: {
              marketing: path.resolve(__dirname, MARKETING_CLIENT_ENTRY),
            },
            output: {
              entryFileNames: 'assets/marketing-[hash].js',
              chunkFileNames: 'assets/marketing-[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]',
            },
          },
        },
  };
});
