/**
 * Atelier (Theme 2) asset manifest — the asset keys of
 * `Reports/THEME_2_ATELIER_PLAN.md` §5.
 *
 * Atelier's photographs are still lifes, materials, hands at work and empty
 * studio interiors: the theme never shows a recognisable face, so no image
 * can be read as a real member, student or instructor of the Academy using
 * it. The art direction, crops, focal points, alt text and budgets are
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
 */
import type { ThemeAssetManifest } from '../theme-asset.types';

const HERO_BUDGET = 180_000;
const DEFAULT_BUDGET = 120_000;
const W_PORTRAIT = [480, 800, 1200, 1600];
const W_LANDSCAPE = [640, 1024, 1600];
const ATELIER_LICENSE_BASIS =
  "Owner's explicit authorisation in the Theme 2 brief (4 Oct 2026) to use Magnific autonomously, through Atlas's paid Magnific Premium+ subscription active at generation, for Atlas Theme 2 production assets";
const NOT_MIRRORED =
  'Layout mirrors in Arabic; the photograph is not mirrored.';

export const ATELIER_ASSETS: ThemeAssetManifest = {
  theme: 'atelier',
  artDirection:
    'Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space.',
  exclusions:
    'No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
  formats: ['avif', 'webp'],
  assets: [
    {
      key: 'home-hero',
      purpose: 'Home › Hero, the arched image (first impression, LCP image)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_PORTRAIT,
      focal: { x: 0.5, y: 0.6 },
      alt: {
        en: 'A sunlit studio worktable with an open sketchbook, brushes and folded linen',
        ar: 'طاولة عمل في مرسم يغمرها ضوء الشمس، عليها كرّاسة رسم مفتوحة وفرش وقماش كتّان مطويّ',
      },
      direction:
        'A sunlit corner of a craft studio: a wooden worktable under a tall arched window, an open sketchbook with blank cream pages, a ceramic cup holding brushes and pencils, a folded linen cloth, light falling diagonally across the table with soft shadows. The table and objects fill the lower two thirds; the upper third is calm plaster wall and window light. Vertical 4:5 framing; everything important sits in the central 80% of the width because the image is masked by an arch.',
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
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAADwBACdASoYAB4APu1cqU2ppKQiN/VYATAdiWUAwNw/I1xPNukleFhqA43zorbTlyAA+xM9aPgbuLnwmrdu/0OZz60z23ptve9qwoT8uFFmgalFvrJl8pCWzbkqUXJSv5wtI6ZZfqwP8esVHBZr9ruCYM1ngAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A sunlit corner of a craft studio: a wooden worktable under a tall arched window, an open sketchbook with blank cream pages, a ceramic cup holding brushes and pencils, a folded linen cloth, light falling diagonally across the table with soft shadows. The table and objects fill the lower two thirds; the upper third is calm plaster wall and window light. Vertical 4:5 framing; everything important sits in the central 80% of the width because the image is masked by an arch. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 721658,
        jobId: 'fH7BXhECDY',
        generatedAt: '2026-10-04T18:00:30Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: the arch was painted into the photograph, which the theme masks itself)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '9ffb23f0e9b3ea066ba5348b19840970d2bb92d82a737caecf3c5367d7323e03',
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
        en: 'Hands stitching the spine of a handmade notebook with waxed thread',
        ar: 'يدان تخيطان كعب دفتر مصنوع يدويًا بخيط مشمّع',
      },
      direction:
        'Close view of two hands stitching the spine of a hand-bound notebook with a needle and waxed linen thread on a worn wooden bench, paper offcuts and a bone folder nearby, warm side light. Only hands and forearms in frame, no face. Hands centred slightly below the middle.',
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
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRrYAAABXRUJQVlA4IKoAAADQBQCdASoYAB4APu1ipk4ppaMiMBgMATAdiWMAuzMvwVs4phjWSb6Dhp9GXwyrV74uTvbFcEgAAP7v0t4CVtwohfKUvWmSvboyn8nih3ZTqVDeAHXhYy481J1QFIcIGBGp15EMEG4uOAVDCzJShwYCzVQhG7TpKL790kIDoY81r32mh12QhIsNzlZsN3viHdf0l+g/XskE5qX70tc6Gr8h3Qz5cw1c61qAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'Close view of two hands stitching the spine of a hand-bound notebook with a needle and waxed linen thread on a worn wooden bench, paper offcuts and a bone folder nearby, warm side light. Only hands and forearms in frame, no face. Hands centred slightly below the middle. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 408721,
        jobId: 'JNMjxwvOq4',
        generatedAt: '2026-10-04T18:00:33Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: part of a face at the frame edge); master trimmed by 1.5% per side to remove a thin generator frame line',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          'a7b8d8db966fc16e12769d86f947c9ae3b68a26cd4c54100e5f77e47b3d3939e',
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
        en: 'Rough sketches, a refined drawing and a finished booklet laid out in sequence',
        ar: 'رسومات أولية ورسم منقّح وكتيّب مكتمل مصفوفة بالترتيب',
      },
      direction:
        'Overhead flat lay of a making process laid out in a row across a pale wooden table: loose rough pencil sketches of simple shapes, then a cleaner refined drawing, then a finished small bound booklet, with a pencil, a steel ruler and an eraser beside them. Even spacing, calm margins on every side.',
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
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAADwAwCdASoYABAAPu1kqU2ppaQiMAgBMB2JZwCdACHft0WvtJM1k64AAOJ9ojcYYXiS+XlirdACzaKDuEUXQnlp2Cd564Ic6cE0QO1QwR6vPnY4AAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Overhead flat lay of a making process laid out in a row across a pale wooden table: loose rough pencil sketches of simple shapes, then a cleaner refined drawing, then a finished small bound booklet, with a pencil, a steel ruler and an eraser beside them. Even spacing, calm margins on every side. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 809649,
        jobId: '0eFZR0dTfW',
        generatedAt: '2026-10-04T18:00:36Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 2 of 2 (1 rejected: hands crowd the sequence)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '9ed63fbba5bfd31e5fbc7e7f02a7d4ab7bb0a336a8f23e475ab2f6f2494b99af',
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
        en: 'An empty studio at dusk with a long worktable under a glowing pendant lamp',
        ar: 'مرسم خالٍ عند الغسق بطاولة عمل طويلة تحت مصباح معلّق مضيء',
      },
      direction:
        'A quiet empty studio at dusk: a long wooden worktable with a few stools, a single pendant lamp glowing warm above it, a large window with deep blue evening light. Low-key, mostly dark tones that sit naturally on a near-black page; inviting rather than gloomy.',
      composition: {
        slot: 'Home › cta, the wide plate in the closing ink chapter',
        crops: [
          { breakpoint: 'desktop', ratio: '16:9', width: '~960px' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea: 'The lamp and table inside the central 70% of the width.',
        exclusion:
          'Edges fall off to dark so the plate blends into the ink page.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAAAQBACdASoYAA0APu1iqk2ppaQiMAgBMB2JYgCdACHcfjf7pkvJqsOiAAD+4v+12tP+1+crzYTVkSIQ5jg5r7K60K8kAu/Ht5SitfQMPbheBk1b8EpfAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'A quiet empty studio at dusk: a long wooden worktable with a few stools, a single pendant lamp glowing warm above it, a large window with deep blue evening light. Low-key, mostly dark tones that sit naturally on a near-black page; inviting rather than gloomy. Framing: 16:9 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 745018,
        jobId: '1lZuE1Kr4r',
        generatedAt: '2026-10-04T18:00:38Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: a seated figure; the closing plate stays empty)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '02a64068964751353cf271271945dbd57704c72350b14ffd412f344ebfec2b3c',
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
        en: 'A neat stack of blank notebooks and a sharpened pencil on linen',
        ar: 'رزمة مرتّبة من الدفاتر الفارغة وقلم رصاص مبريّ على قماش كتّان',
      },
      direction:
        'A neat stack of plain blank notebooks with kraft and cream covers and a freshly sharpened pencil resting on top, on a natural linen cloth, soft morning side light, a sense of something about to begin. Centred, generous empty margins.',
      composition: {
        slot: 'Home › featuredCourses empty state plate',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~480px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '~60vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The stack inside the central 60% of the width.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnQAAABXRUJQVlA4IGgAAAAwBACdASoYABAAPu1iqU2ppaOiMAgBMB2JZQC7ACGWT2aiGKi5KvS/dmwA/u1IGCry7dBbbjNiK7uj92X+DNPk64jmhzp1tXfO5tnWjexRv65gdil+tkfr2xC/MeK420ERV6S5JEoAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'A neat stack of plain blank notebooks with kraft and cream covers and a freshly sharpened pencil resting on top, on a natural linen cloth, soft morning side light, a sense of something about to begin. Centred, generous empty margins. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 203077,
        jobId: 'Syckk7ZUb8',
        generatedAt: '2026-10-04T18:00:41Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          'd49f7339bd6ff47e4300198d4ca3fd9dd3c4761b7b641e49e51739189db93aeb',
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
        en: 'A bright, empty atelier with long shared tables, bookshelves and arched windows',
        ar: 'مرسم مضيء خالٍ بطاولات طويلة مشتركة ورفوف كتب ونوافذ مقوّسة',
      },
      direction:
        'Wide view of a bright, empty atelier: long shared wooden tables with chairs, low shelves of books with plain unlabelled spines, a few plants, a row of tall arched windows with soft daylight. No people. Horizon and tables in the middle band of the frame.',
      composition: {
        slot: 'About › pageHeader, the full-width plate',
        crops: [
          { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'Tables and windows inside the central 60% of the width and y 0.25–0.8.',
        exclusion: 'None; text sits above the plate, not over it.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAADQAwCdASoYAAoAPu1iqk4ppaQiMAgBMB2JZQC7MoACwAODxK7EjwAA/ooEOOmnSDxZyD5ObnFG3gduY2sV5G7wa12xCvz4Obww9RcWAE0BHTpZIaAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 21:9',
        prompt:
          'Wide view of a bright, empty atelier: long shared wooden tables with chairs, low shelves of books with plain unlabelled spines, a few plants, a row of tall arched windows with soft daylight. No people. Horizon and tables in the middle band of the frame. Framing: 21:9 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 779225,
        jobId: 'IfsMMvytvE',
        generatedAt: '2026-10-04T18:00:44Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: a blank artefact in the lower corner); spines checked unlabelled',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '1fec3bdfa1dc2b520b9230786fecd9693b7280637014f75447091e80e2863c9c',
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
        en: 'A figure seen from behind at a tall studio window, holding a book',
        ar: 'شخص يظهر من الخلف عند نافذة مرسم عالية ممسكًا بكتاب',
      },
      direction:
        'A figure seen from behind, in silhouette, standing at a tall studio window and looking out over rooftops in warm morning light, holding a closed book at their side; plaster walls and a wooden floor. No face visible. Figure centred.',
      composition: {
        slot: 'About › featureSplit, the folio image beside the story',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~560px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'The figure and window inside the central 70% of the width.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAABQBQCdASoYAB4APu1kq0+ppSOiMBgIATAdiWcAtsgPwnCMFIl8zFhr8XeH73ObjAtyQAAA/ZgEZzg2pK8Y4vCqxKZ0sF2h7V3xaLruveV16ywfx8fYFihEWzOneNKciwd1LvjhHc4Yjwpb+B2zseSwtM/fRjV8E+UZkqIIZnzMAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A figure seen from behind, in silhouette, standing at a tall studio window and looking out over rooftops in warm morning light, holding a closed book at their side; plaster walls and a wooden floor. No face visible. Figure centred. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 171464,
        jobId: 'u5yII5JQLD',
        generatedAt: '2026-10-04T18:00:46Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '793446fd1920e3d567720b327b6c47db80d6dbb7e16bfc18ced8cb73806214ea',
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
        en: 'Hands shaping clay on a potter’s wheel',
        ar: 'يدان تشكّلان الطين على عجلة الفخّار',
      },
      direction:
        'Two hands shaping wet clay into a bowl on a turning potter’s wheel, close and slightly from above, clay-dusted forearms, soft window light. Only hands and forearms, no face.',
      composition: {
        slot: 'Gallery › contact sheet, a tall plate',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~420px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'Hands and bowl inside the central 70%.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRrgAAABXRUJQVlA4IKwAAABwBQCdASoYAB4APu1urlKppiQiqAgBMB2JZQCw7ElMt+LuFPWJX+ltlvcNWHGEXJfxFdgAAP75AjpzO1j+Xz/ggby5lvebcryhByzpwTYGZgswgIxSTaKUNtpQS3O+JLxhqg1j6VIXg2wgyuV+8cxnvX2gi7bgVyz8S8lgsccoXg+cUIoHHfk67RRiAooWdiDloDNrE0Ye//T4talutSfrligofeq5QwrigAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'Two hands shaping wet clay into a bowl on a turning potter’s wheel, close and slightly from above, clay-dusted forearms, soft window light. Only hands and forearms, no face. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 507470,
        jobId: 'rg2QQRCxtc',
        generatedAt: '2026-10-04T18:01:15Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 2 of 2 (1 rejected: weaker form); master trimmed by 1.5% per side to remove a thin generator frame line',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          'b0797dd2a0663acb950b2da617e9fbd26f9f2de53854f4c0d5afc964c3d79ae0',
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
        en: 'A shared workshop table seen from above, with notebooks, cups and several pairs of hands',
        ar: 'طاولة ورشة مشتركة من الأعلى عليها دفاتر وأكواب وعدّة أيادٍ',
      },
      direction:
        'Top-down view of a shared workshop table during a session: several pairs of hands working in plain notebooks and on loose paper, cups of tea, pencils and a small plant; only hands and sleeves visible, no faces.',
      composition: {
        slot: 'Gallery › contact sheet, a wide plate',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~640px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'Hands inside the central 85% of the width.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAABwBACdASoYABAAPu1iqk2ppaQiMAgBMB2JYwCdMoBnABnibYovpz03vhT7GAD+6vnjsOaGABB+VPdrrWtHZzxmVU88fMlW62xv5TTBCXhyc9jZklMx7lEsdh3T9skYXqJd5g+PLK/Nv7DPjlK81oOg5qk8GoUB/gAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Top-down view of a shared workshop table during a session: several pairs of hands working in plain notebooks and on loose paper, cups of tea, pencils and a small plant; only hands and sleeves visible, no faces. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 868447,
        jobId: 'KL3CCibkqp',
        generatedAt: '2026-10-04T18:01:17Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2; no faces, hands checked',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '9c314cd7e66d0d404b207390091064226afe73515a4a447154e855b53d535c0d',
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
        en: 'An inkwell, a dip pen, folded paper and a pressed leaf on a desk',
        ar: 'محبرة وريشة كتابة وورقة مطويّة وورقة شجر مجفّفة على مكتب',
      },
      direction:
        'Still life on a dark wooden desk: a glass inkwell, a dip pen, a folded sheet of cream paper and a single pressed leaf, low raking light, deep soft shadow.',
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
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAAAwBQCdASoYABgAPu1urlKppiQiqAgBMB2JZQC+SA6+uEq5HHL1Cvo2n78xeBXrHUsQ4AD+W1a2CF/b1NI0fkFV7fXK9oiPL79Mx0qyKljtAbHZwFMBS+a5gR4+5KDwlJc/A5bPrftft41sLjK+9OWHPz7QkK8qQmCpMkgrOhrHnNmgSvWgAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 1:1',
        prompt:
          'Still life on a dark wooden desk: a glass inkwell, a dip pen, a folded sheet of cream paper and a single pressed leaf, low raking light, deep soft shadow. Framing: 1:1 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 243090,
        jobId: 'mEgppSQhJQ',
        generatedAt: '2026-10-04T18:01:20Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: torso and jaw in frame)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '99ac16f67b2506555d2a88cbb359a7349d4911b3219dd698e3d956f4d5df51b3',
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
        en: 'A stack of books on a windowsill beside an empty reading chair',
        ar: 'كومة كتب على حافة نافذة بجوار كرسي قراءة خالٍ',
      },
      direction:
        'A reading nook: a stack of books with plain unlabelled spines on a deep windowsill, an empty wooden chair with a wool throw beside it, afternoon light making long soft shadows.',
      composition: {
        slot: 'Gallery › contact sheet, a tall plate',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~420px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'Books and chair inside the central 75%.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAABwBQCdASoYAB4APu1eqk6ppKOiMBgMATAdiWUAwoBTYommOuQKN2jmKG7a6SlnHtCIQXFwAP7wrc0uZSW/KiMkqkSU9CHAeyZkmces4UqyfHtBNUkrQF8+84ko/bBAfc8rd3c9U2AVGPePRKUeEItJcxvpVhGniAlkY12UwtEIQrTjoNxs/T2Dal/KAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A reading nook: a stack of books with plain unlabelled spines on a deep windowsill, an empty wooden chair with a wool throw beside it, afternoon light making long soft shadows. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 102989,
        jobId: 'xSAFFzRjfW',
        generatedAt: '2026-10-04T18:01:22Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: frame border)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          'd2b12e95807034be0643c497733d9c15f45345d0a96b265614f2e85627cebb0e',
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
        en: 'Close detail of threads running through a wooden weaving loom',
        ar: 'تفصيل قريب لخيوط تمرّ عبر نَول نسيج خشبي',
      },
      direction:
        'Close detail of a wooden weaving loom: parallel warp threads in natural undyed tones running through the frame, a shuttle resting on the half-woven cloth, shallow depth of field, warm side light.',
      composition: {
        slot: 'Gallery › contact sheet, a wide plate',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~640px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'Shuttle and woven edge inside the central 80%.',
        exclusion: 'None; the caption sits under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRngAAABXRUJQVlA4IGwAAABQBACdASoYABAAPu1iqU2ppaQiMAgBMB2JZQCw7BbWcgPLp53eh5cqLJwAAP4KEs4wviYCYRVt25F/dmN3m2DGHnVic541M7EhIEi46Wy1uTFh4VvtQHskD3FFwAHHJdELGsPALIqc/Y7ysAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Close detail of a wooden weaving loom: parallel warp threads in natural undyed tones running through the frame, a shuttle resting on the half-woven cloth, shallow depth of field, warm side light. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 772647,
        jobId: 'vQUddyka47',
        generatedAt: '2026-10-04T18:01:28Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 2 of 2 (1 rejected: hands; the brief asks for the shuttle at rest)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '41a3b982ab3d66adcbb65435ca3dc1a80b4a06f1cd94810442196d992b3e737d',
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
        en: 'An open blank notebook and a pen on a desk beside an arched window',
        ar: 'دفتر فارغ مفتوح وقلم على مكتب بجوار نافذة مقوّسة',
      },
      direction:
        'A calm desk beside an arched window in morning light: an open notebook with blank pages, a fountain pen laid across it, a small vase with a single stem. Minimal and serene; objects in the lower half, soft wall above.',
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
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAABQBQCdASoYAB4APuFUpU2opCOiN/qoARAcCWcAyJgboygLs/aE+fnh8+Uw77CQq3AN9AgA/tYKlemMIe9AZWFUb2kPowF2SzHmq5hHuu6KVpnmea3tyDj7xlUvZTAUsnOILTnA9/vCgJBoBPymHAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A calm desk beside an arched window in morning light: an open notebook with blank pages, a fountain pen laid across it, a small vase with a single stem. Minimal and serene; objects in the lower half, soft wall above. Framing: 4:5 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 959207,
        jobId: 'IfsMM7dtvE',
        generatedAt: '2026-10-04T18:01:30Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 1 of 2 (2 rejected: too dark beside a paper form)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '884015895feea1b584f03831998d2898c24b11c4c9629a17e029e50dca934074',
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
        en: 'A sheet of textured paper with a soft fold',
        ar: 'ورقة ذات ملمس خشن عليها طيّة ناعمة',
      },
      direction:
        'Abstract minimal still life: a single sheet of heavy textured cotton paper with one soft diagonal fold casting a gentle shadow, on a slightly darker paper ground, warm neutral tones only. Purely decorative, no objects.',
      composition: {
        slot: 'Course index rows, plates and the Course Details spread (decorative stand-in)',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~480px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The fold crosses the centre; any crop keeps it.',
        exclusion: 'None; the course title is set beside or under the plate.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAAAwBACdASoYABAAPu1kqU2ppaQiMAgBMB2JZQDCgCG+5w3nTwvknWRtGgAA/uhDrPA7SPiXRPlY9/vQw/GJ0IVPSKIxRmfNi86H7rwBfZ60PzzJ4IzsGQ/mp+5iXPsAAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Abstract minimal still life: a single sheet of heavy textured cotton paper with one soft diagonal fold casting a gentle shadow, on a slightly darker paper ground, warm neutral tones only. Purely decorative, no objects. Framing: 3:2 aspect ratio. Fine-art editorial photograph for a studio publication, photographic realism, medium-format film look with fine grain. Soft directional daylight from a single window, gentle deep shadows. Warm paper-and-ink palette of off-white, oatmeal, umber and charcoal, muted and low in saturation so any brand colour can be the accent. Quiet, contemplative and crafted. Subjects are materials, tools, hands at work and studio interiors; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Generous calm negative space. Strictly avoid: No text, letters, numbers or readable writing anywhere; no logos, brand names or recognisable products; no screens or user interfaces; no watermarks; no illustration or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 16561,
        jobId: 'jUGHHfcLD0',
        generatedAt: '2026-10-04T18:02:02Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, frame edges); candidate 2 of 2 (1 rejected: window in frame competes with the title)',
        reviewOutcome: 'approved',
        licenseBasis: ATELIER_LICENSE_BASIS,
        masterSha256:
          '3ae41925599af4c471cf10e32bf4fe6b7a0425a59392cdd7088e9a311a3f525f',
      },
    },
  ],
};
