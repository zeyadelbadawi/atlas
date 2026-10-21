/**
 * The help center's only script (deferred module). Pages are complete
 * without it; it adds:
 *   - instant search under every search box (the per-language index is
 *     fetched the first time a box is used) and the /search results page;
 *   - the `/` shortcut to the search box, arrow-key navigation of results;
 *   - the theme toggle (choice in localStorage), closing menus on Escape;
 *   - the "Was this helpful?" buttons and the cookieless beacon;
 *   - the header's "Sign in" / "Open dashboard" button (auth-cta.ts).
 */
import '../styles/docs.css';
import { searchIndex, type SearchHit, type SearchIndex } from '../search/index-build';
import { sendDocsEvent } from './beacon';
import { initAuthCta } from './auth-cta';

const THEME_KEY = 'atlas:docs-theme';
type ThemeChoice = 'light' | 'dark' | 'system';
const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';

function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(choice: ThemeChoice): void {
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-value]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.themeValue === choice));
  });
}

function initTheme(): void {
  applyTheme(readTheme());
  document.querySelectorAll<HTMLButtonElement>('[data-theme-value]').forEach((b) => {
    b.addEventListener('click', () => {
      const choice = b.dataset.themeValue as ThemeChoice;
      try {
        if (choice === 'system') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, choice);
      } catch {
        /* storage blocked: still applies to this page */
      }
      applyTheme(choice);
    });
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readTheme() === 'system') applyTheme('system');
  });
}

function initPopovers(): void {
  const popovers = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.doc-popover'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const d of popovers) {
      if (d.open) {
        d.open = false;
        d.querySelector('summary')?.focus();
      }
    }
  });
  document.addEventListener('click', (e) => {
    for (const d of popovers) if (d.open && !d.contains(e.target as Node)) d.open = false;
  });
  for (const d of popovers) {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      for (const other of popovers) if (other !== d) other.open = false;
      d.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
    });
  }
}

let indexPromise: Promise<SearchIndex | null> | null = null;
function loadIndex(): Promise<SearchIndex | null> {
  indexPromise ??= fetch(`/search-index.${lang}.json`, { credentials: 'omit' })
    .then((r) => (r.ok ? (r.json() as Promise<SearchIndex>) : null))
    .catch(() => null);
  return indexPromise;
}

const reported = new Set<string>();
function reportSearch(hits: number): void {
  const value = hits > 0 ? 'results' : 'no_results';
  if (reported.has(value)) return;
  reported.add(value);
  sendDocsEvent({ name: 'docs_search_used', value });
}

function hitElement(hit: SearchHit, id: string, tag: 'li' | 'a' = 'li'): HTMLElement {
  const item = document.createElement(tag === 'li' ? 'li' : 'div');
  item.setAttribute('role', 'option');
  item.id = id;
  const link = document.createElement('a');
  link.href = hit.url;
  link.className = 'doc-hit';
  link.tabIndex = -1;
  const title = document.createElement('span');
  title.className = 'doc-hit-title';
  title.textContent = hit.title;
  const meta = document.createElement('span');
  meta.className = 'doc-hit-meta';
  meta.textContent = hit.category;
  const summary = document.createElement('span');
  summary.className = 'doc-hit-summary';
  summary.textContent = hit.summary;
  link.append(meta, title, summary);
  item.append(link);
  return item;
}

