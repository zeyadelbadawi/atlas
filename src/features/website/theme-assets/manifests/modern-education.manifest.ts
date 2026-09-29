/**
 * Modern Education (Theme 1) asset manifest — the §E.2 A matrix.
 *
 * The art direction, crops, focal points, alt text and budgets are fixed
 * here, and the generation prompt is built from them
 * (`buildThemeAssetPrompt`). `home-hero` is released (the Phase 3 pilot);
 * the others are generated in the Phase 4 production run. Until an entry is
 * released, sections referencing it render their designed no-image state.
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
const W_SQUARE = [400, 800, 1200];

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
        ar: 'مرشد يوجّه متعلّمًا أمام شاشة مشتركة',
      },
      direction:
        'A mentor guiding a learner side by side at a shared laptop, screen content blurred and angled away, genuine encouragement and interaction, both faces visible in three-quarter view, bright modern room.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
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
        'A smiling adult learner holding a closed notebook against the chest, waist-up portrait, lit with a soft key light against a deep charcoal studio background that fades to near-black at the edges so it blends into a dark band without a cut-out.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
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
        'Overhead flat lay on a light wooden desk: an open blank notebook, a pen, a cup of coffee and a closed laptop, soft natural shadows, a sense of getting ready to start. Centred arrangement with generous margins.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
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
        'A wide, bright workshop or classroom with a small group of adults mid-discussion around a table, shallow depth of field, people in the centre third so a 4:3 crop keeps them.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
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
        'A small team of three adults planning together at a whiteboard covered in abstract shapes and sticky notes with no legible writing, collaborative energy, natural office light.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
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
        'A group workshop with a hands-on activity at a shared table, several adults leaning in, materials and tools without branding.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
    },
    {
      key: 'gallery-2',
      purpose: 'About › Gallery (wide tile)',
      ratio: '4:3',
      master: { width: 2400, height: 1800 },
      widths: W_4_3,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A learner on a video call at home',
        ar: 'متعلّم في مكالمة فيديو من المنزل',
      },
      direction:
        'An adult learner at home on a video call, laptop screen blurred and angled away, relaxed and engaged, cosy living-room light.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
    },
    {
      key: 'gallery-3',
      purpose: 'About › Gallery (square)',
      ratio: '1:1',
      master: { width: 1600, height: 1600 },
      widths: W_SQUARE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Hands writing notes in a notebook',
        ar: 'يدان تكتبان ملاحظات في دفتر',
      },
      direction:
        'Close-up of hands writing notes in a notebook with a pen, handwriting abstract and illegible, soft side light.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
    },
    {
      key: 'gallery-4',
      purpose: 'About › Gallery (square)',
      ratio: '1:1',
      master: { width: 1600, height: 1600 },
      widths: W_SQUARE,
      focal: { x: 0.5, y: 0.45 },
      alt: {
        en: 'A learner with headphones using a tablet in a café',
        ar: 'متعلّم يضع سماعات ويستخدم جهازًا لوحيًا في مقهى',
      },
      direction:
        'An adult learner with headphones using a tablet in a quiet café, screen not visible, focused and content, window light.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
    },
    {
      key: 'gallery-5',
      purpose: 'About › Gallery (square)',
      ratio: '1:1',
      master: { width: 1600, height: 1600 },
      widths: W_SQUARE,
      focal: { x: 0.5, y: 0.45 },
      alt: {
        en: 'Two learners celebrating a shared success',
        ar: 'متعلّمان يحتفلان بنجاح مشترك',
      },
      direction:
        'A small celebration moment between two adult learners, a high-five or shared smile of success, no certificates or text, bright and warm.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
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
        'A calm evening study scene: an adult learner focused at a desk under a warm desk lamp, dark surroundings, peaceful concentration.',
      budgetBytes: DEFAULT_BUDGET,
      status: 'pending',
    },
  ],
};
