/**
 * Modern Education (Theme 1) asset manifest — the §E.2 A matrix.
 *
 * The art direction, crops, focal points, alt text and budgets are fixed
 * here, and the generation prompt is built from them
 * (`buildThemeAssetPrompt`). `home-hero` was released as the Phase 3 pilot
 * and the other eleven at the Phase 8 final image stage (plan §V). An entry
 * that isn't released renders its section's designed no-image state.
 *
 * Alt text is checked against the chosen image when an entry is released.
 *
 * Releasing an entry (plan §E.3 steps 5–7): run
 * `tools/theme-assets/prepare.mjs`, commit the derivatives under
 * `public/theme-assets/modern-education/<version>/`, then set `status`,
 * `version`, `lqip` and `provenance` here. Released folders are immutable.
 */
import type { ThemeAssetManifest } from '../theme-asset.types';

const HERO_BUDGET = 180_000;
const DEFAULT_BUDGET = 120_000;
const W_4_3 = [480, 800, 1200, 1600];
const W_SMALL_TILE = [400, 800, 1200];

const T1_THEME_CARD_LICENSE_BASIS =
  "Owner's explicit request (5 Oct 2026) for a Magnific-generated feature image for each theme in the dashboard's Theme tab, through Atlas's paid Magnific Premium+ subscription active at generation";