function initSearchBox(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLInputElement>('[data-search-input]');
  const box = form.querySelector<HTMLElement>('[data-search-results]');
  if (!input || !box) return;
  let active = -1;
  let hits: SearchHit[] = [];
  let timer: number | undefined;

  const close = () => {
    box.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const setActive = (i: number) => {
    const options = Array.from(box.querySelectorAll<HTMLElement>('[role="option"]'));
    if (options.length === 0) return;
    active = (i + options.length) % options.length;
    options.forEach((o, n) => o.setAttribute('aria-selected', String(n === active)));
    input.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({ block: 'nearest' });
  };
  const run = async () => {
    const query = input.value.trim();
    if (query.length < 2) return close();
    const index = await loadIndex();
    if (!index || input.value.trim() !== query) return;
    hits = searchIndex(index, query, 6);
    box.replaceChildren();
    const list = document.createElement('ul');
    hits.forEach((hit, i) => list.append(hitElement(hit, `${input.id}-opt-${i}`)));
    if (hits.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'doc-hit-empty';
      empty.textContent = form.closest('[data-search-empty]')?.getAttribute('data-search-empty') ?? (lang === 'ar' ? 'مفيش نتايج. جرّب كلمات تانية.' : 'No results. Try other words.');
      box.append(empty);
    } else {
      const all = document.createElement('a');
      all.className = 'doc-hit-all';
      all.href = `${form.action}?q=${encodeURIComponent(query)}`;
      all.textContent = lang === 'ar' ? 'كل النتايج' : 'See all results';
      box.append(list, all);
    }
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    reportSearch(hits.length);
  };

  input.addEventListener('focus', () => void loadIndex(), { once: true });
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void run(), 90);
  });
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter' && active >= 0 && hits[active]) {
      e.preventDefault();
      window.location.href = hits[active].url;
    } else if (e.key === 'Escape') {
      close();
    }
  });
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target as Node)) close();
  });
}

function initShortcut(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-search-input]'));
    const visible = inputs.find((i) => i.offsetParent !== null);
    if (!visible) return;
    e.preventDefault();
    visible.focus();
  });
}

async function initSearchPage(): Promise<void> {
  const list = document.querySelector<HTMLOListElement>('[data-search-page-results]');
  if (!list) return;
  const query = new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  const heading = document.querySelector<HTMLElement>('[data-search-heading]');
  document.querySelectorAll<HTMLInputElement>('[data-search-input]').forEach((i) => (i.value = query));
  if (!query) return;
  if (heading?.dataset.template) heading.textContent = heading.dataset.template.replace('{q}', query);
  if (status) status.textContent = lang === 'ar' ? 'بندوّر…' : 'Searching…';
  const index = await loadIndex();
  if (!index) return;
  const hits = searchIndex(index, query, 30);
  list.replaceChildren(...hits.map((hit, i) => hitElement(hit, `page-hit-${i}`)));
  list.querySelectorAll('a').forEach((a) => a.removeAttribute('tabindex'));
  list.querySelectorAll('[role="option"]').forEach((o) => o.removeAttribute('role'));
  const n = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(hits.length);
  if (status) {
    status.textContent =
      hits.length === 0
        ? lang === 'ar'
          ? `مفيش مقالات مناسبة لـ «${query}». جرّب كلمات أقل أو مختلفة، أو ابدأ من المقالات دي:`
          : `No articles match “${query}”. Try fewer or different words, or start from one of these:`
        : lang === 'ar'
          ? `${n} نتيجة`
          : `${n} result${hits.length === 1 ? '' : 's'}`;
  }
  const popular = document.querySelector<HTMLElement>('[data-search-popular]');
  if (popular) popular.hidden = hits.length > 0;
  reportSearch(hits.length);
}

function initHelpful(): void {
  const section = document.querySelector<HTMLElement>('[data-helpful]');
  if (!section) return;
  section.querySelectorAll<HTMLButtonElement>('[data-helpful-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.helpfulAnswer === 'yes' ? 'yes' : 'no';
      sendDocsEvent({ name: 'docs_helpful', value });
      section.querySelector<HTMLElement>('[data-helpful-buttons]')?.setAttribute('hidden', '');
      const thanks = section.querySelector<HTMLElement>('[data-helpful-thanks]');
      if (thanks) {
        thanks.hidden = false;
        thanks.focus?.();
      }
    });
  });
}

function initLanguageLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[hreflang]').forEach((a) => {
    a.addEventListener('click', () => {
      const value = a.hreflang === 'ar' ? 'ar' : 'en';
      sendDocsEvent({ name: 'language_switched', value });
    });
  });
}

initTheme();
initPopovers();
initShortcut();
document.querySelectorAll<HTMLFormElement>('[data-search-form]').forEach(initSearchBox);
void initSearchPage();
initHelpful();
initLanguageLinks();
initAuthCta();
sendDocsEvent({ name: 'page_viewed' });
