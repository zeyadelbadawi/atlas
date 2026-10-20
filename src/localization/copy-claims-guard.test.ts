/**
 * B0 copy guard — phrases that described behaviour the product does not
 * have. Scans every EN and AR resource file, so a claim cannot come back
 * through a different key.
 *
 * - B0-CPY-01: a learner's phone IS visible to academy owners/managers
 *   and Atlas platform administrators.
 * - B0-CPY-09 / B0-MED-01: hosted video cannot be authored, so no copy may
 *   promise uploading or protecting hosted video.
 * - B0-CPY-19: there is no learner forum, no live-session reminder email
 *   and no deadline-reminder event.
 * - B0-CPY-02/03/06/07/10/14/16/17: organization rename, invite policy,
 *   trial rule, review time, staff dialogs, who reviews academy payments,
 *   and invoices — each stated as it actually works.
 * - B0-CPY-04/05/08/11/12/18/20/22/23/24: no ineffective "Remember me", no
 *   plan-changing representative, no offline or live-installation claims
 *   on the build screen, no hosted/live/enforced/30-day overclaims, no
 *   Word attachments, one AR spelling of MB and of "custom domain", no
 *   invoices link, no legacy `billing` namespace, and the trial is never
 *   called "free" in customer-facing copy.
 * - 20 Oct 2026: Arabic copy names the product «أطلس» — no Latin "Atlas"
 *   inside any Arabic string (the unlaunched "Atlas Payments" is
 *   «أطلس للمدفوعات», as `errors.payment.collectionModeNotAvailable`
 *   already wrote it); and an academy's payment review is never
 *   described as Atlas's.
 * - 20 Oct 2026 (owner decision): Arabic billing labels say «مدفوعات
 *   الاشتراك» / «المدفوعات», never «الفواتير», while no invoices exist.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, 'resources');

function strings(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === 'string') out.push([path, value]);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      strings(child, path ? `${path}.${key}` : key, out);
    }
  }
}

function allStrings(lang: 'en' | 'ar'): [string, string][] {
  const out: [string, string][] = [];
  for (const file of readdirSync(resolve(ROOT, lang))) {
    if (!file.endsWith('.json')) continue;
    const ns = file.replace(/\.json$/, '');
    strings(
      JSON.parse(readFileSync(resolve(ROOT, lang, file), 'utf-8')),
      ns,
      out
    );
  }
  return out;
}

/** B0-CPY-11 (c) — the quiz "mode" is a preset label, not enforcement. */
const QUIZ_MODE = /^course\.quizAuthoring\.settings\.fields\.mode\./;

/** B0-CPY-24 — customer-facing namespaces where the trial must not be "free". */
const CUSTOMER_TRIAL_SCOPE =
  /^(auth|onboarding|pricing|errors|home|features)\.|^tenant\.(?!platformAdmin\.)/;

