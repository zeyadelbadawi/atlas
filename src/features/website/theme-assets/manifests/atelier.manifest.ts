/**
 * Atelier (Theme 2) asset manifest — the asset keys of
 * `Reports/THEME_2_ATELIER_PLAN.md` §5.
 *
 * Atelier's photographs are the materials and spaces of learning — books,
 * study desks, reading and seminar rooms, online study. The theme never
 * shows a recognisable face, so no image can be read as a real member,
 * student or instructor of the Academy using it. The art direction, crops, focal points, alt text and budgets are
 * fixed here and the generation prompt is built from them
 * (`buildThemeAssetPrompt`). An entry that isn't released renders its
 * section's designed no-image state.
 *
 * Releasing an entry: run `tools/theme-assets/prepare.mjs`, commit the
 * derivatives under `public/theme-assets/atelier/<version>/`, then set
 * `status`, `version`, `lqip` and `provenance` here. Released folders are
 * immutable.
 *
 * All fourteen were released together on 4 Oct 2026. Their masters'
 * sha256 are recorded below; archiving them to the private bucket
 * (`npm run archive-master`) needs the R2 credentials, which the session
 * that generated them did not have — run it from an environment that does.
 *
 * `home-hero` v2 (4 Oct 2026): the same approved master, re-released with
 * full-window widths for the opening scene (v1 stopped at 1600w). v1 stays
 * served for anything that still references it.
 *
 * v3 (5 Oct 2026): every photograph replaced, at the Owner's request, by
 * new learning-related images (reading rooms, books, study desks, online
 * study) generated with Magnific; none is shared with Modern Education.
 * The keys and slots are unchanged, so stored references keep working;
 * v1 and v2 stay served. `theme-card` is the Theme tab's feature image.
 */
import type { ThemeAssetManifest } from '../theme-asset.types';

const HERO_BUDGET = 180_000;
const DEFAULT_BUDGET = 120_000;
const W_PORTRAIT = [480, 800, 1200, 1600];
/**
 * The hero also fills the whole window in the opening scene, so its widths
 * reach the full-window crops: 1440, 1920 and 2560 CSS px at 1x (1600,
 * 2000, 2560) and 2x (3200, the widest the 3712 px master allows).
 */
const W_HERO = [480, 800, 1200, 1600, 2000, 2560, 3200];
const W_LANDSCAPE = [640, 1024, 1600];
const ATELIER_LICENSE_BASIS =
  "Owner's explicit authorisation in the Theme 2 brief (4 Oct 2026) to use Magnific autonomously, through Atlas's paid Magnific Premium+ subscription active at generation, for Atlas Theme 2 production assets";
const ATELIER_V3_LICENSE_BASIS =
  "Owner's explicit request (5 Oct 2026) to replace every Atelier photograph with new learning-related images generated with Magnific, through Atlas's paid Magnific Premium+ subscription active at generation, for Atlas Theme 2 production assets";
const NOT_MIRRORED =
  'Layout mirrors in Arabic; the photograph is not mirrored.';

