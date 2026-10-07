/**
 * Riwaq (Theme 4) asset manifest — the asset keys of
 * `Reports/THEME_4_RIWAQ_PLAN.md` §7.
 *
 * Riwaq's photographs are "daylight architecture": colonnades, arcades,
 * study halls, stairs and seminar rooms in crisp, cool morning light with
 * long parallel shadows, and the materials of professional study on pale
 * stone. Very low saturation, because the theme shows every photograph as
 * a monochrome in the Academy's brand hue that develops to colour on
 * hover. People appear only small, from behind or as hands, so no image
 * can be read as a real teacher or student of the Academy using it. The
 * art direction, crops, focal points, alt text and budgets are fixed here
 * and the generation prompt is built from them (`buildThemeAssetPrompt`).
 * An entry that isn't released renders its section's designed no-image
 * state.
 *
 * Slot keys match the other themes' where the slot exists (`home-benefit`
 * for the featureSplit image) so photographs follow a theme switch
 * (`adopt-theme-assets.ts`). The alt text matches the starter template's
 * (`atlas-backend/src/website/templates/riwaq.template.ts`).
 *
 * Releasing an entry: run `tools/theme-assets/prepare.mjs`, commit the
 * derivatives under `public/theme-assets/riwaq/<version>/`, then set
 * `status`, `version`, `lqip` and `provenance` here. Released folders are
 * immutable.
 */
import type {
  ThemeAssetEntry,
  ThemeAssetManifest,
  ThemeAssetProvenance,
} from '../theme-asset.types';

const HERO_BUDGET = 110_000;
const DEFAULT_BUDGET = 100_000;
const W_PORTRAIT = [480, 800, 1200, 1600];
const W_LANDSCAPE = [640, 1024, 1600];
const W_SMALL = [400, 800, 1200];
const W_BAND = [800, 1280, 1920, 2560];
const NOT_MIRRORED =
  'Layout mirrors in Arabic; the photograph is not mirrored.';
const PORTRAIT = { width: 2000, height: 2500 };
const LANDSCAPE = { width: 2400, height: 1600 };
const WIDE = { width: 2400, height: 1350 };
const BAND = { width: 2800, height: 1200 };

const ART_DIRECTION =
  'Editorial architecture and documentary photograph for a professional institute, photographic realism, crisp cool morning daylight, long parallel shadows and clean geometric light bands. Calm, precise, open, institutional. Palette of bone white, pale grey and soft stone with very low saturation, so a brand colour can tint it. Subjects are the places and materials of serious study: colonnades and arcades of plain square or round columns, study halls with long tables, seminar rooms, stairs, corridors, tall windows, plain notebooks, pens and steel rulers on pale stone; where a person appears they are small in the frame, seen from behind or cropped to hands, never as an identifiable portrait. Generous negative space, straight verticals.';
const EXCLUSIONS =
  'No text, letters, numbers or readable writing anywhere; no signage; no logos, brand names or recognisable products; no screens of any kind; no watermarks; no arches or domes; no illustration, poster or 3D render style; no identifiable faces and no recognisable real people; no distorted hands or extra fingers; no warm golden-hour or night lighting.';
const RIWAQ_LICENSE_BASIS =
  "Owner's explicit authorisation in the Theme 4 brief (7 Oct 2026) to use Magnific autonomously for all newly generated Theme 4 images, through Atlas's paid Magnific subscription active at generation, for Atlas Theme 4 production assets";

/** Every Riwaq photograph's provenance, before the parts derived from its entry. */
type DraftProvenance = Omit<ThemeAssetProvenance, 'prompt' | 'model'>;
type DraftEntry = Omit<ThemeAssetEntry, 'provenance'> & {
  readonly provenance?: DraftProvenance;
};

/** A photograph generated on Magnific and approved after a full-frame and 100% review. */
function released(fields: {
  readonly seed: number;
  readonly jobId: string;
  readonly generatedAt: string;
  readonly review: string;
  readonly masterSha256: string;
}): DraftProvenance {
  return {
    generator: 'magnific',
    tool: 'images_generate (text-to-image), Magnific MCP',
    seed: fields.seed,
    jobId: fields.jobId,
    generatedAt: fields.generatedAt,
    reviewer: `Claude Code — full-frame and 100% detail review (faces, hands, readable marks, numerals, logos, screens, frame edges); ${fields.review}`,
    reviewOutcome: 'approved',
    licenseBasis: RIWAQ_LICENSE_BASIS,
    masterSha256: fields.masterSha256,
  };
}

/**
 * The generation prompt is the entry's direction, framing, the art
 * direction and the exclusions — exactly `buildThemeAssetPrompt` (a test
 * holds them equal). It is derived here rather than stored, so the theme's
 * chunk carries each sentence once.
 */
const promptFor = (entry: DraftEntry): string =>
  [
    entry.direction,
    `Framing: ${entry.ratio} aspect ratio.`,
    ART_DIRECTION,
    `Strictly avoid: ${EXCLUSIONS}`,
  ].join(' ');