const BANNED: Record<'en' | 'ar', { pattern: RegExp; scope?: RegExp }[]> = {
  en: [
    { pattern: /only you can see it/i },
    { pattern: /academies and other users can['’]t see it/i },
    { pattern: /hosted video/i, scope: /^auth\.register\.plan\./ },
    { pattern: /upload\/choose a hosted video/i },
    {
      pattern: /discussion replies|live sessions|deadlines/i,
      scope: /^notifications\.communication\./,
    },
    { pattern: /change it later/i, scope: /^auth\.register\.organization\./ },
    { pattern: /whatever the policy says/i },
    { pattern: /once per account/i },
    { pattern: /a day or two/i, scope: /^tenant\.lifecycle\./ },
    { pattern: /brand-new Atlas account/i },
    { pattern: /reviewed by Atlas/i, scope: /^payments\.academy/ },
    { pattern: /Atlas/, scope: /^errors\.payment\.rejectedByAcademy$/ },
    { pattern: /only the academy owner/i, scope: /^payments\./ },
    { pattern: /invoices/i, scope: /^notifications\.communication\./ },
    { pattern: /receipts/i, scope: /^learning\.learnerDashboard\.purchases\./ },
    { pattern: /remember me/i, scope: /^auth\.signIn\./ },
    // B0-MSG-07: announcements are in-app only; the email category must not promise them.
    {
      pattern: /announcements/i,
      scope: /^notifications\.communication\.categories\.engagement\.title/,
    },
    { pattern: /Atlas representative/i },
    { pattern: /connection drops|installing/i, scope: /^onboarding\.build\./ },
    { pattern: /live classes/i, scope: /^academy\.protection\./ },
    { pattern: /hosted video file/i, scope: /^course\./ },
    { pattern: /^Enforced:/, scope: QUIZ_MODE },
    { pattern: /destroyed after 30 days|permanently removed after 30 days/i },
    { pattern: /Atlas stores and delivers/i },
    { pattern: /Word or image/i },
    { pattern: /invoices/i, scope: /^payments\.overview\./ },
    {
      pattern:
        /free trial|get started free|^start free|try .* free|days? free\b/i,
      scope: CUSTOMER_TRIAL_SCOPE,
    },
  ],
  ar: [
    { pattern: /لا يراه أحد غيرك/ },
    { pattern: /لا تراه الأكاديميات/ },
    { pattern: /المستضافة/, scope: /^auth\.register\.plan\./ },
    { pattern: /فيديو مستضافًا/ },
    {
      pattern: /النقاشات|الجلسات المباشرة/,
      scope: /^notifications\.communication\./,
    },
    { pattern: /تغييره لاحق/, scope: /^auth\.register\.organization\./ },
    { pattern: /مهما كانت السياسة/ },
    { pattern: /مرة واحدة لكل حساب/ },
    { pattern: /يومًا أو يومين/, scope: /^tenant\.lifecycle\./ },
    { pattern: /حساب أطلس جديدًا/ },
    { pattern: /تراجع أطلس/, scope: /^payments\.academy/ },
    { pattern: /مالك الأكاديمية فقط/, scope: /^payments\./ },
    { pattern: /الفواتير/, scope: /^notifications\.communication\./ },
    { pattern: /إيصالاتك/, scope: /^learning\.learnerDashboard\.purchases\./ },
    { pattern: /ممثل أطلس/ },
    {
      pattern: /الإعلانات/,
      scope: /^notifications\.communication\.categories\.engagement\.title/,
    },
    { pattern: /انقطاع الاتصال|جارٍ تثبيت/, scope: /^onboarding\.build\./ },
    {
      pattern: /الجلسات المباشرة/,
      scope: /^academy\.protection\.content\.watermark\./,
    },
    { pattern: /مُطبَّق:/, scope: QUIZ_MODE },
    { pattern: /بعد 30 يومًا/, scope: /^media\./ },
    { pattern: /تخزّن (Atlas|أطلس) الفيديو/ },
    { pattern: /Atlas/ },
    { pattern: /أطلس/, scope: /^errors\.payment\.rejectedByAcademy$/ },
    { pattern: /Word أو صورة/ },
    { pattern: /ميغابايت/ },
    { pattern: /نطاق خاص/ },
    // No invoice is ever issued, so no Arabic string may promise one. The
    // only exemption is the dormant Invoices page's own copy
    // (`payments.invoices.*`), which no route renders (the old path
    // redirects to the payment history) and which waits for a real
    // invoice feature.
    { pattern: /فاتور|فواتير/, scope: /^(?!payments\.invoices\.)/ },
    {
      pattern:
        /تجربة مجانية|التجربة المجانية|تجربتك المجانية|التجارب المجانية|تجريبية مجانية|ابدأ مجانًا|جرّب .*مجانًا|أيام مجانًا/,
      scope: CUSTOMER_TRIAL_SCOPE,
    },
  ],
};

describe('legacy namespaces (B0-CPY-23)', () => {
  it.each(['en', 'ar'])('has no billing namespace in %s', (lang) => {
    expect(readdirSync(resolve(ROOT, lang))).not.toContain('billing.json');
  });
});

describe.each(['en', 'ar'] as const)('copy claims guard (%s)', (lang) => {
  const all = allStrings(lang);

  it('has resource strings to check', () => {
    expect(all.length).toBeGreaterThan(1000);
  });

  it.each(BANNED[lang].map((rule) => [String(rule.pattern), rule] as const))(
    'no string matches %s',
    (_label, rule) => {
      const hits = all
        .filter(([key]) => !rule.scope || rule.scope.test(key))
        .filter(([, text]) => rule.pattern.test(text))
        .map(([key]) => key);
      expect(hits).toEqual([]);
    }
  );
});
