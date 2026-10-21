/*
 * DL-63 — the dashboard's boot screen.
 *
 * Shown on the dashboard host only, from the first paint until the app has
 * checked the session (the app removes it: src/app/boot/boot-splash.ts). It
 * says what is about to open: the dashboard when the base-domain
 * `atlas_signed_in` hint is present, otherwise the sign-in (or sign-up)
 * page. The hint is never trusted for anything else; the app decides with
 * the real session. A plain external script (the CSP allows no inline
 * script); academy websites never show it.
 */
(function () {
  'use strict';
  var el = document.getElementById('atlas-boot-splash');
  if (!el) return;
  var appHost = '';
  try {
    appHost = new URL(el.getAttribute('data-app-url') || '').hostname.toLowerCase();
  } catch (e) {
    return;
  }
  if (!appHost || window.location.hostname.toLowerCase() !== appHost) return;

  function readStored(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return raw;
      }
    } catch (e) {
      return null;
    }
  }

  var query = null;
  try {
    query = new URLSearchParams(window.location.search).get('lang');
  } catch (e) {
    query = null;
  }
  var stored = readStored('atlas:language');
  var browser = (navigator.language || '').slice(0, 2).toLowerCase();
  var lang =
    query === 'ar' || query === 'en'
      ? query
      : stored === 'ar' || stored === 'en'
        ? stored
        : browser === 'ar'
          ? 'ar'
          : 'en';

  var signedIn = document.cookie.split(';').some(function (part) {
    return part.trim() === 'atlas_signed_in=1';
  });
  var path = window.location.pathname;
  var kind;
  if (/^\/auth\/(register|sign-up)(\/|$)/.test(path)) kind = 'register';
  else if (/^\/auth\/sign-in(\/|$)/.test(path) || path === '/auth' || path === '/auth/')
    kind = 'signin';
  else if (/^\/auth\//.test(path)) kind = 'wait';
  else kind = signedIn ? 'dashboard' : 'signin';

  var copy = {
    en: {
      dashboard: 'Opening your dashboard…',
      signin: 'Opening the sign-in page…',
      register: 'Opening the sign-up page…',
      wait: 'One moment…',
      title: 'Atlas Dashboard',
    },
    ar: {
      dashboard: 'بنفتحلك لوحة التحكم…',
      signin: 'بنفتحلك صفحة الدخول…',
      register: 'بنفتحلك صفحة التسجيل…',
      wait: 'لحظة واحدة…',
      title: 'لوحة تحكم أطلس',
    },
  };

  var theme = readStored('atlas:theme');
  var dark =
    theme === 'dark' ||
    (theme !== 'light' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // The tab says what this is from the first paint (the app keeps it).
  document.title = copy[lang].title;
  var text = el.querySelector('[data-splash-text]');
  if (text) text.textContent = copy[lang][kind];
  el.setAttribute('lang', lang);
  el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  if (dark) el.setAttribute('data-dark', '');
  el.hidden = false;

  // Never trap anyone behind it: gone after 15 s whatever happens.
  window.setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 15000);
})();
