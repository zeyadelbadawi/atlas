# Visual briefs: social templates and rules

> PREPARED ONLY. These are design specs. No image is generated, uploaded or published by this kit.
> Brand gate: **the name and logo may not be used publicly (social avatars and covers included) until RV-08 / B0-OC-25 is cleared** (OD-02). Until then, templates are built and kept internal.
> Logo files: `/home/user/atlas/public/brand/` (`atlas-mark-color.svg`, `atlas-mark.svg`, `atlas-logo-ar-light.svg`, `atlas-logo-ar-dark.svg`, `atlas-logo-en-light.svg`, `atlas-logo-en-dark.svg`, `atlas-app-icon.svg`). Link-preview images: `/home/user/atlas/public/marketing-assets/og/og-ar.jpg`, `og-en.jpg` (1200×630; contain the logo, same RV-08 gate).

## 1. Colour
| Token | Hex | Use | Contrast (measured, WCAG) |
|---|---|---|---|
| Royal navy (primary) | `#1B3A8C` | Main background for hook cards and covers; icons and headings on light | White on navy **10.34:1** · navy on off-white **9.73:1** |
| Gold (accent) | `#E0A526` | One accent per image: an underline, a ring around a control, a number, a progress mark | Gold on navy **4.72:1** (ok for large text ≥ 24 px bold and graphics) · **gold on off-white 2.06:1: never use gold for text on light backgrounds** · ink on gold 7.89:1 (ok for a gold pill with dark text) |
| Ink | `#0E1A33` | Body text on light backgrounds | 16.27:1 on off-white |
| Off-white | `#F6F8FC` | Light background (tinted; pure white is never a background) | — |
| Pale navy | `#EEF2FA` | Text on the dark background; light-mode wordmark area | 16.67:1 on night |
| Night | `#0A1222` | Dark variant background (matches the site's dark theme colour) | Gold on night 8.53:1 |
| Muted text | `#5B6478` | Footnotes, secondary lines on light | 5.58:1 on off-white |

Rules: navy carries the brand; gold is used sparingly (one element per image); no gradients, glows, glass effects or gradient meshes (SPEC A.7 anti-patterns); no red for "not yet" items (use muted grey and a minus icon); never pure black or pure white backgrounds.

## 2. Typography
| Role | Font | Weights | Use |
|---|---|---|---|
| Display | **Readex Pro** (Arabic + Latin) | 600–700 for hooks, 500 for slide titles | Hooks, covers, plan names, numbers |
| Body | **Rubik** (Arabic + Latin) | 400 body, 500 labels, 700 captions on video | Slide body, footnotes, «محتوى تجريبي» tag, burned-in captions |

- Arabic line height 1.5 for headings (the site uses `rtl:leading-[1.5]`), 1.6 for body. No letter-spacing on Arabic.
- Sizes on a 1080-wide canvas: hook 72–96 px, slide title 56–64 px, body 36–44 px, footnote/disclosure **at least 26 px** (disclosures are never fine print).
- Max 3 lines for a hook, max 45 Arabic words on a text slide.
- Digits in Arabic copy are Arabic-Indic (١٤، ١٬١٩٠). Keep Latin brand names (InstaPay, WE Pay, IG) on one line; never break them across lines.
- No other fonts. Academy theme fonts (Alexandria, IBM Plex Sans Arabic, Markazi) belong to academy sites, not to Atlas marketing.

## 3. Logo use
- **Lockups:** Arabic posts use the Arabic lockup (`atlas-logo-ar-light.svg` on light, `-dark.svg` on navy/night). English posts use the EN lockup. The mark alone (`atlas-mark-color.svg`) for avatars and small spaces.
- **Clear space:** on all sides, at least the width of one of the mark's vertical strokes × 4, or 25 % of the mark's height, whichever is larger. Nothing inside that zone.
- **Minimum size on a 1080 canvas:** mark 48 px high; full lockup 220 px wide.
- **Position:** bottom of the image, on the reading-end side (bottom-left in Arabic layouts, bottom-right in English), 64 px from the edges. On reels: only on the end card.
- **Don't:** recolour outside navy / pale navy / white, stretch, outline, add shadows, place on a photo without a solid panel, or put the logo on screenshots.
- **Rename-ready:** keep the logo on its own layer in every template file so a name change swaps one asset.

## 4. RTL layout rules (Arabic posts)
1. Reading starts at the right. Hooks and titles are right-aligned; numbered steps run right to left; the "start" column of two-column cards is on the right.
2. Icons that point (arrows, chevrons) are mirrored. Icons that don't point (wallet, check, clock) are not.
3. Carousel swipe cue: a small left-pointing arrow on the left edge of slides 1–(n−1) (platforms advance by swiping left regardless of language).
4. **Never mirror screenshots or UI.** Use the Arabic capture for Arabic posts (SPEC D.1: EN and AR are captured separately).
5. Progress bars fill from right to left in Arabic templates.
6. Mixed text: keep a Latin term at the start or end of a line where possible so the bidi order stays readable; check every slide on a real phone before approval.

## 5. Screenshot framing (all screenshot use)
- **Source:** only released captures (`[SS-nnn]` tags in INDEX §6) from the demo academy on the local capture stack; AG-5 checklist + owner spot-check before use. Never production, never edited inside the UI, never mocked.
- **«محتوى تجريبي» tag on every screenshot and every screen recording:** a pill in the top-start corner (top-right on Arabic layouts), navy `#1B3A8C` with white Rubik Medium 26 px text, 16 px padding, never covered by other elements. English assets: "Demo content". The caption or alt text repeats it.
- **Frame:** a neutral device frame (plain rounded rectangle, no manufacturer marks), 24 px padding, corner radius ~14 px, no heavy drop shadow.
- **Crop to the action:** one control or one list per slide, readable at thumbnail size. Zoom rather than shrink text.
- **Annotation:** at most one gold ring or one gold arrow per screenshot. No hand-drawn scribbles.
- **Never in frame:** the lesson player overlay (SS-011/012), devices pages and dialogs (SS-013/014), the custom-domain tab (SS-020), text lessons, upload screens, live sessions, the academy blog, the Google sign-in button, integrity settings, revenue charts, admin/staff roles, real names, phone numbers or emails (demo emails are masked), any review, rating, testimonial or student count.
- **Demo receipts** say «إيصال تجريبي — Demo receipt» and don't imitate any wallet's app.

## 6. Templates
| ID | Name | Size | Layout | Used by |
|---|---|---|---|---|
| VT-01 | Hook card | 1080×1350 (4:5) | Hook top-right (3 lines max), optional one-line answer, simple drawn icon or one screenshot, logo bottom-left | P01, P02, P06, P08, P13–P15, P17, P21, P22, P24–P31, P33 |
| VT-02 | Carousel cover | 1080×1350 | Navy background, title 80–96 px, subline 40 px, swipe cue left edge | All carousel slide 1 |
| VT-03 | Screenshot slide | 1080×1350 | Device frame centred in the top 70 %, caption (max 2 lines) in the bottom 30 %, «محتوى تجريبي» pill top-right | P04, P05, P07, P09, P12, P16, P20 |
| VT-04 | Text slide | 1080×1350 | Off-white; slide title + up to 4 lines, numbered gold circle or icon on the right | Carousel interiors |
| VT-05 | Two-column fit card | 1080×1350 | Right column "مناسب ليك لو" (navy checks), left column "لسه مش مناسب لو" (grey minus), equal weight | P11, P32 slides |
| VT-06 | Plan card | 1080×1350 | Three equal columns, no badge, no highlighted column; plan name, price, two key limits; footer «الأسعار بالجنيه المصري» | P18, P19, R10 end card |
| VT-07 | Square feed variant | 1080×1080 | Same as VT-01 with tighter text; for Facebook link posts and LinkedIn | L01–L06 images, FB alt |
| VT-08 | Reel cover / end card | 1080×1920 | Title inside the central 720×1200 safe area; end card navy with one CTA line | R01–R14 |
| VT-09 | Story / WhatsApp Status | 1080×1920 | Hook in the central safe area; keep the top 250 px and bottom 340 px clear of text | WS01–WS10, Stories |

## 7. Profile images (owner uploads after RV-08; none uploaded by this kit)
| Asset | Size | Content |
|---|---|---|
| Avatar (Facebook, Instagram, TikTok, YouTube, WhatsApp, LinkedIn) | 1024×1024 master (from `atlas-app-icon.svg`), circle-safe | Mark only, navy background |
| Facebook cover | 1640×624 | Navy; Arabic line «أكاديميتك أونلاين، باسمك» in the centre third; keep both bottom corners clear (profile photo overlaps on some layouts) |
| YouTube banner | 2560×1440, text inside the central 1546×423 | Same line, AR, with the EN line smaller under it |
| LinkedIn company cover | 1128×191 | EN line "Branded online academies for teachers and teaching teams in Egypt" |
| LinkedIn personal (founder) | 1584×396 | Same EN line, text on the right half (the photo covers the left) |
| Pinned "highlight" covers (Instagram) | 1080×1920 | Icons only: الدفع · الموقع · الفريق · الأسئلة · الأسعار |

## 8. Video look (reels)
- Talking head: natural light or a warm desk lamp; plain wall; phone at eye level; lapel mic. No studio gloss.
- Screen recordings at 60 fps, cursor visible and slow; zoom on the control being used; «محتوى تجريبي» pill on screen for the whole recording.
- Captions: Rubik Bold 56–64 px, white with a dark outline, key word gold, max 2 lines, inside the safe area.
- End card: VT-08 navy, one CTA line, logo (after RV-08).

## 9. Approval checks for every visual
- [ ] Only claims from the post's claim list appear in the image.
- [ ] «محتوى تجريبي» visible on every screenshot/recording.
- [ ] Disclosure lines (D-1, D-2) at ≥ 26 px where the post needs them.
- [ ] No gold text on light backgrounds; contrast pairs from §1 only.
- [ ] Arabic right-aligned; no mirrored UI; digits Arabic-Indic.
- [ ] Logo only if RV-08 cleared; clear space respected.
- [ ] Alt text written (≤ 125 characters, Arabic, describes the screen and says «محتوى تجريبي» where relevant).
