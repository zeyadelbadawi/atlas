// Renders the demo images (academy logo, course covers, a fake payment
// receipt, a certificate signature) with Chromium into seed/.generated/.
// Everything drawn here is invented; receipts say "DEMO RECEIPT".
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ASSETS, ATLAS_DIR } from './lib.mjs';

const FONTS = path.join(ATLAS_DIR, 'src/assets/fonts');
const CHROME = process.env.DOCS_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const css = `
@font-face{font-family:Readex;src:url(file://${FONTS}/readex-pro-arabic.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF;font-weight:160 700}
@font-face{font-family:Readex;src:url(file://${FONTS}/readex-pro-latin.woff2) format('woff2');font-weight:160 700}
*{margin:0;box-sizing:border-box} body{font-family:Readex,sans-serif}`;

export async function renderAssets({ force = false } = {}) {
  if (!force && existsSync(path.join(ASSETS, 'receipt-instapay.png'))) return;
  const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });
  const shot = async (name, w, h, body, { transparent = false, type } = {}) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(
      `<html><head><style>${css} html,body{width:${w}px;height:${h}px;${transparent ? 'background:transparent' : ''}}</style></head><body>${body}</body></html>`
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(ASSETS, name),
      omitBackground: transparent,
      ...(type === 'jpeg' ? { type: 'jpeg', quality: 82 } : {}),
    });
    await page.close();
  };

  // Logo: a navy rounded square with a rising sun over an open book; no words.
  const logo = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
   <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B3A8C"/><stop offset="1" stop-color="#0f1f4d"/></linearGradient></defs>
   <rect x="4" y="4" width="112" height="112" rx="28" fill="url(#g)"/>
   <g stroke="#f5b83d" stroke-width="5" stroke-linecap="round"><line x1="60" y1="18" x2="60" y2="28"/><line x1="33" y1="29" x2="39" y2="36"/><line x1="87" y1="29" x2="81" y2="36"/></g>
   <path d="M38 62 a22 22 0 0 1 44 0 z" fill="#f5b83d"/>
   <path d="M24 66 C40 60 52 62 60 70 C68 62 80 60 96 66 L96 94 C80 88 68 90 60 98 C52 90 40 88 24 94 Z" fill="#fff"/>
   <path d="M60 70 L60 98" stroke="#1B3A8C" stroke-width="3"/></svg>`;
  const center = (s, inner) => `<div style="display:grid;place-items:center;width:${s}px;height:${s}px">${inner}</div>`;
  await shot('logo.png', 512, 512, center(512, logo(512)), { transparent: true });
  await shot('favicon.png', 128, 128, center(128, logo(128)), { transparent: true });
  await shot('logo-kids.png', 512, 512, center(512, logo(512).replaceAll('#1B3A8C', '#0f766e').replaceAll('#0f1f4d', '#134e4a')), { transparent: true });

  // Course covers: wordless subject motifs.
  const covers = {
    'cover-calculus.jpg': ['#1B3A8C', '#0b1a45', `<text x="80" y="300" font-size="250" fill="#f5b83d" font-family="serif" font-style="italic">∫</text><text x="230" y="260" font-size="90" fill="#fff" font-family="serif" font-style="italic">f(x) dx</text><path d="M120 430 C 300 120, 480 520, 720 200 S 1050 300, 1180 140" stroke="#93c5fd" stroke-width="10" fill="none"/>`],
    'cover-study.jpg': ['#0f766e', '#053b37', `<rect x="380" y="130" width="520" height="460" rx="30" fill="#fff"/><g stroke="#0f766e" stroke-width="16" stroke-linecap="round" fill="none"><path d="M450 240 l40 40 l80 -80"/><path d="M450 380 l40 40 l80 -80"/><path d="M450 520 l40 40 l80 -80"/></g><g fill="#99f6e4"><rect x="620" y="215" width="220" height="30" rx="15"/><rect x="620" y="355" width="220" height="30" rx="15"/><rect x="620" y="495" width="160" height="30" rx="15"/></g>`],
    'cover-physics.jpg': ['#4338ca', '#1e1b4b', `<circle cx="640" cy="360" r="70" fill="#f5b83d"/><ellipse cx="640" cy="360" rx="300" ry="110" stroke="#c7d2fe" stroke-width="8" fill="none"/><ellipse cx="640" cy="360" rx="300" ry="110" stroke="#c7d2fe" stroke-width="8" fill="none" transform="rotate(60 640 360)"/><ellipse cx="640" cy="360" rx="300" ry="110" stroke="#c7d2fe" stroke-width="8" fill="none" transform="rotate(-60 640 360)"/>`],
    'cover-english.jpg': ['#9a3412', '#431407', `<text x="140" y="420" font-size="300" fill="#fff" font-weight="700">Aa</text><rect x="760" y="210" width="380" height="40" rx="20" fill="#fdba74"/><rect x="760" y="290" width="300" height="40" rx="20" fill="#fed7aa"/><rect x="760" y="370" width="340" height="40" rx="20" fill="#fdba74"/>`],
  };
  for (const [name, [a, b, art]] of Object.entries(covers)) {
    const dots = Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 137) % 1280}" cy="${(i * 251) % 720}" r="${6 + (i % 5) * 4}"/>`).join('');
    await shot(
      name,
      1280,
      720,
      `<div style="width:1280px;height:720px;background:linear-gradient(135deg,${a},${b})"><svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><g opacity="0.08" fill="#fff">${dots}</g>${art}</svg></div>`,
      { type: 'jpeg' }
    );
  }

  // Fake payment receipts (generic: no real bank or app branding).
  const receipt = (title, amount, rows, accent) => `<div style="width:720px;height:1080px;background:#f1f5f9;display:grid;place-items:center;direction:rtl">
   <div style="width:620px;background:#fff;border-radius:28px;box-shadow:0 10px 40px rgba(0,0,0,.08);padding:44px 40px">
    <div style="width:96px;height:96px;border-radius:50%;background:${accent};display:grid;place-items:center;margin:0 auto 18px"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5L19 7"/></svg></div>
    <div style="text-align:center;font-size:30px;font-weight:600;color:#0f172a">${title}</div>
    <div style="text-align:center;font-size:20px;color:#64748b;margin:6px 0 26px">Transfer completed · تمت العملية بنجاح</div>
    <div style="text-align:center;font-size:56px;font-weight:700;color:#0f172a;margin-bottom:30px">EGP ${amount}</div>
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:16px 0;border-top:1px solid #e2e8f0;font-size:22px"><span style="color:#64748b">${k}</span><span style="color:#0f172a;font-weight:500;direction:ltr">${v}</span></div>`).join('')}
    <div style="margin-top:26px;text-align:center;font-size:18px;color:#b91c1c;font-weight:600">DEMO RECEIPT — not a real transfer · إيصال تجريبي</div>
   </div></div>`;
  await shot('receipt-instapay.png', 720, 1080, receipt('تحويل لحظي InstaPay', '850.00', [['إلى', 'nour.academy@instapay'], ['من', 'Demo Learner'], ['رقم العملية', 'DEMO-IPN-0001'], ['التاريخ', '18/10/2026 · 21:14']], '#7c3aed'));
  await shot('receipt-bank.png', 720, 1080, receipt('تحويل بنكي', '450.00', [['إلى الحساب', '0000 1111 2222 3333'], ['المستفيد', 'Al-Nour Academy (demo)'], ['المرجع', 'DEMO-TRX-0002'], ['التاريخ', '19/10/2026 · 10:02']], '#1B3A8C'));
  await shot('receipt-wallet.png', 720, 1080, receipt('تحويل محفظة', '850.00', [['إلى الرقم', '010 0000 0009'], ['من الرقم', '010 0000 0104'], ['رقم العملية', 'DEMO-W-0003'], ['التاريخ', '20/10/2026 · 08:47']], '#dc2626'));
  await shot('signature.png', 600, 200, `<svg width="600" height="200" xmlns="http://www.w3.org/2000/svg"><path d="M40 140 C 90 40, 130 40, 150 120 S 230 170, 260 90 S 330 40, 360 120 S 470 150, 560 70" stroke="#0f1f4d" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`, { transparent: true });
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await renderAssets({ force: true });
  console.log('assets rendered into', ASSETS);
}