export const MODERN_EDUCATION_ASSETS: ThemeAssetManifest = {
  theme: 'modern-education',
  artDirection:
    'Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay.',
  exclusions:
    'No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
  formats: ['avif', 'webp'],
  assets: [
    {
      key: 'home-hero',
      purpose: 'Home › Hero (first impression, LCP image)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: [480, 800, 1200, 1600],
      // y 76%: keeps the face and the writing hands in the 16:10 and 4:3 crops.
      focal: { x: 0.46, y: 0.76 },
      alt: {
        en: 'A learner writing in a notebook beside a laptop at a bright table',
        ar: 'متعلّمة تكتب في دفتر بجوار حاسوب محمول على طاولة مضيئة',
      },
      direction:
        'An adult learner absorbed in study at a bright table, laptop and open notebook, warm window light from the side, calm and optimistic mood. Subject in the lower-left two thirds; clean empty space in the top-right quarter for an overlaid badge. Vertical 4:5 framing that still works cropped to 16:10 and 4:3 around the face and hands.',
      composition: {
        slot: 'Home › Hero, the image column of the 55/45 split (brand shape behind it; live course-count chip floating over its top corner at the logical end)',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~560px' },
          { breakpoint: 'tablet', ratio: '16:10', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'Face and writing hands inside y 0.39–0.87 and the central 80% of the width, so the 16:10 and 4:3 crops (object-position 46% 76%) keep both.',
        exclusion:
          'The top 22% band stays calm across the full width: the course-count chip sits in its end corner — top-right in English, top-left in Arabic.',
        rtl: 'Layout mirrors (image column on the left in Arabic, chip at the top-left); the photograph is not mirrored.',
      },
      priority: true,
      budgetBytes: HERO_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAACwBQCdASoYAB4APulkqk2pJaQiMBgMASAdCWUAxkBWSNkrO6IVDCBaD+4C0MaK4zbAkkJUQ7IA/vJnQhBPEh1c8wY0ujW0yOYE/t1o4YRYrzPZYueH18Pihb7tCduw+Y/rrg3Cy1COpWi+uCpeWqNW4qb0eVrMJ8zsq9Lf2F0z+QQ4AAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'An adult learner absorbed in study at a bright table, laptop and open notebook, warm window light from the side, calm and optimistic mood. Subject in the lower-left two thirds; clean empty space in the top-right quarter for an overlaid badge. Vertical 4:5 framing that still works cropped to 16:10 and 4:3 around the face and hands. Framing: 4:5 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 959207,
        jobId: 'VXHCpx2MMU',
        generatedAt: '2026-09-29T15:09:20Z',
        reviewer:
          'Claude Code — plan §E.3 step 4 checklist and in-context review (plan §P.6); candidate 2 of 4 (1 and 4 rejected for a laptop logo)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '13fdeb521975b45bc657db8202bf954502cb4ca06915fc758fbfb0f8eaa28d30',
      },
    },
    {
      key: 'home-benefit',
      purpose: 'Home › Why us (feature split)',
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_4_3,
      focal: { x: 0.5, y: 0.45 },
      alt: {
        en: 'A mentor guiding a learner at a shared screen',
        ar: 'مرشد يوجّه متعلّمة أمام شاشة مشتركة',
      },
      direction:
        'A mentor guiding a learner side by side at a shared laptop, screen content blurred and angled away, genuine encouragement and interaction, both faces visible in three-quarter view, bright modern room. Both people and the laptop centred in the frame with calm margins on every side; both people turned toward each other and the screen, never out of the frame.',
      composition: {
        slot: 'Home › Why us (featureSplit), image column at the logical start; brand-soft shape offset behind its bottom-start corner, outside the photo',
        crops: [
          { breakpoint: 'desktop', ratio: '4:3', width: '~600px' },
          { breakpoint: 'tablet', ratio: '4:3', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'Both faces and the shared screen inside the central 76% of the width and 80% of the height; nothing important within 8% of any edge (20px rounded corners).',
        exclusion:
          'None over the photo; text sits beside it (desktop/tablet) or below it (mobile).',
        rtl: 'The image column moves to the right in Arabic; the photograph is not mirrored, so neither person may face out of the frame.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAACwBACdASoYABIAPu1mq06ppaQiKA1RMB2JZQC7AA3xCnLgNtIyf7yCivN/ZI4AAP7tz5Vr6dbDSiyKRHWz7gGDIaJl1MmedJiggWljsRdLljDPfEPTxfTNNEZbBwgWgFUEDoaAcgqeOKhO2bGzq85XMr+oCnAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:3',
        prompt:
          'A mentor guiding a learner side by side at a shared laptop, screen content blurred and angled away, genuine encouragement and interaction, both faces visible in three-quarter view, bright modern room. Both people and the laptop centred in the frame with calm margins on every side; both people turned toward each other and the screen, never out of the frame. Framing: 4:3 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260911,
        jobId: '1lRooN7r4r',
        generatedAt: '2026-09-30T14:54:45Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 2 of 4 (1: subjects small and off-centre; 3: a recognisable all-in-one desktop; 4: a readable foreground screen)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '071e5d824f4e163dd307e6434a5622fa618c231d65a6d64ac7269228cec92f93',
      },
    },
    {
      key: 'home-cta',
      purpose: 'Home › Final call to action (ink band)',
      ratio: '3:4',
      master: { width: 1500, height: 2000 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.35 },
      alt: {
        en: 'A smiling learner holding a notebook',
        ar: 'متعلّم مبتسم يحمل دفترًا',
      },
      direction:
        'A smiling adult learner holding a closed notebook against the chest, waist-up portrait, subject centred, lit with a soft key light against a plain deep charcoal studio background that falls off to near-black at the left, right and bottom edges, with no gradient colour cast, so it blends into a dark band without a cut-out.',
      composition: {
        slot: "Home › Final CTA ink band, photo at the band's logical end, bottom-aligned so the subject rises from the band's lower edge",
        crops: [
          { breakpoint: 'desktop', ratio: '3:4', width: '~320px' },
          { breakpoint: 'tablet', ratio: '3:4', width: '~280px' },
          {
            breakpoint: 'mobile',
            ratio: 'hidden',
            width: 'hidden under 480px (shown at 3:4 ~260px from 480–767px)',
          },
        ],
        safeArea:
          'Head and notebook inside the central 60% of the width and the top 75% of the height.',
        exclusion:
          'Left and right 15% and the bottom edge: plain near-black background, so the photo blends into the ink band on either side (LTR and RTL placements).',
        rtl: "The photo moves to the band's left in Arabic; the photograph is not mirrored.",
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAADwBACdASoYACAAPu1qrVCppaQiqAqpMB2JZQDMHBEdunUbMTv2Hl+7/wiCfZEwuAAA/u6M1EdE2c9boNDeecOQWtBNl5CMpS2w9c0Ps5Uj3ZJZWwjibJX//iPFbbbAU2gHjpoSMEHeAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:4',
        prompt:
          'A smiling adult learner holding a closed notebook against the chest, waist-up portrait, subject centred, lit with a soft key light against a plain deep charcoal studio background that falls off to near-black at the left, right and bottom edges, with no gradient colour cast, so it blends into a dark band without a cut-out. Framing: 3:4 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260921,
        jobId: 'xS2II2mjfW',
        generatedAt: '2026-09-30T14:54:47Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 2 of 4 (1: blue colour cast in the background; 3 and 4 usable — 2 chosen for the darkest, plainest edges among the portraits and the cast balance)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          'bdbb8756d54c78a09fa7512c81f578866b0d05973b1fc62ded0c2027a120a936',
      },
    },
    {
      key: 'courses-launching',
      purpose: 'Home › Featured courses empty state',
      ratio: '16:9',
      master: { width: 2400, height: 1350 },
      widths: [640, 1024, 1600],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'An open notebook, pen, coffee and a closed laptop on a desk',
        ar: 'دفتر مفتوح وقلم وقهوة وحاسوب محمول مغلق على مكتب',
      },
      direction:
        'Overhead flat lay on a light wooden desk: an open blank notebook, a pen, a cup of coffee and a closed laptop with no logo, soft natural shadows, a sense of getting ready to start. Centred arrangement kept within the middle 60% of the width, with generous empty margins on every side.',
      composition: {
        slot: "Home › Featured courses empty state: the illustration above the panel's heading and next step",
        // Re-frozen from the implemented slot (§E.6 step 8): 16:9 from
        // 1280px up, ~5:3 at 1024, ~6:5 on tablet, 16:9 on phones.
        crops: [
          {
            breakpoint: 'desktop',
            ratio: '16:9',
            width: '~540px (~5:3 at 1024px)',
          },
          { breakpoint: 'tablet', ratio: '6:5', width: '~360px' },
          { breakpoint: 'mobile', ratio: '16:9', width: '100vw' },
        ],
        safeArea:
          'The whole arrangement inside the central 60% of the width (the 6:5 tablet crop keeps 67%) and 76% of the height.',
        exclusion: "None over the photo; the panel's text sits below it.",
        rtl: 'Unchanged in Arabic (centred); the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAACQAwCdASoYAA0APu1kqU2ppaQiMAgBMB2JYwCdACG5/ucdme4AAP60xYH2Ja5NWnRmlZqq2p2+vUsZ4dEmGRJ/Lk/4FT2ZCJQAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'Overhead flat lay on a light wooden desk: an open blank notebook, a pen, a cup of coffee and a closed laptop with no logo, soft natural shadows, a sense of getting ready to start. Centred arrangement kept within the middle 60% of the width, with generous empty margins on every side. Framing: 16:9 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260930,
        jobId: 'rgZ88n4xtc',
        generatedAt: '2026-09-30T14:54:50Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 1 of 4 (2 and 3: hands and an arrangement wider than the safe area; 4: a mark on the laptop lid)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '4c6ad28bfe5c29c202ae1fcbdc9a201efa53fed0784af75855466d9617cf9f21',
      },
    },
    {
      key: 'about-header',
      purpose: 'About › Page header band',
      ratio: '21:9',
      master: { width: 2800, height: 1200 },
      widths: [800, 1280, 1920, 2560],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A small group in discussion in a bright classroom',
        ar: 'مجموعة صغيرة تتناقش في قاعة دراسية مضيئة',
      },
      direction:
        'A wide, bright workshop or classroom with a small group of adults mid-discussion around a table, shallow depth of field. The group sits in the centre third of the frame; the outer thirds are soft, uncluttered room with windows and light.',
      composition: {
        slot: 'About › Page header: a full-bleed band directly under the page title (the title is never set on the photo)',
        crops: [
          { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'The group inside the central third of the width (the 4:3 phone crop keeps only the centre) and the middle 70% of the height.',
        exclusion:
          'None: text never overlays this photo, so it stays readable for every brand colour.',
        rtl: 'Unchanged in Arabic (full-bleed, centred); the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAAAQBACdASoYAAoAPu1iqU2ppaOiMAgBMB2JYwCdMoACfXjd4+bBtFQWAAD+ylxRuL7jngU9TwGmsFVePOXM3xZVlyObuIe1tCdPr0gmcx6N8f2SY7zMY8c3RvkHfxatMKpjkAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 21:9',
        prompt:
          'A wide, bright workshop or classroom with a small group of adults mid-discussion around a table, shallow depth of field. The group sits in the centre third of the frame; the outer thirds are soft, uncluttered room with windows and light. Framing: 21:9 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260941,
        jobId: 'Xm1iiwTBfo',
        generatedAt: '2026-09-30T14:54:53Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 2 of 4 (1: group across the whole width; 4: a visible seam; 3 usable, faces turned away)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '0fd90352a027c8ccb8083a88a2c1318697b15f7e5233175bbbac60a737c040e6',
      },
    },
    {
      key: 'about-story',
      purpose: 'About › Story split',
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_4_3,
      focal: { x: 0.5, y: 0.45 },
      alt: {
        en: 'A small team planning together at a whiteboard',
        ar: 'فريق صغير يخطط معًا أمام سبورة بيضاء',
      },
      direction:
        'A small team of three adults planning together at a whiteboard covered in abstract shapes and sticky notes with no legible writing, collaborative energy, natural office light. The group centred with calm margins on every side.',
      composition: {
        slot: 'About › Our story (featureSplit), image column at the logical start',
        crops: [
          { breakpoint: 'desktop', ratio: '4:3', width: '~600px' },
          { breakpoint: 'tablet', ratio: '4:3', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'The team and whiteboard inside the central 76% of the width and 80% of the height; nothing important within 8% of any edge.',
        exclusion: 'None over the photo; text sits beside or below it.',
        rtl: 'The image column moves to the right in Arabic; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAADwBACdASoYABIAPu1mqU2ppaQiMAgBMB2JYwDI1BuTFoW1m+cf6Py02et7VL0mnIAA/mvK60Zeo1PIBJYLim7DO1vyXNGfrBVGb2QazZOHyFHYe3bXpN+Agrr9kWjBilkUm218OgT8MZyoXTnW2lCf9rDOAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:3',
        prompt:
          'A small team of three adults planning together at a whiteboard covered in abstract shapes and sticky notes with no legible writing, collaborative energy, natural office light. The group centred with calm margins on every side. Framing: 4:3 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260950,
        jobId: '1lRoopMr4r',
        generatedAt: '2026-09-30T14:54:56Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 1 of 4 (2 and 4: a person cut at the frame edge; 3 usable, group off-centre)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '2c5bdcba3101dee2fb9e4768bcd5d36277c5a5fdf28131659a69627c3124d72e',
      },
    },
    {
      key: 'gallery-1',
      purpose: 'About › Gallery (large tile)',
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_4_3,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Learners working together in a hands-on workshop',
        ar: 'متعلّمون يعملون معًا في ورشة تطبيقية',
      },
      direction:
        'A group workshop with a hands-on activity at a shared table, several adults leaning in, materials and tools without branding. The action gathered in the centre of the frame; the outer edges, including the top and bottom, quiet.',
      composition: {
        slot: 'About › Gallery bento: the large tile, top-start',
        // Re-frozen from the implemented slot (§E.6 step 8): the tile is
        // landscape, 1.36–1.75 wide on desktop depending on the viewport.
        crops: [
          { breakpoint: 'desktop', ratio: '7:4', width: '~720px (4:3 to 7:4)' },
          { breakpoint: 'tablet', ratio: '7:5', width: '~475px' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'The activity and faces inside the central 75% of the width and the middle 72% of the height (the 7:4 crop keeps 76% of the height).',
        exclusion: 'None.',
        rtl: 'The bento mirrors (the large tile moves to the top-right); the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAADQBACdASoYABIAPu1qrVCppaQiqAqpMB2JZQCo9A0meKQfQr9cabo6Mfkkrt1VAAD+01XfU+CUzSpx8Q1FinQ/H0sdm5Ktjf+reEQIKKlVrLeWi/3w2wkSM6g7AT4FK5WjJj56nA03B8L8aYvCRFe2L0x22fZqYAAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:3',
        prompt:
          'A group workshop with a hands-on activity at a shared table, several adults leaning in, materials and tools without branding. The action gathered in the centre of the frame; the outer edges, including the top and bottom, quiet. Framing: 4:3 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260961,
        jobId: 'p85999Lehw',
        generatedAt: '2026-09-30T14:54:59Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 2 of 4 (1, 3 and 4: people pressed to the frame edges)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          'e8ec6d56599472ac108483404ba243cba7ebd90092c58b70d9f1f8d5ad88a8ca',
      },
    },
    {
      key: 'gallery-2',
      purpose: 'About › Gallery (wide tile)',
      // Re-frozen (§E.6 step 8): the tile renders 2.8–3.65 wide, so a 4:3
      // master would keep barely a third of its height. 21:9 balances the
      // panoramic desktop crop against the 4:3 phone crop.
      ratio: '21:9',
      master: { width: 2800, height: 1200 },
      widths: [640, 1024, 1600],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A learner on a video call at home',
        ar: 'متعلّمة في مكالمة فيديو من المنزل',
      },
      direction:
        'An adult learner at home on a video call, laptop screen blurred and angled away, relaxed and engaged, cosy living-room light. Panoramic framing: the learner, face and hands in the centre of the frame and in its middle band, with calm room on the left and right.',
      composition: {
        slot: 'About › Gallery bento: the wide strip, bottom-start',
        crops: [
          {
            breakpoint: 'desktop',
            ratio: '3:1',
            width: '~720px (2.8:1 to 3.65:1)',
          },
          { breakpoint: 'tablet', ratio: '3:1', width: '~475px' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          "The learner's face and hands inside the central 55% of the width (the 4:3 phone crop keeps 57%) and the middle 60% of the height (the widest crop keeps 64%).",
        exclusion: 'None.',
        rtl: 'The bento mirrors; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmgAAABXRUJQVlA4IFwAAADwAwCdASoYAAoAPu1kqk4ppaQiMAgBMB2JQBOmUABp+LhVtK5VuEx4AOJ+e72+TdnBpAunnU55MFfIjcK/jH3562PQIQANv9VOPHkKdir/JHltsPcTvlcxWMAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 21:9',
        prompt:
          'An adult learner at home on a video call, laptop screen blurred and angled away, relaxed and engaged, cosy living-room light. Panoramic framing: the learner, face and hands in the centre of the frame and in its middle band, with calm room on the left and right. Framing: 21:9 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260970,
        jobId: 'tCsAYEtmZJ',
        generatedAt: '2026-09-30T14:57:12Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 1 of 4 (2: a laptop logo; 3: a readable foreground screen; 4: a second laptop in the foreground)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '25000f7e1c04b92b734bbb6389d8ab9e0b17c8f5838c84e5de3c0bee0aed2ebb',
      },
    },
    {
      key: 'gallery-3',
      purpose: 'About › Gallery (square)',
      // Re-frozen (§E.6 step 8): landscape tiles (1.37–1.78) on tablet and
      // desktop, square only in the three-up phone row. A 4:3 master keeps
      // ≥ 75% of either side in every crop; a square one lost 44% of the
      // height on desktop.
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_SMALL_TILE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Hands writing notes in a notebook',
        ar: 'يدان تكتبان ملاحظات في دفتر',
      },
      direction:
        'Close-up of hands writing notes in a notebook with a pen, handwriting abstract and illegible, soft side light. Hands centred in the frame.',
      composition: {
        slot: 'About › Gallery bento: a small tile',
        crops: [
          {
            breakpoint: 'desktop',
            ratio: '7:4',
            width: '~352px (1.37:1 to 1.78:1)',
          },
          { breakpoint: 'tablet', ratio: '7:5', width: '~230px' },
          {
            breakpoint: 'mobile',
            ratio: '1:1',
            width: '~30vw (three in a row)',
          },
        ],
        safeArea:
          'Hands and notebook inside the central 70% of the width and the middle 72% of the height, so both the 7:4 and the square crops keep them.',
        exclusion: 'None.',
        rtl: 'The bento mirrors; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAADQBACdASoYABIAPu1qrVCppaQiqAqpMB2JZwDE2AaxRedyL+Yshg6bf1T2L2GOaAD+6xc+t2ErE5lNu5dFdsoloTTXzx/1JnNUjHCp8TzH3Anqf5WARV/XB3iqhGR9k1QmmEk9wQLJB2ELQ2aG6dkkp7n4cGfQgBHQRWAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:3',
        prompt:
          'Close-up of hands writing notes in a notebook with a pen, handwriting abstract and illegible, soft side light. Hands centred in the frame. Framing: 4:3 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260983,
        jobId: 'O6MF5ntynm',
        generatedAt: '2026-09-30T14:57:16Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 4 of 4 (2 and 3: handwriting that reads as words; 1: two people’s hands, cluttered)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '11ff2390b61ff2698862f25c995426a5dfb92959f3d4e59fc22d4caa797d7157',
      },
    },
    {
      key: 'gallery-4',
      purpose: 'About › Gallery (square)',
      // Re-frozen (§E.6 step 8): landscape tiles (1.37–1.78) on tablet and
      // desktop, square only in the three-up phone row. A 4:3 master keeps
      // ≥ 75% of either side in every crop; a square one lost 44% of the
      // height on desktop.
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_SMALL_TILE,
      focal: { x: 0.5, y: 0.45 },
      alt: {
        en: 'A learner with headphones using a tablet in a café',
        ar: 'متعلّمة تضع سماعات وتستخدم جهازًا لوحيًا في مقهى',
      },
      direction:
        'An adult learner with headphones using a tablet in a quiet café, screen not visible, focused and content, window light. Learner centred in the frame.',
      composition: {
        slot: 'About › Gallery bento: a small tile',
        crops: [
          {
            breakpoint: 'desktop',
            ratio: '7:4',
            width: '~352px (1.37:1 to 1.78:1)',
          },
          { breakpoint: 'tablet', ratio: '7:5', width: '~230px' },
          {
            breakpoint: 'mobile',
            ratio: '1:1',
            width: '~30vw (three in a row)',
          },
        ],
        safeArea:
          'Face and tablet inside the central 70% of the width and the middle 72% of the height, so both the 7:4 and the square crops keep them.',
        exclusion: 'None.',
        rtl: 'The bento mirrors; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAADQBACdASoYABIAPu1ur1IppiQiqAgBMB2JZQC7AAyIVP8KPHWZYq40CQ8ukZR/AAD+060ZoqPDDx92fyrax42qY+EtNEusjpZ3eE2Dqp5UC03Hn3EUF4aYcV9qb/eLIEbC8a47IJkJQlVHzDdG1iuo4kogAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:3',
        prompt:
          'An adult learner with headphones using a tablet in a quiet café, screen not visible, focused and content, window light. Learner centred in the frame. Framing: 4:3 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20260991,
        jobId: 'P3pqkTr42C',
        generatedAt: '2026-09-30T14:57:19Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 2 of 4 (1: busy background with other people; 3: two people; 4: looking away from the tablet)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '99d63808205478c4993a00b2e67995ae4591b5c1a21335f0df515980a486f419',
      },
    },
    {
      key: 'gallery-5',
      purpose: 'About › Gallery (square)',
      // Re-frozen (§E.6 step 8): landscape tiles (1.37–1.78) on tablet and
      // desktop, square only in the three-up phone row. A 4:3 master keeps
      // ≥ 75% of either side in every crop; a square one lost 44% of the
      // height on desktop.
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_SMALL_TILE,
      focal: { x: 0.5, y: 0.45 },
      alt: {
        en: 'Two learners celebrating a shared success',
        ar: 'متعلّمان يحتفلان بنجاح مشترك',
      },
      direction:
        'A small celebration moment between two adult learners sharing a smile of success beside a laptop, a gesture that reads well in both English-speaking and Middle Eastern cultures, no certificates or text, bright and warm. Both people centred in the frame.',
      composition: {
        slot: 'About › Gallery bento: a small tile',
        crops: [
          {
            breakpoint: 'desktop',
            ratio: '7:4',
            width: '~352px (1.37:1 to 1.78:1)',
          },
          { breakpoint: 'tablet', ratio: '7:5', width: '~230px' },
          {
            breakpoint: 'mobile',
            ratio: '1:1',
            width: '~30vw (three in a row)',
          },
        ],
        safeArea:
          'Both people inside the central 70% of the width and the middle 72% of the height, so both the 7:4 and the square crops keep them.',
        exclusion: 'None.',
        rtl: 'The bento mirrors; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAAAQBQCdASoYABIAPu1qqVAppiOiqA1RMB2JYwCdABDR6biAQdkJnuk6j+gmrKp+zV/gAP7Tibm5IOTp9QiAFFsWT8TSRNtAP7qcAfPoC6fnkGfiIbSCGuGHAXsIjASchsoCLOEVa54zt+olOjmMyeWMOeOc+7/Yj22laRGP4/+wIKZsAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:3',
        prompt:
          'A small celebration moment between two adult learners sharing a smile of success beside a laptop, a gesture that reads well in both English-speaking and Middle Eastern cultures, no certificates or text, bright and warm. Both people centred in the frame. Framing: 4:3 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20261001,
        jobId: '1lRomGPr4r',
        generatedAt: '2026-09-30T14:57:23Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 2 of 4 (3: a laptop logo; 1 and 4: a hand-clasp that reads as arm-wrestling)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '207ec577723d692ca79952cc343ff8ce5a20c9425b871dd42663e19b2206c33e',
      },
    },
    {
      key: 'auth-side',
      purpose: 'Sign in / sign up side panel',
      ratio: '3:4',
      master: { width: 1500, height: 2000 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A calm evening study scene with a desk lamp',
        ar: 'مشهد دراسة هادئ في المساء مع مصباح مكتب',
      },
      direction:
        'A calm evening study scene: an adult learner focused at a desk under a warm desk lamp, dark surroundings, peaceful concentration. Learner and lamp centred, dark calm edges on every side.',
      composition: {
        slot: 'Sign in / sign up › the side panel beside the form (desktop only)',
        crops: [
          { breakpoint: 'desktop', ratio: '3:4', width: '~45vw, max ~580px' },
          { breakpoint: 'tablet', ratio: 'hidden', width: 'hidden' },
          { breakpoint: 'mobile', ratio: 'hidden', width: 'hidden' },
        ],
        safeArea:
          'The learner and lamp inside the central 70% of the width and 80% of the height (object-fit: cover trims up to ~10% at the sides).',
        exclusion:
          "None over the photo; the panel's rounded 20px corners stay dark and plain.",
        rtl: 'The panel moves to the left in Arabic; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRngAAABXRUJQVlA4IGwAAADwBACdASoYACAAPtlepU2oJaOiN/qoAQAbCWUAyJhXb+HsxWK8G5OPcMwWeG/SoAAA/vQo9ftGKLEGCt25yLI9usAb6JXD6iTKEcCvsiuIqEwwV9v35wK/SAsY8dhBVvt3w75LrxxutwLbAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:4',
        prompt:
          'A calm evening study scene: an adult learner focused at a desk under a warm desk lamp, dark surroundings, peaceful concentration. Learner and lamp centred, dark calm edges on every side. Framing: 3:4 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 20261013,
        jobId: '3z8rsuBREY',
        generatedAt: '2026-09-30T14:57:26Z',
        reviewer:
          'Claude Code — plan §P.7 release gate and in-context review (EN/AR, 1440/1024/390); candidate 4 of 4 (1: bright window at the edge; 2: light walls; 3: lamp cut by the frame)',
        reviewOutcome: 'approved',
        licenseBasis:
          "Owner's explicit approval (29 Sep 2026) to use Atlas's paid Magnific Premium+ subscription, active at generation, for Atlas Theme 1 production assets",
        masterSha256:
          '11408e59f2ee5625b6c3c46ac49cc36c72104bddda9a49614567a6f67a00f6b7',
      },
    },
    {
      key: 'theme-card',
      purpose:
        'Dashboard › Website › Theme tab, the card that offers this theme',
      ratio: '16:9',
      master: { width: 2400, height: 1350 },
      widths: [480, 800, 1200],
      focal: { x: 0.5, y: 0.5 },
      // The card's picture is decorative (the card names the theme); the
      // text exists for contexts without the card.
      alt: {
        en: 'A bright, modern learning space with adult learners studying together',
        ar: 'مساحة تعلّم حديثة ومشرقة يدرس فيها متعلّمون بالغون معًا',
      },
      direction:
        'A bright, modern open learning space: a few adult learners at a distance studying together at light wooden tables with notebooks and printed handouts, tall windows, plants and soft daylight, friendly and energetic. No laptops. The group in the centre third of the frame with calm space around it.',
      composition: {
        slot: 'Theme tab card, the picture above the theme name (about 7:3 crop)',
        crops: [
          { breakpoint: 'desktop', ratio: '7:3', width: '~480px' },
          { breakpoint: 'tablet', ratio: '7:3', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '7:3', width: '100vw' },
        ],
        safeArea:
          'The subject inside the central 70% of the width and y 0.25–0.75.',
        exclusion: 'None; the theme name sits under the picture.',
        rtl: 'Layout mirrors in Arabic; the photograph is not mirrored.',
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v2',
      lqip: 'data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAADwAwCdASoYAA4APu1iqk4ppaQiMAgBMB2JYwCdABs8abBETbzsxwgAAP7nkWkL0UdrklnxqEruy7KkiXJPQDMIia/SCfrDcI/fNKcinLbPcTsIMwf0zhp89LW42EewkuWE+tceku8cxAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'A bright, modern open learning space: a few adult learners at a distance studying together at light wooden tables with notebooks and printed handouts, tall windows, plants and soft daylight, friendly and energetic. No laptops. The group in the centre third of the frame with calm space around it. Framing: 16:9 aspect ratio. Editorial documentary photograph, photographic realism. Natural daylight, warm-neutral colour grade, low saturation and soft contrast so any brand colour can be the accent. Real, diverse adults suited to both English-speaking and Middle Eastern audiences, including modest attire. Genuine, unposed moments. Clean, uncluttered backgrounds with calm negative space where interface elements overlay. Strictly avoid: No text, letters or numbers anywhere; no logos, brand names or recognisable products; no readable screens or user interfaces (screens blurred or angled away); no watermarks; no illustration or 3D render style; no recognisable real people; no distorted hands, faces or eyes.',
        seed: 777831,
        jobId: 'CqJhv8cEEy',
        generatedAt: '2026-10-05T05:42:41Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 4 of 4 (3 rejected: brand logos on laptop lids)',
        reviewOutcome: 'approved',
        licenseBasis: T1_THEME_CARD_LICENSE_BASIS,
        masterSha256:
          '89373b7bdb47673ee5e158a826aa4f25adc6bb08c942788273e6e4b4f8f83f04',
      },
    },
  ],
};
