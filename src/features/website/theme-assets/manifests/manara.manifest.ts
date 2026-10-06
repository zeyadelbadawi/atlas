/**
 * Manara (Theme 3) asset manifest — the asset keys of
 * `Reports/THEME_3_MANARA_PLAN.md` §3.13.
 *
 * Manara's photographs are exam-season learning under stage light: a lamp
 * over notebooks, a lecture hall from the back rows, a blank board under a
 * spotlight, stacked plain textbooks, hands writing, a teacher's silhouette
 * from behind. Deep cool grounds with one warm key light, low saturation, so
 * the brand's dyed blocks sit on top. The theme never shows a recognisable
 * face, so no image can be read as a real teacher or student of the Academy
 * using it. The art direction, crops, focal points, alt text and budgets are
 * fixed here and the generation prompt is built from them
 * (`buildThemeAssetPrompt`). An entry that isn't released renders its
 * section's designed no-image state.
 *
 * Slot keys match Theme 1's (`home-benefit` for the featureSplit image) so
 * photographs follow a theme switch (`adopt-theme-assets.ts`).
 *
 * Releasing an entry: run `tools/theme-assets/prepare.mjs`, commit the
 * derivatives under `public/theme-assets/manara/<version>/`, then set
 * `status`, `version`, `lqip` and `provenance` here. Released folders are
 * immutable.
 */
import type { ThemeAssetManifest } from '../theme-asset.types';

const HERO_BUDGET = 180_000;
const DEFAULT_BUDGET = 120_000;
const W_PORTRAIT = [480, 800, 1200, 1600];
const W_LANDSCAPE = [640, 1024, 1600];
const W_SMALL = [400, 800, 1200];
const MANARA_LICENSE_BASIS =
  "Owner's explicit authorisation in the Theme 3 brief (5 Oct 2026) to use Magnific autonomously for all newly generated Theme 3 images, through Atlas's paid Magnific Premium+ subscription active at generation, for Atlas Theme 3 production assets";
const NOT_MIRRORED =
  'Layout mirrors in Arabic; the photograph is not mirrored.';

