/**
 * Loads every article and screenshot manifest from `content/docs/` at build
 * time (Vite `import.meta.glob`, so the prerender bundle carries the text and
 * no file system access is needed at render time).
 */
import { DOC_LANGS, type DocArticle, type DocLang, type DocShot } from '../types';
import { parseArticle } from './parse';

const MARKDOWN = import.meta.glob('/content/docs/{en,ar}/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const MANIFESTS = import.meta.glob('/content/docs/media/{en,ar}/manifest.json', {
  import: 'default',
  eager: true,
}) as Record<string, Record<string, Omit<DocShot, 'key'>>>;

const SHOT_SPECS = import.meta.glob('/content/docs/shots/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function loadArticles(files: Record<string, string> = MARKDOWN): DocArticle[] {
  return Object.entries(files)
    .map(([path, raw]) => parseArticle(path.replace(/^\//, ''), raw))
    .sort((a, b) => a.source.localeCompare(b.source));
}

export function loadShots(
  manifests: Record<string, Record<string, Omit<DocShot, 'key'>>> = MANIFESTS,
): Record<DocLang, Map<string, DocShot>> {
  const result = Object.fromEntries(DOC_LANGS.map((lang) => [lang, new Map<string, DocShot>()])) as Record<
    DocLang,
    Map<string, DocShot>
  >;
  for (const [path, manifest] of Object.entries(manifests)) {
    const lang = /media\/(en|ar)\/manifest\.json$/.exec(path)?.[1] as DocLang | undefined;
    if (!lang) continue;
    for (const [key, entry] of Object.entries(manifest)) {
      const files = [...entry.files].sort((a, b) => a.width - b.width);
      result[lang].set(key, { key, width: entry.width, height: entry.height, files });
    }
  }
  return result;
}

/** Raw shot spec files (`content/docs/shots/<category>.yaml`), for the validator. */
export function loadShotSpecs(): Record<string, string> {
  return SHOT_SPECS;
}

/** Every published screenshot file, relative to `content/docs/` (`media/en/…webp`). */
export function shotFiles(shots: Record<DocLang, Map<string, DocShot>>): string[] {
  const files = new Set<string>();
  for (const lang of DOC_LANGS) for (const shot of shots[lang].values()) for (const f of shot.files) files.add(f.src);
  return [...files].sort();
}