export const ATELIER_ASSETS: ThemeAssetManifest = {
  theme: 'atelier',
  artDirection:
    'Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space.',
  exclusions:
    'No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
  formats: ['avif', 'webp'],
  assets: [
    {
      key: 'home-hero',
      purpose: 'Home › Hero, the arched image (first impression, LCP image)',
      ratio: '4:5',
      master: { width: 3680, height: 4600 },
      widths: W_HERO,
      focal: { x: 0.5, y: 0.6 },
      alt: {
        en: 'A sunlit library table with an open book, reading glasses, a stack of books and headphones',
        ar: 'طاولة مكتبة يغمرها ضوء الشمس، عليها كتاب مفتوح ونظارة قراءة ورزمة كتب وسماعات',
      },
      direction:
        'A quiet study corner in a reading room: a long wooden library table beside a tall plain rectangular window, a stack of clothbound books with plain unlabelled spines, one large book lying open with blank cream pages, a pair of round reading glasses resting on it, a pencil and a pair of plain unmarked over-ear headphones set to one side, daylight falling diagonally across the table with soft shadows. The table and objects fill the lower two thirds; the upper third is calm plaster wall and window light. A straight, unframed view: no arches, doorways or architectural framing around the picture. Vertical 4:5 framing; everything important sits in the central 80% of the width because the image is masked by an arch.',
      composition: {
        slot: 'Home › Hero, the tall arched image at the logical end of the type-led spread',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~520px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea:
          'Objects inside the central 80% of the width and y 0.35–0.95; the arch mask removes the top corners.',
        exclusion: 'Top 25% stays calm (the arch curve cuts through it).',
        rtl: NOT_MIRRORED,
      },
      priority: true,
      budgetBytes: HERO_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAADwBACdASoYAB4APu1mq06ppaOiKA1RMB2JZwAApLcqQfuMkEMCEG3YhUocrS3SoQAA/tUArUwJ7dvr4Zt0MoVgxgydMo9N5JuFGjzdInZJwVotleEnZ4IOZsSpEb6rxFXLubGPKi42MXG0RztUCDkJz9O5Il7C13phXt8iCwPCoZwAAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A quiet study corner in a reading room: a long wooden library table beside a tall plain rectangular window, a stack of clothbound books with plain unlabelled spines, one large book lying open with blank cream pages, a pair of round reading glasses resting on it, a pencil and a pair of plain unmarked over-ear headphones set to one side, daylight falling diagonally across the table with soft shadows. The table and objects fill the lower two thirds; the upper third is calm plaster wall and window light. A straight, unframed view: no arches, doorways or architectural framing around the picture. Vertical 4:5 framing; everything important sits in the central 80% of the width because the image is masked by an arch. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 904614,
        jobId: 'xSAKkhBjfW',
        generatedAt: '2026-10-05T05:42:25Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 3 of 6 (4 rejected: an arch or doorway painted into the photograph (the theme masks it itself), objects off-centre for the arch)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          'cc1628a9d2b76ee325bdd97bb6b7f1b00ada416ee36994bad4a655e2fbfb47a8',
      },
    },
    {
      key: 'home-philosophy',
      purpose: 'Home › Chapter I (featureSplit), the folio image',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_PORTRAIT,
      focal: { x: 0.5, y: 0.55 },
      alt: {
        en: 'Hands turning the page of an open book with a ribbon bookmark',
        ar: 'يدان تقلّبان صفحة كتاب مفتوح فيه شريط علامة',
      },
      direction:
        'Close view of two hands turning a page of a thick open book on a wooden desk, one hand lifting the page, a fabric ribbon bookmark trailing across blank cream pages, a pencil resting in the gutter, warm side light. Only hands and forearms in frame, no face. Hands centred slightly below the middle.',
      composition: {
        slot: 'Home › featureSplit, the large image beside the numbered paragraphs',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~560px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'Hands and stitching inside the central 70% in both axes.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRqwAAABXRUJQVlA4IKAAAAAwBQCdASoYAB4APtVWok2oJKMiN+gBABqJQBbZBFB0pi4uOYr5VqNr89H4zuQNjF49/AD+6Dqt6gaKf1U5n9e9S6ueuDivSGtqTLsCru+i6pLDs6OvmTS8cL3AXtWwyA+FAbYD+Kt6JEa8RX5fnj9MTWMvpTMzPKdqcntKBPvfYB4ilnwcmUlBiMfV3sLlAFdT69fgN4jVuEzfuU/q4oAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'Close view of two hands turning a page of a thick open book on a wooden desk, one hand lifting the page, a fabric ribbon bookmark trailing across blank cream pages, a pencil resting in the gutter, warm side light. Only hands and forearms in frame, no face. Hands centred slightly below the middle. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 731037,
        jobId: 'WDuGZlUcXe',
        generatedAt: '2026-10-05T05:35:15Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 1 of 2 (1 rejected: torso dominates the frame; master trimmed by a 6 px generator frame line)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '20da186d38ed4246af217000ff2262628b6130ddddd90ede7e2118c6edd73611',
      },
    },
    {
      key: 'home-method',
      purpose: 'Home › Chapter V (steps), the method image',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Study materials in a row: an open book, a notebook, index cards and headphones on a closed notebook',
        ar: 'أدوات دراسة مصفوفة في صف: كتاب مفتوح ودفتر وبطاقات ملاحظات وسماعات فوق دفتر مغلق',
      },
      direction:
        'Low side view at table height of a study method arranged in a row from left to right along a pale wooden table: an open textbook with blank pages, then a notebook with faint abstract pencil marks and a pencil, then a small stack of plain index cards held by a clip, then a pair of plain unmarked over-ear headphones resting on a closed plain notebook. Evenly spaced like the steps of a process, soft window light from one side, calm margins.',
      composition: {
        slot: 'Home › steps, the wide image above the syllabus track',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~720px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The sequence inside the central 85% of the width.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAACQAwCdASoYABAAPu1kqk4ppaQiMAgBMB2JZQCdAB5jeOiGttJwAP7XSXmHMEfJmOwAht5rqTDJHyNl/Sd2SG0ijBy6SoE4HuvTw1TO46uQg86kvL6df6487q4uA/51LHIAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Low side view at table height of a study method arranged in a row from left to right along a pale wooden table: an open textbook with blank pages, then a notebook with faint abstract pencil marks and a pencil, then a small stack of plain index cards held by a clip, then a pair of plain unmarked over-ear headphones resting on a closed plain notebook. Evenly spaced like the steps of a process, soft window light from one side, calm margins. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 514809,
        jobId: 'TdHYW6aVNR',
        generatedAt: '2026-10-05T05:42:30Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 4 of 4 (3 rejected: a brand mark on the headphones or a logo on the laptop lid, a generator frame line)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '1d4eb3560c3323b32ad952f33aa3d57618fefc26ec5aeb472c05d5e8c1de21eb',
      },
    },
    {
      key: 'home-cta',
      purpose: 'Home › Closing chapter (cta, ink environment)',
      ratio: '16:9',
      master: { width: 2400, height: 1350 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'An empty library reading room at dusk, reading lamps glowing over a long study table',
        ar: 'قاعة مطالعة خالية في مكتبة عند الغسق، ومصابيح القراءة مضاءة فوق طاولة دراسة طويلة',
      },
      direction:
        'A quiet empty library reading room at dusk: a long wooden study table with a few empty chairs and a few closed books stacked on it, brass reading lamps glowing warm along it, tall shelves of books with plain unlabelled spines fading into shadow, a large window with deep blue evening light. No people and no devices. Low-key, mostly dark tones that sit naturally under a dark overlay.',
      composition: {
        slot: 'Home › cta, the wide plate in the closing ink chapter',
        crops: [
          { breakpoint: 'desktop', ratio: '16:9', width: '~960px' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea: 'The table and lamps inside the central 70% of the width.',
        exclusion:
          'Edges fall off to dark so the plate blends into the ink page.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAADQAwCdASoYAA4APu1kqk2ppaQiMAgBMB2JQBdgDSveLmTbzTyWMDAA/v0FezilhCpqdUr9O699zeZOI1PFaZC7jtSBtGbF2mHkmdHeLPN48k1Itcq7u8eXoBxrKTjcJAAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'A quiet empty library reading room at dusk: a long wooden study table with a few empty chairs and a few closed books stacked on it, brass reading lamps glowing warm along it, tall shelves of books with plain unlabelled spines fading into shadow, a large window with deep blue evening light. No people and no devices. Low-key, mostly dark tones that sit naturally under a dark overlay. Framing: 16:9 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 290919,
        jobId: '6AoP4lyiJO',
        generatedAt: '2026-10-05T05:42:33Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 4 of 4 (3 rejected: a person in profile, an open laptop facing the camera, saturated green lamp shades; master trimmed by a 26 px frame line)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '0a894738ca1f9f9ef14ebcfb2093d457a119b0eee01649e7a11af7ed5d8a7dad',
      },
    },
    {
      key: 'courses-launching',
      purpose:
        'Featured courses empty state: the plate above "courses are on the way"',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A row of new books and notebooks on a wooden shelf, one pulled forward',
        ar: 'صف من الكتب والدفاتر الجديدة على رف خشبي، وأحدها مسحوب إلى الأمام',
      },
      direction:
        'A neat row of new clothbound books and notebooks with plain unlabelled covers standing upright on a wooden shelf, one pulled slightly forward, a small brass bookend at each end, soft morning light; the feeling of a new term about to begin. The row sits in the centre of the frame with equal calm wall on both sides, inside the middle 60% of the width.',
      composition: {
        slot: 'Home › featuredCourses empty state plate',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~480px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '~60vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The row of books inside the central 60% of the width.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAADQAwCdASoYABAAPu1kq04ppaQiMAgBMB2JYwCsABjbNp++/jaz/eAA/ufaYu1wWt2yfCzP+nczScny386bDExtvHKjGwaYorjum9goRhqHJlCmbJOiBYYAAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'A neat row of new clothbound books and notebooks with plain unlabelled covers standing upright on a wooden shelf, one pulled slightly forward, a small brass bookend at each end, soft morning light; the feeling of a new term about to begin. The row sits in the centre of the frame with equal calm wall on both sides, inside the middle 60% of the width. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 552782,
        jobId: 'KL3Hqa2kqp',
        generatedAt: '2026-10-05T05:42:35Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 4 of 4 (3 rejected: arrangement off-centre, an off-theme anchor bookend, a laptop with a logo)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '79479ab34ca22cee4da73ea9d9569b6e77e01bac0fa19683f5de0aaab3007bbb',
      },
    },
    {
      key: 'about-header',
      purpose: 'About › page header, the wide plate under the masthead',
      ratio: '21:9',
      master: { width: 2800, height: 1200 },
      widths: [800, 1280, 1920, 2560],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A bright, empty seminar room with wooden desks facing a blank chalkboard',
        ar: 'قاعة دراسية مشرقة خالية بمقاعد خشبية أمام سبّورة فارغة',
      },
      direction:
        'Wide view of a bright, empty seminar room: rows of long wooden desks with chairs facing a large blank dark chalkboard, low shelves of books with plain unlabelled spines, tall windows along one side with soft daylight. No people.',
      composition: {
        slot: 'About › pageHeader, the full-width plate',
        crops: [
          { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'Desks, chalkboard and windows inside the central 60% of the width and y 0.25–0.8.',
        exclusion: 'None; text sits above the plate, not over it.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAAAwBACdASoYAAoAPu1kq04ppaQiMAgBMB2JZQCdMoAC22prp5oHgr0LZAAA/gZVT89rZ8qHNbSvNYV6l6e3oHipXMwTYMQHoCReR5uUkeNFM/+7O+bI8EXnKr9R2SutS4oAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 21:9',
        prompt:
          'Wide view of a bright, empty seminar room: rows of long wooden desks with chairs facing a large blank dark chalkboard, low shelves of books with plain unlabelled spines, tall windows along one side with soft daylight. No people. Framing: 21:9 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 406469,
        jobId: 'SycLrL6Ub8',
        generatedAt: '2026-10-05T05:35:50Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 1 of 2 (1 rejected: darker, desks crowd the frame)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          'be636d4c46a2222eb5c2a6889bcc8e2bd420c5a9f804f714eec448b0ad6fec30',
      },
    },
    {
      key: 'about-story',
      purpose: 'About › story (featureSplit), the folio image',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_PORTRAIT,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A learner seen from behind, reading at a desk by a tall window',
        ar: 'متعلّم يظهر من الخلف يقرأ على مكتب بجوار نافذة عالية',
      },
      direction:
        'A learner seen from behind, in soft silhouette, seated at a wooden desk by a tall window and reading a large open book, a small stack of books beside them, warm morning light on plaster walls. No face visible; the figure, desk and window inside the central 70% of the width.',
      composition: {
        slot: 'About › featureSplit, the folio image beside the story',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~560px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea:
          'The figure, desk and window inside the central 70% of the width.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAAAwBQCdASoYAB4APu1irE+ppSQiMBgIATAdiWUAuwAv7iQJ6imkYAOzvYqlbYmU+WhCgAD+C13VIsChu1DVYfUDYqFXdpsaVFGnJHc4ojIEKEbyLqeaRbm74MHtcqY/FlCl1YviOSR1sGBHMPS9ApF0ixEi7ogA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A learner seen from behind, in soft silhouette, seated at a wooden desk by a tall window and reading a large open book, a small stack of books beside them, warm morning light on plaster walls. No face visible; the figure, desk and window inside the central 70% of the width. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 860014,
        jobId: 'JNMSsUaOq4',
        generatedAt: '2026-10-05T05:35:52Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 2 of 2 (1 rejected: a white generator frame on three sides; master trimmed by a 146 px band at the foot)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '0763e3be7c6e82a742b2b6ffd97b51c26bdfae201e25ebda8501911a84e37e2b',
      },
    },
    {
      key: 'gallery-1',
      purpose: 'Gallery › contact sheet, plate 1 (tall)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.55 },
      alt: {
        en: 'A library aisle between tall bookshelves, with a ladder and a shaft of daylight',
        ar: 'ممر في مكتبة بين رفوف كتب عالية، فيه سُلّم وشعاع من ضوء النهار',
      },
      direction:
        'A tall aisle between wooden library bookshelves filled with books with plain unlabelled spines, a rolling library ladder leaning against one side, a shaft of daylight falling across the floor at the far end. No people.',
      composition: {
        slot: 'Gallery › contact sheet, a tall plate',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~420px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'The aisle and ladder inside the central 70%.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRqYAAABXRUJQVlA4IJoAAABQBQCdASoYAB4APu1mq04ppaQiMAgBMB2JZQCw7BQJU9HmZTOp9Xo7mDn+//6Y6uKdAvAA/uj/S33TzM5ZzQXqxNlR/JjJAhCe7RJ02ZhQa0/Qm8igUVW9GyvbViRoqKIIirCkQfUCUOOI5EHtw9xAugq8Bkc3ODpy4s++ZVG1QCVDTb/Pn1G7BhJ8sPRqngiZ2tNAp3gRxSQA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A tall aisle between wooden library bookshelves filled with books with plain unlabelled spines, a rolling library ladder leaning against one side, a shaft of daylight falling across the floor at the far end. No people. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 882818,
        jobId: 'lJYxks7gv9',
        generatedAt: '2026-10-05T05:35:55Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 2 of 2 (1 rejected: generator frame lines on both sides)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          'bd4bcfae4ea53e0e94b500b968cdcc9574b6dcef6d738a8f9c66672b42c32e01',
      },
    },
    {
      key: 'gallery-2',
      purpose: 'Gallery › contact sheet, plate 2 (wide)',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A learner with earphones taking notes during an online lecture, seen from behind',
        ar: 'متعلّم يضع سماعات أذن ويدوّن ملاحظات أثناء محاضرة عبر الإنترنت، يظهر من الخلف',
      },
      direction:
        'Studying online at home: a learner seen from directly behind, only the back of the head and shoulders visible, wearing simple plain white wired earphones and listening to a lecture while taking notes with a pencil in an open notebook at a wooden desk by a window with soft daylight; no devices visible in the frame. No face, no profile, no cheek or ear in view.',
      composition: {
        slot: 'Gallery › contact sheet, a wide plate',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~640px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea:
          'The learner and notebook inside the central 80% of the width.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAADwAwCdASoYABAAPu1iqk4ppaQiMAgBMB2JZQCw7Bk38O+6WDGqx6KwAP3CRNb8qnHKl4erLjc51oeXoTzCSlH2HgFyrDcos+HMmIE9DVxbyw0aKCf696/RXi7bLnOiXAU9/Mbu87Vt4qHFIgDuZlPuwtjlXAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Studying online at home: a learner seen from directly behind, only the back of the head and shoulders visible, wearing simple plain white wired earphones and listening to a lecture while taking notes with a pencil in an open notebook at a wooden desk by a window with soft daylight; no devices visible in the frame. No face, no profile, no cheek or ear in view. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 159500,
        jobId: 'Lwz1jt6swO',
        generatedAt: '2026-10-05T05:45:49Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 8 of 8 (7 rejected: part of a face in profile, a brand name on headphones, a laptop logo or a screen facing the camera)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '8d7cacb1c3fb71dad1c9225b5f2ff6acf65f34461e221e4d326cafbefefad2fa',
      },
    },
    {
      key: 'gallery-3',
      purpose: 'Gallery › contact sheet, plate 3 (square)',
      ratio: '1:1',
      master: { width: 2000, height: 2000 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A desk globe beside old books and a magnifying glass',
        ar: 'كرة أرضية مكتبية بجوار كتب قديمة وعدسة مكبّرة',
      },
      direction:
        'Still life on a dark wooden desk: a plain antique desk globe with no lettering, a small stack of old books with plain unlabelled spines, a brass magnifying glass and a pencil, low raking light, deep soft shadow.',
      composition: {
        slot: 'Gallery › contact sheet, a square plate',
        crops: [
          { breakpoint: 'desktop', ratio: '1:1', width: '~420px' },
          { breakpoint: 'tablet', ratio: '1:1', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '1:1', width: '100vw' },
        ],
        safeArea: 'Objects inside the central 70%.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAAAQBQCdASoYABgAPu1krFAppSQisBgIATAdiWUAvzgRd+mUWZbjwv4yLgisXmPXSkPgAP7YBTUKGkEnLB9h+SLVSvHchX5g6FKJveJU+An71iQQGb3PTHi9lsbyuSdvsxJnzdKFsLV6Mm/w1WV8lqE/QAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 1:1',
        prompt:
          'Still life on a dark wooden desk: a plain antique desk globe with no lettering, a small stack of old books with plain unlabelled spines, a brass magnifying glass and a pencil, low raking light, deep soft shadow. Framing: 1:1 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 407217,
        jobId: 'JNMSlyuOq4',
        generatedAt: '2026-10-05T05:35:59Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 1 of 2 (1 rejected: map lines on the globe could read as lettering; master trimmed by thin generator frame lines)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '022f8495cb08eb4a5c7bee797d5cc8318e4f15db367191fdfacd2aa5001907e2',
      },
    },
    {
      key: 'gallery-4',
      purpose: 'Gallery › contact sheet, plate 4 (tall)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A blank chalkboard with chalk and an eraser on its ledge',
        ar: 'سبّورة فارغة على حافتها طباشير وممحاة',
      },
      direction:
        'A blank dark chalkboard on a plaster wall, its wooden ledge holding a few pieces of white chalk and a felt eraser, faint swirls of erased chalk dust on the board, soft window light from the side. Nothing is written on the board.',
      composition: {
        slot: 'Gallery › contact sheet, a tall plate',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~420px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'The chalkboard and its ledge inside the central 80%.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAQBQCdASoYAB4APu1qr1CppaQiqAqpMB2JZwClrDMM61LwQ+OHSrK699je0zZU2aMwAP7idPJR8kda/DRSbkyEXHpD7kU11WESyA2r6hWUUnYM8lymXhNql/nN/KKpE90iCIFGsdn9dBiqxGTADY/Q4ycQpjzzQ9EJaruVQ1OouAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A blank dark chalkboard on a plaster wall, its wooden ledge holding a few pieces of white chalk and a felt eraser, faint swirls of erased chalk dust on the board, soft window light from the side. Nothing is written on the board. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 892223,
        jobId: '9ZXO7VeNYZ',
        generatedAt: '2026-10-05T05:36:26Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 2 of 2 (1 rejected: handwriting-like lines in an open notebook)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          'd6d67ef811baae8e620222a88ea075eade6c97ba071904a3b1a42c77c6411cf9',
      },
    },
    {
      key: 'gallery-5',
      purpose: 'Gallery › contact sheet, plate 5 (wide)',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Hands over open books and notebooks at a shared study table, seen from above',
        ar: 'أيدٍ فوق كتب ودفاتر مفتوحة على طاولة دراسة مشتركة، من الأعلى',
      },
      direction:
        'Top-down view of a shared seminar table during a study session: several pairs of hands over open books and notebooks, one hand pointing at a page, pencils, blank paper tabs and cups of tea; only hands and sleeves visible, warm daylight.',
      composition: {
        slot: 'Gallery › contact sheet, a wide plate',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~640px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'Hands and books inside the central 85% of the width.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAAAwBACdASoYABAAPu1iqk2ppaQiMAgBMB2JQBOmUABmigsnArvNIMNTZ9wA/rAMziyDKJKXAn3z4o35ESPCt5/YMJPxh42LjY/RGwB9GJ4juf+eXiU+XHr6tuHoA6Yqu+C7rdEqt7cSK3rqxKw9NlW/nmA3qnc349kDgAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Top-down view of a shared seminar table during a study session: several pairs of hands over open books and notebooks, one hand pointing at a page, pencils, blank paper tabs and cups of tea; only hands and sleeves visible, warm daylight. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 593681,
        jobId: 'p8KTcHIehw',
        generatedAt: '2026-10-05T05:36:28Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 2 of 2 (1 rejected: part of a face at the top edge)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          'db662347dc5190a5e9245589e058b531fdbd4df33a252a9bda3e47250797f735',
      },
    },
    {
      key: 'auth-side',
      purpose: 'Sign in / sign up › the arched image beside the form',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.6 },
      alt: {
        en: 'A sunlit reading room with a chair pulled out at a study table and an open book',
        ar: 'قاعة مطالعة مشمسة فيها كرسي مسحوب أمام طاولة دراسة وكتاب مفتوح',
      },
      direction:
        'A sunlit library reading room seen from its doorway: a single wooden chair pulled out from a study table as if waiting for someone, an open book and a pencil on the table, tall shelves soft in the background. Minimal and welcoming; the table and chair in the lower half, calm wall and light above.',
      composition: {
        slot: 'Auth frame, the arched image column (hidden on phones)',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~480px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~40vw' },
          { breakpoint: 'mobile', ratio: 'hidden', width: '0' },
        ],
        safeArea:
          'Objects inside the central 80% of the width and y 0.45–0.95.',
        exclusion: 'Top 25% stays calm (the arch curve cuts through it).',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAACQBQCdASoYAB4APu1cqU4ppKOiMBgMATAdiWUAAI+NxATwrO+6tnPtpQCzmpYpxUitOogVAAD5MVhzNSOIJs3gpazNN5LA4d4ule/3J1vGGkz6X8DLZ5qXS5EO8S+KrXkIy6RaO+DvICCulCHww+++Aknktu2maAJpYyp7w8HO8kYE4tLHsmwhSRwAvVsFX9ZLL8BGXgAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A sunlit library reading room seen from its doorway: a single wooden chair pulled out from a study table as if waiting for someone, an open book and a pencil on the table, tall shelves soft in the background. Minimal and welcoming; the table and chair in the lower half, calm wall and light above. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 345181,
        jobId: 'VXqWnQrMMU',
        generatedAt: '2026-10-05T05:36:31Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 2 of 2 (1 rejected: busy shelves in the top quarter the arch cuts through)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '917f0d175b2112a10432fe15c3d7ab4fe342315f74af9569dd68d3221365191f',
      },
    },
    {
      key: 'course-fallback',
      purpose:
        'Course rows, plates and Course Details when a course has no cover image',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: [400, 800, 1200],
      focal: { x: 0.5, y: 0.5 },
      // Shown beside the course title, so renderers mark it decorative
      // (`alt=""`); the text exists for contexts without a title.
      alt: {
        en: 'A closed book and a pencil on textured paper',
        ar: 'كتاب مغلق وقلم رصاص على ورق ذي ملمس خشن',
      },
      direction:
        'Minimal still life: a closed clothbound book with a plain cover lying at a slight angle on heavy textured cotton paper, a single pencil resting beside it, soft diagonal light and a gentle shadow, warm neutral tones only. Purely decorative, very low detail.',
      composition: {
        slot: 'Course index rows, plates and the Course Details spread (decorative stand-in)',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~480px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The book sits at the centre; any crop keeps it.',
        exclusion: 'None; the course title is set beside or under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAAAwBACdASoYABAAPu1kqk4ppaQiMAgBMB2JZQCdABe9+QeCnugg7jTJTyAA/pFmSxCaTXAj8saZ4nM1IMvejnb1sYXQG7sLeiX38eJ0Zpz05FYg3qgFMv1QBIYtR2czVG9S0rfnlgQFqmtaAYNxIgAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Minimal still life: a closed clothbound book with a plain cover lying at a slight angle on heavy textured cotton paper, a single pencil resting beside it, soft diagonal light and a gentle shadow, warm neutral tones only. Purely decorative, very low detail. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 555173,
        jobId: 's7nrkzJl8e',
        generatedAt: '2026-10-05T05:36:33Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 1 of 2 (1 rejected: the book runs off the frame on one side)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          '104bac973350497f54a34a207a26d166eedfd7090f1eb76d97488f8ac9116b1a',
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
        en: 'An open book on linen with a ribbon bookmark under arched window light',
        ar: 'كتاب مفتوح على قماش كتّان فيه شريط علامة تحت ضوء نافذة مقوّسة',
      },
      direction:
        'The signature image of an editorial learning theme: a large open book lying on warm off-white linen, a thin silk ribbon bookmark curving across its blank cream pages like a drawn line, the soft shadow of an arched window falling over the pages, calm and premium. The book centred within the middle 70% of the width.',
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
      version: 'v3',
      lqip: 'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAADQAwCdASoYAA4APu1kqU2ppaOiMAgBMB2JZwCdAB0aVfaqUvg8+fAA/sbzlzfAURWo4nYUCuJVYkr+gpRPWrgmO1fx9drDtB8FeOqzlpcX47loEzqaedqpk2poWhcmOwyxAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'The signature image of an editorial learning theme: a large open book lying on warm off-white linen, a thin silk ribbon bookmark curving across its blank cream pages like a drawn line, the soft shadow of an arched window falling over the pages, calm and premium. The book centred within the middle 70% of the width. Framing: 16:9 aspect ratio. Fine-art editorial photograph for a learning publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, focused and studious. Subjects are the materials, spaces and moments of learning: books, notebooks, study desks, reading rooms, seminar rooms and studying online at home; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no visible screen content or user interfaces (a laptop is closed, or seen from behind with its screen out of view); no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 713439,
        jobId: '9ZXO7omNYZ',
        generatedAt: '2026-10-05T05:36:39Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, frame edges); candidate 2 of 2 (1 rejected: a white generator border around the photograph)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_V3_LICENSE_BASIS,
        masterSha256:
          'a3863e57f35b9e2b7d069f5ad33a966f9c1a0e6f675f079369c3a117f491ecec',
      },
    },
  ],
};