export const MANARA_ASSETS: ThemeAssetManifest = {
  theme: 'manara',
  artDirection:
    'Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows.',
  exclusions:
    'No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
  formats: ['avif', 'webp'],
  assets: [
    {
      key: 'home-hero',
      purpose:
        'Home › Hero, the poster image beside the headline (LCP image on desktop)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_PORTRAIT,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A desk lamp lighting an open notebook and a pen on a dark desk late at night',
        ar: 'مصباح مكتب يضيء دفترًا مفتوحًا وقلمًا على مكتب داكن في وقت متأخر من الليل',
      },
      direction:
        'A dark study desk at night lit by a single warm desk lamp: an open notebook with blank pages, a pen laid across it, a closed plain textbook and a glass of water, the lamp light pooling on the pages while the room falls into deep blue shadow. No person, no screens. Vertical 4:5 framing; the lit notebook sits in the lower-centre of the frame inside the central 70% of the width, the upper third is dark calm wall.',
      composition: {
        slot: 'Home › Hero, the slanted poster on the logical end side of the stage',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~520px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~42vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea:
          'The lamp and notebook inside the central 70% of the width and y 0.3–0.9; the phone crop keeps y 0.3–0.9.',
        exclusion:
          'The slanted mask removes a corner at the top; keep it dark and calm.',
        rtl: NOT_MIRRORED,
      },
      priority: true,
      budgetBytes: HERO_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAAAQBQCdASoYAB4APuVep02pJSOiN/VYASAciWMAtshFX7m0pY0RqJ7C/iYT26pPmnIgAP70Itb61x1m4L11bTza3mgZsjV5nbktSx3CmVQvamrMOrtnX0JTO7yxaVu9VuWvBi9fTEfgm22w7MEKBtxiAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A dark study desk at night lit by a single warm desk lamp: an open notebook with blank pages, a pen laid across it, a closed plain textbook and a glass of water, the lamp light pooling on the pages while the room falls into deep blue shadow. No person, no screens. Vertical 4:5 framing; the lit notebook sits in the lower-centre of the frame inside the central 70% of the width, the upper third is dark calm wall. Framing: 4:5 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 130391,
        jobId: '9ZBDCgFNYZ',
        generatedAt: '2026-10-06T00:23:40Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: the lamp cut by the frame edge, weaker poster composition)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '18bffe2a2f7d0cb1ce46cb8db7cd62f8594c33efa3b93fcc0606793afee159b8',
      },
    },
    {
      key: 'home-benefit',
      purpose: 'Home › How we teach (featureSplit), the slanted image',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_PORTRAIT,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A teacher seen from behind, writing on a blank board under a spotlight',
        ar: 'معلّم يظهر من الخلف يكتب على سبّورة فارغة تحت ضوء كاشف',
      },
      direction:
        'A teacher seen entirely from behind, silhouetted against a large blank dark board lit by a warm spotlight from above, one arm raised holding a marker as if about to write; nothing is written on the board. Deep shadow around the edges. The figure in the central 60% of the width, no face, no profile.',
      composition: {
        slot: 'Home › featureSplit, the image beside the numbered points',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~560px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'The figure and board inside the central 70% in both axes.',
        exclusion: 'None; no UI overlays the image.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAABQBQCdASoYAB4APu1usFCppqSiqAqpMB2JZwDI1DTv22b+pd2s+e0sdExVICoRO/xfcEAA/vKxzq3173pCcBupAgh4CPOYFYaUjRjvZH5rC/P0Od2nerFKjtOacVyDr6dSrr+7E5yKJTT2/Jj7IwAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A teacher seen entirely from behind, silhouetted against a large blank dark board lit by a warm spotlight from above, one arm raised holding a marker as if about to write; nothing is written on the board. Deep shadow around the edges. The figure in the central 60% of the width, no face, no profile. Framing: 4:5 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 717324,
        jobId: '1l26VQWr4r',
        generatedAt: '2026-10-06T00:23:42Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: an open laptop with a maker’s logo on the teacher’s desk)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '341f3129820a0d3141260b656a2742f70e790e33abdacba01d5eb2742f3dc86a',
      },
    },
    {
      key: 'home-cta',
      purpose: 'Home › Enrolment is open (cta), the wide plate behind the beam',
      ratio: '16:9',
      master: { width: 2400, height: 1350 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'An empty lecture hall at night with rows of seats lit by a single beam of light',
        ar: 'قاعة محاضرات خالية ليلًا بصفوف من المقاعد يضيئها شعاع ضوء واحد',
      },
      direction:
        'A wide view of an empty tiered lecture hall at night, rows of plain seats and desks descending towards a blank dark board, one diagonal warm beam of light from a projector cutting across the room, everything else in deep blue shadow. No people, no screens. Low-key tones that sit under a dark overlay.',
      composition: {
        slot: 'Home › cta, the wide plate in the closing block',
        crops: [
          { breakpoint: 'desktop', ratio: '16:9', width: '~960px' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea: 'The beam and the rows inside the central 70% of the width.',
        exclusion:
          'Edges fall off to dark so the plate blends into the night block.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAADwAwCdASoYAA4APu1mqk2ppaQiMAgBMB2JZwAAXn9vB2ooDdvN7slAAP7w3sdRxReaAlmXogmzoRggBd0FaTr9BsGgiMOtIPCGjAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'A wide view of an empty tiered lecture hall at night, rows of plain seats and desks descending towards a blank dark board, one diagonal warm beam of light from a projector cutting across the room, everything else in deep blue shadow. No people, no screens. Low-key tones that sit under a dark overlay. Framing: 16:9 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 455402,
        jobId: 'Iflr4eftvE',
        generatedAt: '2026-10-06T00:23:44Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 1 of 2 (1 rejected: a closed laptop with a visible maker’s logo in the foreground)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          'a294316aca1f5fa551c8f0e099c237a317d8a53c61f35681cbafe74019d5e60c',
      },
    },
    {
      key: 'courses-launching',
      purpose:
        'Featured courses empty state: the plate above "courses launching soon"',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A stack of new plain notebooks and pens on a desk under a warm lamp',
        ar: 'رزمة من الدفاتر الجديدة البسيطة وأقلام على مكتب تحت مصباح دافئ',
      },
      direction:
        'A neat stack of new plain notebooks with unmarked covers and a few pens beside them on a dark wooden desk, lit by a warm lamp from one side, the feeling of a new term about to begin. The stack in the centre of the frame inside the middle 60% of the width, dark calm space around it.',
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
      lqip: 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAABQBACdASoYABAAPu1iqk2ppaQiMAgBMB2JYwC7ACFsm8bpcED8Koy0TCZIAP6mx0JINGzO+mmpX3dk04rhKsSme6VHeSYlaYK5GaByXUwUl9oDefB0LOAAAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'A neat stack of new plain notebooks with unmarked covers and a few pens beside them on a dark wooden desk, lit by a warm lamp from one side, the feeling of a new term about to begin. The stack in the centre of the frame inside the middle 60% of the width, dark calm space around it. Framing: 3:2 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 167644,
        jobId: '6A8eu4UiJO',
        generatedAt: '2026-10-06T00:23:49Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: a laptop and a phone behind the stack)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '9dd6037af59e31bbea5a2fd3d4562a7fcd0c8f950a61314b4b609e482b06e1c8',
      },
    },
    {
      key: 'about-header',
      purpose: 'About › banner block, the wide image tile',
      ratio: '21:9',
      master: { width: 2800, height: 1200 },
      widths: [800, 1280, 1920, 2560],
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A classroom seen from the back rows, desks facing a blank board under warm light',
        ar: 'فصل دراسي يظهر من الصفوف الخلفية، مقاعد تواجه سبّورة فارغة تحت ضوء دافئ',
      },
      direction:
        'A wide view of an empty classroom from the back rows: rows of plain wooden desks and chairs facing a large blank dark board, a warm light over the board and cooler shadow at the back of the room, a window with dusk light on one side. The desks are completely bare: no laptops, no phones, no papers, no books on any desk. No people, no writing.',
      composition: {
        slot: 'About › pageHeader, the full-width image tile under the banner',
        crops: [
          { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
          { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
          { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
        ],
        safeArea:
          'The board and desks inside the central 60% of the width and y 0.25–0.8.',
        exclusion: 'None; text sits above the tile, not over it.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAACwAwCdASoYAAoAPu1mq04ppaQiMAgBMB2JZQC7ABAU59/JyAvEAAD+6iM6qhtFvX/tm7Dovg3unDTgF0U0hBPzkOhmny0Oi1hD04kqAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 21:9',
        prompt:
          'A wide view of an empty classroom from the back rows: rows of plain wooden desks and chairs facing a large blank dark board, a warm light over the board and cooler shadow at the back of the room, a window with dusk light on one side. The desks are completely bare: no laptops, no phones, no papers, no books on any desk. No people, no writing. Framing: 21:9 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 270810,
        jobId: 'jUzRmcBLD0',
        generatedAt: '2026-10-06T00:39:39Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 6 of 6 (first pair rejected: a laptop with a maker’s logo, papers with writing and students’ hands on the desks; the direction was tightened to bare desks and re-rendered twice; the fifth showed an unlit monitor on the teacher’s desk)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          'd09f41a72469fe9c66bc940ae5061a260608eeb28f825b4838247ae367a5859a',
      },
    },
    {
      key: 'about-story',
      purpose: 'About › story (featureSplit), the slanted image',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_PORTRAIT,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A student seen from behind, studying at a desk by a window at dusk',
        ar: 'طالب يظهر من الخلف يذاكر على مكتب بجوار نافذة عند الغسق',
      },
      direction:
        'A student seen from behind, in soft silhouette, seated at a desk by a window with deep blue dusk light, a warm lamp lighting an open notebook and a stack of plain textbooks. No face visible; the figure, desk and window inside the central 70% of the width.',
      composition: {
        slot: 'About › featureSplit, the image beside the story',
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
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAACQBACdASoYAB4APtFWoU2oJKMiN+gBABoJZgC7ACSXSNBFB29Z9nM0pmkaRgAA/vKw3xSYKLbqv+qqe9s/TWbNxNDvUVSKtujlruvFjRwbKhfBoazRkdLz7LubEdtNjlBjSKt/S+2mVnEaqNBjQE5fje2oSuS27avqEAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A student seen from behind, in soft silhouette, seated at a desk by a window with deep blue dusk light, a warm lamp lighting an open notebook and a stack of plain textbooks. No face visible; the figure, desk and window inside the central 70% of the width. Framing: 4:5 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 836778,
        jobId: 'rgAiMrVxtc',
        generatedAt: '2026-10-06T00:23:54Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: a partial profile of the student’s face, a laptop with a maker’s logo and a lit phone)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          'bd7d3db090b3a29e83afc9034d073c2c92bde27fd24912abc342dbf464cb06bb',
      },
    },
    {
      key: 'gallery-1',
      purpose: 'Gallery › mosaic, tile 1 (tall)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_SMALL,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A hand writing in a notebook under a desk lamp',
        ar: 'يد تكتب في دفتر تحت مصباح مكتب',
      },
      direction:
        'Close view of a hand holding a pen over an open notebook with blank pages, lit by a warm desk lamp, deep shadow around; only the hand and forearm in frame, no face, nothing legible on the page.',
      composition: {
        slot: 'Gallery › mosaic, a tall tile',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~420px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'The hand and page inside the central 70%.',
        exclusion: 'None; the caption sits under the tile.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRrAAAABXRUJQVlA4IKQAAABwBQCdASoYAB4APtlcpU2oJaOiN/qoAQAbCWIAsOx7XGUCvvWC4mYdeLTocCOTvH44+i4AAP78SevE6TrtnvIbRybhKRz3cnybyhhcRwI0kTp2aRQMKmVs9scjTL8iPFhNvMbMFKCzVorKdgI5Omnu+eXiP28AoIiIeyJxH5moCo6zaSx1fmJxw+JoyaZk65ktvwLR8bWGUH7hVQ6mgq2IAgAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'Close view of a hand holding a pen over an open notebook with blank pages, lit by a warm desk lamp, deep shadow around; only the hand and forearm in frame, no face, nothing legible on the page. Framing: 4:5 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 568226,
        jobId: 'gOcGoU0SXO',
        generatedAt: '2026-10-06T00:23:56Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 1 of 2 (1 rejected: readable titles on book covers behind the hand)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '61c1575094c0a035cc328b378ca9102429a0eb87604f38933865268a0093171d',
      },
    },
    {
      key: 'gallery-2',
      purpose: 'Gallery › mosaic, tile 2 (wide)',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Students seen from behind in a lecture hall, facing a lit blank board',
        ar: 'طلاب يظهرون من الخلف في قاعة محاضرات يواجهون سبّورة فارغة مضاءة',
      },
      direction:
        'The back rows of a lecture hall seen from directly behind: several students visible only as the backs of heads, hair and shoulders, all facing straight ahead towards a large blank board lit warmly at the front, the hall in cool shadow. The desks in front of them are completely bare: no papers, no notebooks, no books, no phones, no laptops. No faces, no profiles, no cheeks or glasses visible, no one turning, nothing written.',
      composition: {
        slot: 'Gallery › mosaic, a wide tile',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~640px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The rows and board inside the central 80% of the width.',
        exclusion: 'None; the caption sits under the tile.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAQBACdASoYABAAPu1orU6ppiSiMAgBMB2JQAqIULNaXMQM50jFcD8VAAD+7qCvdnvUaI76Lg9O/qzUvNWmCF9kY2x75Xp7LjSM3V7Fbi9yzyngH1ciaraA9wWhAAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'The back rows of a lecture hall seen from directly behind: several students visible only as the backs of heads, hair and shoulders, all facing straight ahead towards a large blank board lit warmly at the front, the hall in cool shadow. The desks in front of them are completely bare: no papers, no notebooks, no books, no phones, no laptops. No faces, no profiles, no cheeks or glasses visible, no one turning, nothing written. Framing: 3:2 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 274778,
        jobId: 'IflrA7ytvE',
        generatedAt: '2026-10-06T00:39:41Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 5 of 6 (first pair rejected: partial faces at the frame edge and exam sheets with readable writing; the direction was tightened to bare desks and heads fully from behind and re-rendered twice; the sixth showed a partial profile)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          'c232abc74668818eee48ce3a937dbe8b9fc56f21a175babc4ee7f493e2e209f3',
      },
    },
    {
      key: 'gallery-3',
      purpose: 'Gallery › mosaic, tile 3 (square)',
      ratio: '1:1',
      master: { width: 2000, height: 2000 },
      widths: W_SMALL,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A stack of plain textbooks with a pair of glasses on top, lit from the side',
        ar: 'رزمة كتب دراسية بسيطة فوقها نظارة، مضاءة من الجانب',
      },
      direction:
        'Still life on a dark desk: a stack of plain hardcover textbooks with unmarked spines and covers, a pair of glasses resting on top, a pencil beside, warm raking light from one side and deep shadow.',
      composition: {
        slot: 'Gallery › mosaic, a square tile',
        crops: [
          { breakpoint: 'desktop', ratio: '1:1', width: '~420px' },
          { breakpoint: 'tablet', ratio: '1:1', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '1:1', width: '100vw' },
        ],
        safeArea: 'Objects inside the central 70%.',
        exclusion: 'None; the caption sits under the tile.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnIAAABXRUJQVlA4IGYAAAAwBQCdASoYABgAPuFgpU2opiOiN/VYARAcCWUArhwQ8CY7hDJPSoLlXoC0MahpX8a1YAD+8qutGoLEjLO1lm9GCHhqzmhF7L15EPwiag5IThp6HymTcjJeLlpSCnFci0CgRFWAAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 1:1',
        prompt:
          'Still life on a dark desk: a stack of plain hardcover textbooks with unmarked spines and covers, a pair of glasses resting on top, a pencil beside, warm raking light from one side and deep shadow. Framing: 1:1 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 411683,
        jobId: 'gOcGoODSXO',
        generatedAt: '2026-10-06T00:24:01Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: a sheet with faint writing at the frame edge)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          'd7ee2f8e970c5fe8c63f2f791e0c3dc631fe9fa701ff5431f592af9236e1dd9a',
      },
    },
    {
      key: 'gallery-4',
      purpose: 'Gallery › mosaic, tile 4 (tall)',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_SMALL,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'A blank whiteboard with markers on its ledge under a spotlight',
        ar: 'سبّورة بيضاء فارغة على حافتها أقلام تحت ضوء كاشف',
      },
      direction:
        'A blank whiteboard on a dark wall lit by a warm spotlight from above, its ledge holding a few plain markers and an eraser, the rest of the room in shadow. Nothing is written on the board.',
      composition: {
        slot: 'Gallery › mosaic, a tall tile',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~420px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
        ],
        safeArea: 'The board and ledge inside the central 80%.',
        exclusion: 'None; the caption sits under the tile.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAABwBQCdASoYAB4APuVepU2pJSOiMAwBIByJZQC/7CG0x86p3gyA45eom+gC7zIt+QI5xIeQAP7u2eLcsO16+rHyXZodGjGTFRsqie77cikO6vbgIN/9Gv8Mt7mYJc7CIktUMYmDDAKxWZJQuF+FpscF4XAjsnvEC/pGG4oAAAA=',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A blank whiteboard on a dark wall lit by a warm spotlight from above, its ledge holding a few plain markers and an eraser, the rest of the room in shadow. Nothing is written on the board. Framing: 4:5 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 393214,
        jobId: 'EbyUA5BuuO',
        generatedAt: '2026-10-06T00:24:03Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: a partial face at the frame edge, branded markers and a laptop)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '53a17d9cc4448b30448ce1ed46a78ab0fd2cb1e1772e1e7860f55f730e1e4e65',
      },
    },
    {
      key: 'gallery-5',
      purpose: 'Gallery › mosaic, tile 5 (wide)',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_LANDSCAPE,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'Hands over blank exam sheets and pencils on a long desk, seen from above',
        ar: 'أيدٍ فوق أوراق امتحان فارغة وأقلام رصاص على مكتب طويل، من الأعلى',
      },
      direction:
        'Top-down view of a long desk during a practice session: several pairs of hands over blank white sheets of paper, pencils, an eraser and a plain water bottle, lit by a warm lamp with cool shadow at the edges; only hands and sleeves visible, nothing written on the sheets.',
      composition: {
        slot: 'Gallery › mosaic, a wide tile',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~640px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'Hands and sheets inside the central 85% of the width.',
        exclusion: 'None; the caption sits under the tile.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAADQAwCdASoYABAAPu1iqk2ppaQiMAgBMB2JQBOkERhXEgTFk1Bj9MAA/undEkjpUwNv6C8QJbwaNtLVD4wbCr6VrBqSmvymXz94w0v/bHZr3HH2tC/ozJvMmyjlZrD2iNSV02zy75nbt9lHeauqrL0Mf5hXvoQHHc/18AAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'Top-down view of a long desk during a practice session: several pairs of hands over blank white sheets of paper, pencils, an eraser and a plain water bottle, lit by a warm lamp with cool shadow at the edges; only hands and sleeves visible, nothing written on the sheets. Framing: 3:2 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 707938,
        jobId: 'KLR9Tgnkqp',
        generatedAt: '2026-10-06T00:24:06Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (both compliant; chosen for the lamp as the visible key light)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          'd004506d34fd3f86358c95c10768cf68863ea8be0d223ef0a09488d7e4072a49',
      },
    },
    {
      key: 'auth-side',
      purpose: 'Sign in / sign up › the night panel image beside the form',
      ratio: '4:5',
      master: { width: 2000, height: 2500 },
      widths: W_SMALL,
      focal: { x: 0.5, y: 0.55 },
      alt: {
        en: 'An empty desk with a lamp switched on and an open notebook, waiting',
        ar: 'مكتب خالٍ عليه مصباح مضاء ودفتر مفتوح، في انتظار صاحبه',
      },
      direction:
        'A single empty study desk at night with a warm lamp switched on over an open blank notebook and a pen, a chair pulled out as if waiting for someone, the room behind in deep blue shadow. Minimal and welcoming; the desk in the lower half, dark calm space above.',
      composition: {
        slot: 'Auth frame, the night panel image (hidden on phones)',
        crops: [
          { breakpoint: 'desktop', ratio: '4:5', width: '~480px' },
          { breakpoint: 'tablet', ratio: '4:5', width: '~40vw' },
          { breakpoint: 'mobile', ratio: 'hidden', width: '0' },
        ],
        safeArea:
          'The desk and lamp inside the central 80% of the width and y 0.45–0.95.',
        exclusion:
          'The academy name sits over the upper third: keep it dark and calm.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAAAwBACdASoYAB4APulep02pJSOjN/VYASAdCUAU4oo9xXBt6JEPSlpGbgAA/vGt53nozCwpVkvGf6W1LIg/Pd0KdbeNRVucyTUbOJCgbkeb4A5ZHEzZCDgi6CEs3urayccYCAAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 4:5',
        prompt:
          'A single empty study desk at night with a warm lamp switched on over an open blank notebook and a pen, a chair pulled out as if waiting for someone, the room behind in deep blue shadow. Minimal and welcoming; the desk in the lower half, dark calm space above. Framing: 4:5 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 629462,
        jobId: 'jUzReyXLD0',
        generatedAt: '2026-10-06T00:24:08Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 1 of 2 (1 rejected: an open laptop and a phone on the desk)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '0e443d234f9b25fe7887b46d2160d5caf150d7f2b5b41dff5dd855220de2375b',
      },
    },
    {
      key: 'course-fallback',
      purpose:
        'A course without its own thumbnail (poster cards, course details)',
      ratio: '3:2',
      master: { width: 2400, height: 1600 },
      widths: W_SMALL,
      focal: { x: 0.5, y: 0.5 },
      alt: {
        en: 'An open notebook and pen under a desk lamp on a dark desk',
        ar: 'دفتر مفتوح وقلم تحت مصباح مكتب على مكتب داكن',
      },
      direction:
        'A simple study still life: an open notebook with blank pages and a pen on a dark desk under a warm desk lamp, deep shadow around, nothing legible. Centred, with calm dark space on both sides so a title can sit below the image.',
      composition: {
        slot: 'Course poster cards and the Course Details header when a course has no thumbnail',
        crops: [
          { breakpoint: 'desktop', ratio: '3:2', width: '~480px' },
          { breakpoint: 'tablet', ratio: '3:2', width: '~45vw' },
          { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
        ],
        safeArea: 'The notebook inside the central 70% of the width.',
        exclusion:
          'A level pill sits in the top start corner: keep that corner dark and calm.',
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAADwAwCdASoYABAALrV2u12jqampiYC0SgCdAEN5Rsn5vOW9/5Zp54KgAP72qRDTE2okBCCOJ9QfWyoy6DK/ES23XhQyALWFzylp3bAYj/NLiPYzu7134aiCtx3dYQAA',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 3:2',
        prompt:
          'A simple study still life: an open notebook with blank pages and a pen on a dark desk under a warm desk lamp, deep shadow around, nothing legible. Centred, with calm dark space on both sides so a title can sit below the image. Framing: 3:2 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 348905,
        jobId: '0eHCleGTfW',
        generatedAt: '2026-10-06T00:25:24Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: a laptop and a phone beside the notebook)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '097e2e7f084595dae12b1c78d2ccd117809ffe617ac92ee0bcbe1dbd0103f434',
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
        en: 'A dark lecture hall with a single warm beam of light across the rows',
        ar: 'قاعة محاضرات مظلمة يعبر صفوفها شعاع ضوء دافئ واحد',
      },
      direction:
        'A dramatic wide view of a dark tiered lecture hall, a single warm diagonal beam of light crossing the empty rows towards a blank board, the rest in deep blue shadow; bold and cinematic. No people, no screens, nothing written. The beam and rows in the centre third of the frame.',
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
        rtl: NOT_MIRRORED,
      },
      budgetBytes: DEFAULT_BUDGET,
      status: 'released',
      version: 'v1',
      lqip: 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAADQAwCdASoYAA4APu1iqU2ppaOiMAgBMB2JQBOgBC2PZghS+HfUNWAAzjuAZEYivK3qHLp3F4UZ48tUNzA2xK3N46jw3ZOjqrE4W3U+sMAdqiMNjIAAAA==',
      provenance: {
        generator: 'magnific',
        tool: 'images_generate (text-to-image), Magnific MCP',
        model: 'Google Nano Banana Pro (imagen-nano-banana-2), 4k, 16:9',
        prompt:
          'A dramatic wide view of a dark tiered lecture hall, a single warm diagonal beam of light crossing the empty rows towards a blank board, the rest in deep blue shadow; bold and cinematic. No people, no screens, nothing written. The beam and rows in the centre third of the frame. Framing: 16:9 aspect ratio. Cinematic documentary photograph for an exam-preparation academy, photographic realism, high contrast, shallow depth of field. One warm directional key light (a desk lamp, a projector beam or a window at dusk) against deep cool shadows of charcoal and ink blue; low overall saturation so a brand colour can sit on top. Focused, determined, after-hours. Subjects are the places and materials of exam-season learning: desks and lamps, notebooks and blank exam sheets, lecture halls seen from the back rows, blank boards, stacked plain textbooks, hands writing; where a person appears they are seen from behind, in silhouette or cropped to hands and forearms, never as an identifiable portrait. Calm negative space in the shadows. Strictly avoid: No text, letters, numbers, formulas or readable writing anywhere; no logos, brand names or recognisable products; no lit or readable screens (a phone lies face down, a laptop is closed or seen from behind); no watermarks; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers.',
        seed: 604207,
        jobId: '8as19COIrU',
        generatedAt: '2026-10-06T00:25:26Z',
        reviewer:
          'Claude Code — full-frame and 100% detail review (faces, hands, readable marks, logos, screens, frame edges); candidate 2 of 2 (1 rejected: open notebooks with lined, writing-like pages on the desks)',
        reviewOutcome: 'approved',
        licenseBasis: MANARA_LICENSE_BASIS,
        masterSha256:
          '910a6ec387a4f1cf9a2159a55e0459ea159d3e312231a8efec371773e29c51cc',
      },
    },
  ],
};
