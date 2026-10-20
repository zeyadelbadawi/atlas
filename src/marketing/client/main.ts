/**
 * The marketing site's only client script (deferred module). Every page is
 * complete static HTML without it; this adds:
 *   - the light / dark / system theme toggle (choice kept in localStorage);
 *   - closing the header <details> menus on Escape and outside clicks;
 *   - the header hairline after scrolling;
 *   - a live refresh of catalog prices (a failed refresh keeps the
 *     build-time values: SPEC §C);
 *   - the contact form (`POST /api/v1/public/contact`);
 *   - the cookieless marketing beacon (`client/beacon.ts`, DL-51).
 */
import '../styles/marketing.css';
import { startBeacon } from './beacon';
import { CONTACT_LIMITS, validateContact, type ContactField } from './contact-validation';

const THEME_KEY = 'atlas:marketing-theme';
type ThemeChoice = 'light' | 'dark' | 'system';

function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(choice: ThemeChoice): void {
  const dark =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-value]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeValue === choice));
  });
}

function initTheme(): void {
  applyTheme(readTheme());
  document.querySelectorAll<HTMLButtonElement>('[data-theme-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.themeValue as ThemeChoice;
      try {
        if (choice === 'system') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, choice);
      } catch {
        // Storage blocked: the choice still applies to this page.
      }
      applyTheme(choice);
    });
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readTheme() === 'system') applyTheme('system');
  });
}

function initMenus(): void {
  const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.mk-menu'));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menus.forEach((menu) => {
      if (!menu.open) return;
      menu.open = false;
      menu.querySelector('summary')?.focus();
    });
  });
  document.addEventListener('click', (event) => {
    menus.forEach((menu) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    });
  });
  // The drawer covers the page: lock scroll behind it.
  document.querySelectorAll<HTMLDetailsElement>('[data-drawer]').forEach((drawer) => {
    drawer.addEventListener('toggle', () => {
      document.documentElement.style.overflow = drawer.open ? 'hidden' : '';
    });
  });
}

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const update = () => header.setAttribute('data-scrolled', String(window.scrollY > 8));
  update();
  window.addEventListener('scroll', update, { passive: true });
}

interface CatalogPlan {
  key: string;
  pricing?: { amount?: number; yearlyAmount?: number; currency?: string };
}

function initPricing(): void {
  const prices = document.querySelectorAll<HTMLElement>('[data-plan] [data-price]');
  if (prices.length === 0) return;
  const locale = document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
  fetch('/api/v1/public/plans', { headers: { Accept: 'application/json' }, credentials: 'omit' })
    .then((response) => (response.ok ? (response.json() as Promise<unknown>) : Promise.reject()))
    .then((data) => {
      if (!Array.isArray(data)) return;
      const byKey = new Map((data as CatalogPlan[]).map((plan) => [plan.key, plan]));
      prices.forEach((element) => {
        const key = element.closest<HTMLElement>('[data-plan]')?.dataset.plan;
        const plan = key ? byKey.get(key) : undefined;
        const field = element.dataset.price === 'yearly' ? 'yearlyAmount' : 'amount';
        const amount = plan?.pricing?.[field];
        const currency = plan?.pricing?.currency;
        if (typeof amount !== 'number' || !currency) return;
        if (String(amount) === element.dataset.amount && currency === element.dataset.currency) return;
        element.textContent = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
        element.dataset.amount = String(amount);
        element.dataset.currency = currency;
      });
    })
    .catch(() => {
      // Keep the build-time catalog values.
    });
}

function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('form[data-contact-form]');
  if (!form) return;
  const startedAt = Date.now();
  const params = new URLSearchParams(window.location.search);
  const topicSelect = form.elements.namedItem('topic') as HTMLSelectElement | null;
  const presetTopic = params.get('topic');
  if (topicSelect && presetTopic && Array.from(topicSelect.options).some((o) => o.value === presetTopic)) {
    topicSelect.value = presetTopic;
  }
  const messages = form.dataset;
  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const success = document.querySelector<HTMLElement>('[data-contact-success]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const fieldEl = (name: ContactField) =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;

  const clearErrors = () => {
    form.querySelectorAll<HTMLElement>('[data-field-error]').forEach((el) => {
      el.textContent = '';
      el.hidden = true;
    });
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (summary) summary.hidden = true;
  };

  const showErrors = (errors: Partial<Record<ContactField, string>>) => {
    const entries = Object.entries(errors) as [ContactField, string][];
    const list = summary?.querySelector('ul');
    if (list) list.replaceChildren();
    entries.forEach(([name, code]) => {
      const input = fieldEl(name);
      const text = messages[`err${code}`] ?? messages.errGeneric ?? '';
      const holder = form.querySelector<HTMLElement>(`[data-field-error="${name}"]`);
      if (holder) {
        holder.textContent = text;
        holder.hidden = false;
      }
      input?.setAttribute('aria-invalid', 'true');
      if (list && input) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${input.id}`;
        link.textContent = text;
        item.append(link);
        list.append(item);
      }
    });
    if (summary && entries.length > 0) {
      summary.hidden = false;
      summary.focus();
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();
    const value = (name: string) =>
      ((form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '').trim();
    const payload = {
      name: value('name'),
      email: value('email'),
      organizationName: value('organizationName') || undefined,
      topic: value('topic') || 'sales',
      message: value('message'),
    };
    const errors = validateContact(payload);
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }
    const company = value('company');
    const sourcePath = /^\/[A-Za-z0-9\-._~/]*$/.test(window.location.pathname)
      ? window.location.pathname.slice(0, 512)
      : undefined;
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
    }
    if (status) status.textContent = messages.sending ?? '';
    fetch('/api/v1/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        ...payload,
        locale: document.documentElement.lang === 'ar' ? 'ar' : 'en',
        sourcePath,
        startedAt,
        ...(company ? { company } : {}),
      }),
    })
      .then((response) => {
        if (response.status === 429) throw new Error('rate');
        if (!response.ok) throw new Error('failed');
        form.hidden = true;
        document.dispatchEvent(new CustomEvent('mkt:contact-submitted'));
        if (success) {
          success.hidden = false;
          success.focus();
        }
      })
      .catch((error: unknown) => {
        if (status) {
          status.textContent =
            error instanceof Error && error.message === 'rate'
              ? (messages.rateLimited ?? '')
              : (messages.sendFailed ?? '');
        }
      })
      .finally(() => {
        if (submit) {
          submit.disabled = false;
          submit.removeAttribute('aria-busy');
        }
      });
  });

  // Live limits on the message box (the server is the authority).
  const message = fieldEl('message');
  if (message) message.maxLength = CONTACT_LIMITS.messageMax;
}

initTheme();
initMenus();
initHeader();
initPricing();
initContactForm();
startBeacon();