const ENTRIES: readonly DraftEntry[] = [
  {
    key: 'home-hero',
    purpose:
      'Home › Hero (Portico), the photograph window beside the headline (LCP image on desktop)',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_PORTRAIT,
    focal: { x: 0.5, y: 0.55 },
    alt: {
      en: 'A long stone colonnade in morning light, one person walking in the distance',
      ar: 'رواق حجري طويل في ضوء الصباح، وشخص يسير في آخره',
    },
    direction:
      'A long modern colonnade of slender pale stone columns receding in one-point perspective, morning sunlight cutting between the columns and laying long parallel shadow bands across a pale stone floor; one small figure seen from behind walking away near the far end. Vertical 4:5 framing; the vanishing point near the horizontal centre, slightly below mid-height; the columns and their shadows lead the eye in.',
    composition: {
      slot: 'Home › Hero, the photograph window between two column lines on the reading end side',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~560px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~44vw' },
        { breakpoint: 'mobile', ratio: '5:4', width: '100vw' },
      ],
      safeArea:
        'The vanishing point and figure inside x 0.3–0.7, y 0.35–0.75; the phone 5:4 crop keeps y 0.25–0.85.',
      exclusion:
        'The academy crest overlaps the bottom start corner (about 22% of the width); keep that corner calm floor.',
      rtl: NOT_MIRRORED,
    },
    priority: true,
    budgetBytes: HERO_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAAAQBQCdASoYAB4APu1kqk6ppaQiMBgMATAdiWcAAPB1L/lSWaqLuY1H7dzDv/7BqT8AAP6uwvKhnKMVRk88boVfTSiMNGRhYytfpHFxDz6SNZnvwvVVQjmKZih5BcnozbfHOYbQb2WqAAAA',
    provenance: released({
      seed: 198976,
      jobId: '4RXkwaz9Aa',
      generatedAt: '2026-10-07T01:13:44Z',
      review:
        'candidate 1 of 6 (5 rejected: 3, 4, 5 add a notebook and ruler to the floor (off-brief, reads staged); 2 weaker light; 6 runner-up (symmetrical, less depth on the crest corner))',
      masterSha256:
        'b77177b5a220827b7e8920f2d8eea653d63e099e7092b7958dd2707d63dcde2a',
    }),
  },
  {
    key: 'home-benefit',
    purpose:
      'Home › The learning experience (featureSplit), the photograph window',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_PORTRAIT,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A quiet study hall with long tables in morning light',
      ar: 'قاعة دراسة هادئة بطاولات طويلة في ضوء الصباح',
    },
    direction:
      'A quiet contemporary study hall in the morning: long pale oak tables in precise rows between tall vertical windows, clean shafts of daylight falling across the tables, two or three people far away seen from behind reading with plain notebooks. Vertical 4:5 framing; symmetrical, the rows receding to the centre.',
    composition: {
      slot: 'Home › featureSplit, the photograph beside the numbered points',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~520px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~44vw' },
        { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
      ],
      safeArea: 'The tables and windows inside the central 70% in both axes.',
      exclusion: 'None; no UI overlays the image.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAAAQBQCdASoYAB4APu1or0+ppaSiKAqpMB2JYwCdMoAE1qD0N/fBQ8QvqDt64v8ew/wAAP3STTVaOtvm3BeokQoUsFGogzlAXo0G4QT60fnaF2dJZ0PwjqQ7Pw9yaSQflciGrKiTlEQlu3fUP8ap8fNAAAA=',
    provenance: released({
      seed: 207969,
      jobId: '6A8xOufiJO',
      generatedAt: '2026-10-07T01:13:48Z',
      review:
        'candidate 3 of 4 (3 rejected: 1 busy with notebooks and a central divider, 2 cut table in the foreground, 4 people close enough to be read as individuals)',
      masterSha256:
        '7104915dc799ebb9659445d031d009023924df50d92a92b8322831f6bd1af7fa',
    }),
  },
  {
    key: 'home-method',
    purpose: 'Home › Course of study (steps), the plate beside the timeline',
    ratio: '3:2',
    master: LANDSCAPE,
    widths: W_LANDSCAPE,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'Hands writing in a notebook beside a ruler on a pale stone table',
      ar: 'يدان تكتبان في دفتر بجوار مسطرة على طاولة حجرية فاتحة',
    },
    direction:
      'Close top-down still life on a pale stone table in crisp morning daylight: a pair of hands writing in a plain notebook with a fine pen (the marks are abstract strokes, not letters), a steel ruler laid parallel beside it, sharp geometric window shadows falling diagonally across the table. Horizontal 3:2 framing; the hands and notebook in the central 60% of the width, clean stone around them.',
    composition: {
      slot: 'Home › steps, the plate above or beside the study timeline',
      crops: [
        { breakpoint: 'desktop', ratio: '3:2', width: '~560px' },
        { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
        { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
      ],
      safeArea: 'The hands and notebook inside the central 60% of the width.',
      exclusion: 'None; no UI overlays the image.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAAAwBACdASoYABAAPu1mqk4ppaOiMAgBMB2JYwCw7B09Gk44JJCzzAWYQNAA/t/ldp4E7poBr2i4LhjiwEi1npma1ItrK39tH1IEByDu8+NJ4ZSdHqMQXRSMAAA=',
    provenance: released({
      seed: 222071,
      jobId: 'ovLADPd829',
      generatedAt: '2026-10-07T01:13:50Z',
      review:
        'candidate 3 of 4 (3 rejected: 4 has pen marks that read as glyphs, 2 has a ruler with printed numbers, 1 low angle with cropped hands)',
      masterSha256:
        '5160d952cfbd9f27f57a917b82d1f5dd27dd3696e6b96054ef57512ead3c3ff3',
    }),
  },
  {
    key: 'home-cta',
    purpose:
      'Home › Enrol (cta), the band behind the closing invitation on the deep ground',
    ratio: '16:9',
    master: WIDE,
    widths: W_LANDSCAPE,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'Sunlight falling between columns onto a stone floor',
      ar: 'ضوء الشمس يتسلّل بين الأعمدة على أرضية حجرية',
    },
    direction:
      'A wide, calm view across a row of square stone pillars, bright morning sunlight falling between them and drawing strong parallel bands of light and shadow across an empty pale stone floor; nobody in the frame. Horizontal 16:9 framing; the pillars as a rhythm across the full width, the lower half mostly floor and light bands.',
    composition: {
      slot: 'Home › cta, a quiet band image under the deep ground',
      crops: [
        { breakpoint: 'desktop', ratio: '16:9', width: '~720px' },
        { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
        { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
      ],
      safeArea: 'The light bands inside the central 80% of the width.',
      exclusion: 'None; text sits beside, not on, the image.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAABwAwCdASoYAA4APu1yrU+pp6QiMAgBMB2JaQAAetG+8ast7GAA/uvTvTrIOyHEE18QFoF77dnOe5YPfq6XCsAA',
    provenance: released({
      seed: 467903,
      jobId: 'vQwcoZba47',
      generatedAt: '2026-10-07T01:13:54Z',
      review:
        'candidate 4 of 4 (3 rejected: 1 and 2 add notebooks/benches, 3 runner-up (busier column rhythm))',
      masterSha256:
        '3aca710ff03fef02363d27adb8e35f21bd349f6d612be3d29a3094dc07be9a70',
    }),
  },
  {
    key: 'courses-launching',
    purpose:
      'Programmes (featuredCourses/courseCatalog), the designed "programmes open soon" plate when no course is published',
    ratio: '3:2',
    master: LANDSCAPE,
    widths: W_LANDSCAPE,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'An empty seminar room with chairs set out in morning light',
      ar: 'قاعة نقاش خالية بكراسٍ مرتّبة في ضوء الصباح',
    },
    direction:
      'An empty, freshly prepared seminar room early in the morning: plain chairs set out in neat rows facing a blank pale wall, tall windows on one side throwing long parallel light bands across the floor and chairs; nobody present, a sense of a programme about to begin. Horizontal 3:2 framing; the rows in the central 70% of the width.',
    composition: {
      slot: 'Programmes empty state, the plate beside the "opening soon" copy',
      crops: [
        { breakpoint: 'desktop', ratio: '3:2', width: '~560px' },
        { breakpoint: 'tablet', ratio: '3:2', width: '~60vw' },
        { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
      ],
      safeArea: 'The chairs and windows inside the central 70% of the width.',
      exclusion: 'None; no UI overlays the image.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAACQAwCdASoYABAAPu1iqU2ppaOiMAgBMB2JZwAAQKruiIWAwny0AP7IS6qzdFWJsAbkX9EEKukfUr9dvR4O8NC5ecJJ3gKZ/A/+MAAA',
    provenance: released({
      seed: 889401,
      jobId: 'yie5SETPW9',
      generatedAt: '2026-10-07T01:13:56Z',
      review:
        'candidate 2 of 4 (3 rejected: 1 warm and flat light, 3 no light bands, 4 heavier grey chairs and a crowded foreground)',
      masterSha256:
        'ddb1af0d28994f2d3bb952c7c1e854dfc99a3e76348973d807219398f7d1f87b',
    }),
  },
  {
    key: 'about-header',
    purpose:
      'About › Plate (pageHeader), the wide photograph window under the title',
    ratio: '21:9',
    master: BAND,
    widths: W_BAND,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'An arcade of pale columns casting long shadows across a courtyard',
      ar: 'رواق من أعمدة فاتحة يلقي ظلالًا طويلة على فناء',
    },
    direction:
      'A wide panoramic view of a calm modern courtyard edged by an arcade of plain pale stone columns under a flat roof, low morning sun casting long parallel column shadows diagonally across the paved courtyard; one small figure far away walking along the arcade, seen from behind. Panoramic 21:9 framing; the arcade runs across the full width at mid-height, open pale sky in the top quarter.',
    composition: {
      slot: 'About › pageHeader, the full-width band under the plate title',
      crops: [
        { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
        { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
        { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
      ],
      safeArea:
        'The arcade and its shadows inside the central 60% of the width and y 0.25–0.8.',
      exclusion: 'None; the title sits above the image.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADwAwCdASoYAAoAPu1kqU2ppaQiMAgBMB2JYwCdACHXUvIlzGmbZS0UAP6YXFkESxSAnWUpsDL7FHzJy3E29QyyNGcAP8MYB7IetL49YAA=',
    provenance: released({
      seed: 446539,
      jobId: 'LwnakwDswO',
      generatedAt: '2026-10-07T01:14:54Z',
      review:
        'candidate 2 of 4 (3 rejected: 1 lop-sided composition, 3 tunnel arcade reads darker, 4 small figure lost in an empty court)',
      masterSha256:
        '9063afb3a8673757ca5c9f46938bece5423d31a9d4a364ba077ba15d42337143',
    }),
  },
  {
    key: 'about-story',
    purpose: 'About › Our story (featureSplit), the photograph window',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_PORTRAIT,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A wide stone staircase in a bright atrium seen from above',
      ar: 'درج حجري عريض في بهو مضيء من الأعلى',
    },
    direction:
      'A wide pale stone staircase in a bright, tall atrium seen from a high viewpoint, daylight from a long skylight falling in parallel bands across the steps; one small person seen from behind climbing the stairs. Vertical 4:5 framing; strong diagonal of the steps, the figure in the central third.',
    composition: {
      slot: 'About › featureSplit, the photograph beside the story points',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~520px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~44vw' },
        { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
      ],
      safeArea: 'The staircase and figure inside the central 70% in both axes.',
      exclusion: 'None; no UI overlays the image.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAAAQBQCdASoYAB4APu1ur1IppiQiqAgBMB2JaQDH5A6+v5EEkve14HpzZTUqfgLuCCPwAPcrT5zu+baFLmYd3eLOFq+oUemdrr1RtI7XWOC//cWRrrcxc24TWPalLNQnBQ1IiRGOxKok3S/YS7A+iw7VZhHAAA==',
    provenance: released({
      seed: 921885,
      jobId: 'xSGh5UujfW',
      generatedAt: '2026-10-07T01:14:56Z',
      review:
        'candidate 2 of 4 (3 rejected: 1 dark wall edge, 3 and 4 the figure close and tall in frame)',
      masterSha256:
        '284e38edfb81d63aa5439a83b2684437ba2c2767ffedc68bbb1afa8cd0e475fd',
    }),
  },
  {
    key: 'gallery-1',
    purpose: 'About › Colonnade gallery, bay 1 (tall)',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_SMALL,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'Light falling through tall windows onto rows of study tables',
      ar: 'ضوء يسقط من نوافذ عالية على صفوف طاولات الدراسة',
    },
    direction:
      'Tall windows in a pale study room, morning daylight falling through them in long bright rectangles across rows of empty light-wood study tables and chairs; nobody present. Vertical 4:5 framing; the windows in the upper half, the light rectangles on the tables in the lower half.',
    composition: {
      slot: 'About › gallery, a tall bay of the colonnade gallery',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~380px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
        { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
      ],
      safeArea: 'The windows and light inside the central 70% in both axes.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAAAQBQCdASoYAB4APu1or1AppaSiqAqpMB2JZQC84GlgKCg7/OTDuMfEy+clNq3nGnkAAP7oa5qeoDVNnc9Qu2plLy03957leqpG9c19SR1WyypLl+EG17C7vRlOMXjWyokU3TppmbGXWFCrfkqNhQW1MtotHQ0/BWSAAA==',
    provenance: released({
      seed: 252943,
      jobId: 'bxiBuss5Y2',
      generatedAt: '2026-10-07T01:14:59Z',
      review:
        'candidate 2 of 4 (3 rejected: 1 large empty sky windows, 3 and 4 no light on the tables)',
      masterSha256:
        '286ef852fd73d7974888cffa1a45c36b5814eb51a56a0b882d0f491a9c502293',
    }),
  },
  {
    key: 'gallery-2',
    purpose: 'About › Colonnade gallery, bay 2 (wide)',
    ratio: '3:2',
    master: LANDSCAPE,
    widths: W_LANDSCAPE,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A notebook, a pen and a steel ruler on a stone table',
      ar: 'دفتر وقلم ومسطرة معدنية على طاولة حجرية',
    },
    direction:
      'A precise still life from slightly above on a pale stone table: a closed plain grey notebook, a black fine pen laid parallel to it and a steel ruler, arranged at right angles, crisp morning window light throwing clean geometric shadows. Horizontal 3:2 framing; objects in the central 60%, lots of clean stone.',
    composition: {
      slot: 'About › gallery, a wide bay',
      crops: [
        { breakpoint: 'desktop', ratio: '3:2', width: '~560px' },
        { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
        { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
      ],
      safeArea: 'The objects inside the central 60% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAAAQBACdASoYABAAPu1oqk6ppiQiMAgBMB2JZQDE2BVfWOk4KpTNMozDgAD+xxWN/XnOfXBehZxjoFRx6FHpvJnltLvz0SrgcuWKKD80CJFDfDyOMEZGQ/vn+KMD3/fgAAA=',
    provenance: released({
      seed: 139474,
      jobId: 'DoK6cmCpcl',
      generatedAt: '2026-10-07T01:15:02Z',
      review:
        'candidate 1 of 4 (3 rejected: 4 and 3 rulers with printed numbers, 2 dark ground at the edges)',
      masterSha256:
        'b9296cd6f5187f97089735c90569d4361a2ed605fdbe00d520d797d02ecdb49c',
    }),
  },
  {
    key: 'gallery-3',
    purpose: 'About › Colonnade gallery, bay 3 (wide)',
    ratio: '3:2',
    master: LANDSCAPE,
    widths: W_LANDSCAPE,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A seminar room with chairs in a semicircle and morning light',
      ar: 'قاعة نقاش بكراسٍ على شكل نصف دائرة في ضوء الصباح',
    },
    direction:
      'A bright seminar room with plain chairs arranged in a semicircle around a low table, tall windows letting in cool morning light that lays long parallel bands across the floor; nobody present. Horizontal 3:2 framing; the semicircle in the central 70%.',
    composition: {
      slot: 'About › gallery, a wide bay',
      crops: [
        { breakpoint: 'desktop', ratio: '3:2', width: '~560px' },
        { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
        { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
      ],
      safeArea: 'The chairs inside the central 70% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAAAwBACdASoYABAAPu1iqk2ppaQiMAgBMB2JZQCdACHXS45dzerkcIZTLAAA/lI1OoF27Rca9Ro6FmSE4niw/FygPQePzrg8J7iwGdeAAAA=',
    provenance: released({
      seed: 757302,
      jobId: 'Sy0uLyJUb8',
      generatedAt: '2026-10-07T01:17:00Z',
      review:
        'candidate 4 of 4 (3 rejected: 1 crowded table with objects, 2 warm wood and wall panels, 3 a horseshoe of desks rather than a seminar circle)',
      masterSha256:
        'c2fcde1d36ac096d7ea54174791beb85d9fc9e61298b815ff2ab98f89e92f41f',
    }),
  },
  {
    key: 'gallery-4',
    purpose: 'About › Colonnade gallery, bay 4 (tall)',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_SMALL,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'Shelves of plain books along a quiet library aisle',
      ar: 'رفوف كتب في ممرّ مكتبة هادئ',
    },
    direction:
      'A quiet library aisle between tall pale shelves of plain books with blank, unmarked spines in soft grey and stone tones, cool daylight from a window at the far end of the aisle; nobody present. Vertical 4:5 framing; one-point perspective down the aisle, the window in the central third.',
    composition: {
      slot: 'About › gallery, a tall bay',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~380px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
        { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
      ],
      safeArea: 'The aisle and window inside the central 60% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAAAQBQCdASoYAB4APu1kq06ppaOiKA1RMB2JZwC9WA9fgCaAeZ68Tqjult0e3Pywz1gAAPicnxrPH1D3F2yKM1TQhFujMot2pnDdZbzsguOX4ZPO+amUVoFj5qPeSjJRTEycnLExoFwtoJ9YNCVqiHrck149018bZCUAAA==',
    provenance: released({
      seed: 446713,
      jobId: 'tCgnXlCmZJ',
      generatedAt: '2026-10-07T01:15:29Z',
      review:
        'candidate 2 of 4 (3 rejected: 4 shelf labels with numerals, 1 warm wood out of palette, 3 objects on a sill)',
      masterSha256:
        '33bf6f8fbbf3d449201eee4f2419f6fb58c2620ecfd8d96f1a5d801f8d7d99a9',
    }),
  },
  {
    key: 'gallery-5',
    purpose: 'About › Colonnade gallery, bay 5 (tall)',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_SMALL,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A person seen from behind at a tall window overlooking a courtyard',
      ar: 'شخص يُرى من الخلف أمام نافذة عالية تطلّ على فناء',
    },
    direction:
      'A person seen entirely from behind standing at a tall floor-to-ceiling window, looking out over a calm courtyard with a colonnade in soft morning light; the room around them pale and quiet, their figure partly in silhouette. Vertical 4:5 framing; the window and figure in the central 60%, no face, no profile.',
    composition: {
      slot: 'About › gallery, a tall bay',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~380px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~45vw' },
        { breakpoint: 'mobile', ratio: '4:5', width: '100vw' },
      ],
      safeArea: 'The figure and window inside the central 60% in both axes.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAQBQCdASoYAB4APuVkpE2pJiOiMAwBIByJZQCw7B6FZdBsfSadN3pu+gpQtBxAXoUIAPxcpn4YdJluao9aqweymc3kYkQnILK5rWZqaHlXepR0WDdX3GbsqVOHAuuFnkM95DCauiqcB0A5xONuOq0eo1coFjhTuf5WXxXyoboGgAAA',
    provenance: released({
      seed: 53964,
      jobId: 'DoK60tapcl',
      generatedAt: '2026-10-07T01:17:06Z',
      review:
        'candidate 4 of 4 (3 rejected: 1 figure too close, 2 and 3 lighter subject and cut desk)',
      masterSha256:
        '6820cbea0bc540ee1c58a602784a67353c2db6db4ec487788c12495c6b86d890',
    }),
  },
  {
    key: 'auth-side',
    purpose: 'Sign in / Sign up, the photograph window beside the form',
    ratio: '4:5',
    master: PORTRAIT,
    widths: W_SMALL,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A quiet reading corner by a tall window in morning light',
      ar: 'ركن قراءة هادئ بجوار نافذة عالية في ضوء الصباح',
    },
    direction:
      'A quiet reading corner beside a tall window: a plain light-wood chair and a small table with a closed notebook and a pen, morning daylight falling through the window in long parallel bands across the pale wall and floor; nobody present. Vertical 4:5 framing; the chair and table in the lower centre, calm wall above.',
    composition: {
      slot: 'Auth frame, the photograph window beside the form (hidden on phones)',
      crops: [
        { breakpoint: 'desktop', ratio: '4:5', width: '~480px' },
        { breakpoint: 'tablet', ratio: '4:5', width: '~40vw' },
        { breakpoint: 'mobile', ratio: 'hidden', width: '0' },
      ],
      safeArea:
        'The chair and table inside the central 70% of the width, y 0.45–0.9.',
      exclusion:
        'The academy crest overlaps the bottom start corner; keep it calm floor.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAACQBACdASoYAB4APu1qq04ppiQiMAgBMB2JaQDNhBujBSliH8oTI5LARCKoAkgA/pNvbkZni5Jnwzfl204CBEWrTvUWRNFrOhute8s1yDF5QPBCNPhfrAAA',
    provenance: released({
      seed: 653014,
      jobId: 'aF70t5TfSh',
      generatedAt: '2026-10-07T01:17:09Z',
      review:
        'candidate 4 of 4 (3 rejected: 1 chair cropped by the frame, 2 armchair small, 3 table blocks the crest corner)',
      masterSha256:
        '1cea24ccad0b3bcaf0c005baccdb2a7185ed9216d8409a72f1a98312faee0155',
    }),
  },
  {
    key: 'course-fallback',
    purpose:
      'A programme without its own image (explorer, catalogue sheet, dossier)',
    ratio: '3:2',
    master: LANDSCAPE,
    widths: W_SMALL,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'An open notebook with blank pages and a pen on a stone table',
      ar: 'دفتر مفتوح بصفحات فارغة وقلم على طاولة حجرية',
    },
    direction:
      'An open plain notebook with completely blank pages and a pen laid across it on a pale stone table, crisp morning window light throwing one clean diagonal shadow band across the pages. Horizontal 3:2 framing; the notebook in the central 60%, quiet and generic so it suits any programme.',
    composition: {
      slot: 'Programme image fallback in every course view',
      crops: [
        { breakpoint: 'desktop', ratio: '3:2', width: '~480px' },
        { breakpoint: 'tablet', ratio: '3:2', width: '~45vw' },
        { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
      ],
      safeArea: 'The notebook inside the central 60% in both axes.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAADQAwCdASoYABAAPu1krU2ppaSiMAgBMB2JZwAAW1iI0m91ekqSvAAA/a1zSOmlzpSUh8ZCM72FryhD/R9Bsa981w+ELz6D572fdeS8j/XVuSL4cChWdiSqU9MIwlTlQhQkDDAA',
    provenance: released({
      seed: 692111,
      jobId: 'u5PDajLQLD',
      generatedAt: '2026-10-07T01:17:11Z',
      review:
        'candidate 1 of 4 (3 rejected: 2 pen falls into the gutter, 3 classical columns, 4 window frame cuts the edge)',
      masterSha256:
        '992362496b09a7c05440c9de637011fbd7028c9928951842fb7684b24fedcf2e',
    }),
  },
  {
    key: 'theme-card',
    purpose: 'Dashboard › Website › Theme tab, the card that offers this theme',
    ratio: '16:9',
    master: WIDE,
    widths: [480, 800, 1200],
    focal: { x: 0.5, y: 0.5 },
    // The card's picture is decorative (the card names the theme); the
    // text exists for contexts without the card.
    alt: {
      en: 'A colonnade of slender columns with bands of morning light',
      ar: 'رواق من أعمدة نحيلة تتخلّله أشرطة من ضوء الصباح',
    },
    direction:
      'A striking side view of a long colonnade of slender pale columns, bright morning sun drawing a crisp rhythm of light and shadow bands across the floor and the columns; nobody present; graphic, architectural and serene. Horizontal 16:9 framing; the colonnade across the central band of the frame.',
    composition: {
      slot: 'Theme tab card, the picture above the theme name (about 7:3 crop)',
      crops: [
        { breakpoint: 'desktop', ratio: '7:3', width: '~480px' },
        { breakpoint: 'tablet', ratio: '7:3', width: '~45vw' },
        { breakpoint: 'mobile', ratio: '7:3', width: '100vw' },
      ],
      safeArea:
        'The colonnade inside the central 70% of the width and y 0.25–0.75.',
      exclusion: 'None; the theme name sits under the picture.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAABwAwCdASoYAA4APu1iqk4ppaQiMAgBMB2JZ2DrADc124tO08AA/uwT8n4XyQ7PzCY2KNBOzQEVFnu45F/BwAAA',
    provenance: released({
      seed: 495465,
      jobId: 'O6pbUIfynm',
      generatedAt: '2026-10-07T01:17:55Z',
      review:
        'candidate 2 of 6 (5 rejected: 1 crossed shadows, 3, 4 and 5 add objects, 6 flat facade)',
      masterSha256:
        'fbb7daa067ca90c1390b9351b0d7263a14ac0465eeff2e23b9516f63a12f21f2',
    }),
  },
  {
    key: 'courses-header',
    purpose: 'Programmes › Plate (pageHeader), the wide photograph window',
    ratio: '21:9',
    master: BAND,
    widths: W_BAND,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'Rows of long study tables under tall windows',
      ar: 'صفوف من طاولات الدراسة الطويلة تحت نوافذ عالية',
    },
    direction:
      'A wide panoramic view of a long reading hall: rows of long pale tables with plain lamps switched off, a wall of tall windows letting in cool morning light that falls in parallel bands across the tables; nobody present or only one tiny figure far away from behind. Panoramic 21:9 framing; the rows across the full width, horizon at mid-height.',
    composition: {
      slot: 'Programmes › pageHeader, the band under the plate title',
      crops: [
        { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
        { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
        { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
      ],
      safeArea: 'The tables and windows inside the central 60% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAABwAwCdASoYAAoAPu1orU2ppqSiMAgBMB2JZwAAQJChMDtsCuAA/fcs4WkhXbDM/0/R5PX+o8dlU2R3gVRTIEc8iJ1hqY8gAAA=',
    provenance: released({
      seed: 870146,
      jobId: 'IflzXPYtvE',
      generatedAt: '2026-10-07T01:17:59Z',
      review:
        'candidate 3 of 4 (3 rejected: 1 lop-sided, 2 crowded white desks, 4 heavy foreground objects)',
      masterSha256:
        '30418b62a98bb545357c5eb149893c83bc238624b17698a281db892eb1e5a698',
    }),
  },
  {
    key: 'faqs-header',
    purpose: 'FAQs › Plate (pageHeader), the wide photograph window',
    ratio: '21:9',
    master: BAND,
    widths: W_BAND,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A bright corridor of columns with light falling across the floor',
      ar: 'ممرّ مضيء من الأعمدة والضوء يتساقط على الأرض',
    },
    direction:
      'A bright interior corridor lined on one side by square pale columns and tall glazing, morning light falling through and laying a long sequence of parallel light bands across the polished pale floor; nobody present. Panoramic 21:9 framing; the corridor receding from one side towards the centre.',
    composition: {
      slot: 'FAQs › pageHeader, the band under the plate title',
      crops: [
        { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
        { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
        { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
      ],
      safeArea:
        'The columns and light bands inside the central 60% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADQAwCdASoYAAoAPu1iqU2ppaOiMAgBMB2JZQCdMoAC+tbMT/t1SjAA4U8hdcmUP8Vp+Y0z9ZfenQYwyYGggl/bmY3gAA==',
    provenance: released({
      seed: 298848,
      jobId: 'lJWCxLFgv9',
      generatedAt: '2026-10-07T01:18:56Z',
      review:
        'candidate 2 of 4 (3 rejected: 1 warm and empty, 3 a laptop-like object on a plinth, 4 objects on a ledge)',
      masterSha256:
        '723eaf01bdaf2d5275558130ea78ac163c5e49000bcbeecfcf0f00742119f0cc',
    }),
  },
  {
    key: 'contact-header',
    purpose: 'Contact › Plate (pageHeader), the wide photograph window',
    ratio: '21:9',
    master: BAND,
    widths: W_BAND,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A reception desk in a light stone hall',
      ar: 'مكتب استقبال في قاعة حجرية مضيئة',
    },
    direction:
      'A calm, light entrance hall of pale stone with a simple long reception desk of light stone and oak, unattended, a row of tall columns and windows behind letting in cool morning daylight in parallel bands; no signage, nothing on the desk except a closed notebook. Panoramic 21:9 framing; the desk in the central third.',
    composition: {
      slot: 'Contact › pageHeader, the band under the plate title',
      crops: [
        { breakpoint: 'desktop', ratio: '21:9', width: '100vw' },
        { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
        { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
      ],
      safeArea: 'The desk inside the central 50% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAAAQBACdASoYAAoAPu1orU2ppqSiMAgBMB2JZwDA3B6P3PP7S6qGpyfOQAD+yEqGLNlw0b60Po+H9mfwl7To2/bM9x3/1N9lJ6cVFaFAAAA=',
    provenance: released({
      seed: 583720,
      jobId: 'xSGhKxUjfW',
      generatedAt: '2026-10-07T01:18:59Z',
      review:
        'candidate 1 of 4 (3 rejected: 2 symmetrical but a book on the desk dominates, 3 desk turned away, 4 a tree and a cut corner)',
      masterSha256:
        'b2b65cccfdab7122cf80ec808ffe5d70b81af5f8f44ff06226ce9ef17fd38c4b',
    }),
  },
  {
    key: 'coming-soon',
    purpose: 'Coming Soon page, the photograph window beside the message',
    ratio: '16:9',
    master: WIDE,
    widths: W_LANDSCAPE,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'A new hall being prepared, chairs stacked in morning light',
      ar: 'قاعة جديدة قيد التجهيز وكراسٍ مكدّسة في ضوء الصباح',
    },
    direction:
      'A new, nearly finished hall being prepared: plain chairs neatly stacked, a stepladder against a pale wall, a row of fresh pale columns, and cool morning light streaming through tall windows in parallel bands across a clean stone floor; nobody present; a sense of opening soon. Horizontal 16:9 framing; the stack and ladder in the central 60%.',
    composition: {
      slot: 'Coming Soon, the photograph window beside the message',
      crops: [
        { breakpoint: 'desktop', ratio: '16:9', width: '~640px' },
        { breakpoint: 'tablet', ratio: '16:9', width: '100vw' },
        { breakpoint: 'mobile', ratio: '4:3', width: '100vw' },
      ],
      safeArea: 'The subject inside the central 60% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADwAwCdASoYAA4APu1kqk2ppaQiMAgBMB2JaQDE2CHw1gi2hzQUwrQ4AP7H2xOdrb6SzLYtttJ8cDVBoRvjgmZZNbpuUQiAAAA=',
    provenance: released({
      seed: 117016,
      jobId: 'fHJThUKCDY',
      generatedAt: '2026-10-07T01:19:41Z',
      review:
        'candidate 3 of 4 (3 rejected: 1 small subject, 2 a leaning chair stack, 4 warm chairs against a dim wall)',
      masterSha256:
        'd52bd3b2e76f70c84b940b671abea7cacbcf6d1c5d36fc5b65827be9b8969ac0',
    }),
  },
  {
    key: 'not-found',
    purpose: 'Not Found page, the photograph window beside the message',
    ratio: '3:2',
    master: LANDSCAPE,
    widths: W_SMALL,
    focal: { x: 0.5, y: 0.5 },
    alt: {
      en: 'An empty corridor turning a corner in daylight',
      ar: 'ممرّ خالٍ ينعطف عند زاوية في ضوء النهار',
    },
    direction:
      'An empty pale corridor that turns a corner at its far end, daylight coming from around the corner and laying soft light on the stone floor and walls, a single square column at the turn; nobody present; quiet, slightly mysterious, inviting. Horizontal 3:2 framing; the corner in the central third.',
    composition: {
      slot: 'Not Found, the photograph window beside the message',
      crops: [
        { breakpoint: 'desktop', ratio: '3:2', width: '~520px' },
        { breakpoint: 'tablet', ratio: '3:2', width: '100vw' },
        { breakpoint: 'mobile', ratio: '3:2', width: '100vw' },
      ],
      safeArea: 'The corner inside the central 50% of the width.',
      exclusion: 'None.',
      rtl: NOT_MIRRORED,
    },
    budgetBytes: DEFAULT_BUDGET,
    status: 'released',
    version: 'v1',
    lqip: 'data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAACQAwCdASoYABAAPu1orU6ppiSiMAgBMB2JZQAAQr4Y2PldPE4QAP3SMcQvxZRFoH77rFSRFFD+B2E3PTeX/9sSNfaDdPxZaN08MAAA',
    provenance: released({
      seed: 81994,
      jobId: 'iGIj9oU3uK',
      generatedAt: '2026-10-07T01:19:44Z',
      review:
        'candidate 1 of 4 (3 rejected: 2 open plan (no turn), 3 warm and dusty, 4 objects on a ledge)',
      masterSha256:
        '4cfe3849981a77264ebf32f04bb4ab141be78d148100071a06947cebef63595d',
    }),
  },
];

export const RIWAQ_ASSETS: ThemeAssetManifest = {
  theme: 'riwaq',
  artDirection: ART_DIRECTION,
  exclusions: EXCLUSIONS,
  formats: ['avif', 'webp'],
  assets: ENTRIES.map((entry) =>
    entry.provenance
      ? {
          ...entry,
          provenance: {
            ...entry.provenance,
            model: `Google Nano Banana Pro (imagen-nano-banana-2), 4k, ${entry.ratio}`,
            prompt: promptFor(entry),
          },
        }
      : (entry as ThemeAssetEntry)
  ),
};
