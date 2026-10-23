/**
 * CMS phase 3e — full page templates («صفحات جاهزة»): the sections of a
 * new custom page, so an Owner never starts from an empty page.
 *
 * A template is an ordered list of sections. Each is built at the moment
 * the page is created (fresh ids, the active theme's photographs, buttons
 * pointing at the Academy's own pages):
 *   - `fromPreset(type, key, edit?)` — a section preset, optionally with
 *     this template's own copy laid over it (`edit` returns the config);
 *   - `fromDefault(type, edit?)` — a type's own default content (the
 *     samples of the schedule and results, a live course spotlight…);
 *   - `fromStart(type, build)` — a section written out here in full.
 *
 * EXTENSION POINT — the flexible `custom` section (CMS phase 3c) is not on
 * this base. Once `custom` is a `SectionType`, a template includes one with
 * `fromStart('custom', …)` (or with `fromPreset('custom', …)` once it has
 * presets in `SECTION_PRESETS`); nothing else here changes, and
 * `page-templates.test.ts` validates it like every other section.
 *
 * Copy follows the presets' rule: no invented facts. A course's name,
 * a price, a teacher's biography are bracketed placeholders; testimonials,
 * results and the timetable are samples that never reach the public site.
 */
import {
  BookOpenCheck,
  Building2,
  Megaphone,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type {
  SectionConfigMap,
  SectionDesign,
  SectionInstance,
  SectionType,
} from '@types';
import { getDefaultSectionConfig } from '../sections/section-metadata.registry';
import type { PresetBuildContext, SectionStart } from './section-presets.types';
import { presetsFor, sectionFromStart } from './section-presets.registry';
import {
  lt,
  newItemId,
  pageButton,
  ph,
  signUpButton,
  themePhoto,
  whatsappButton,
} from './preset-content.utils';

/** One section of a template, built when the page is created. */
export interface PageTemplateSection {
  readonly type: SectionType;
  /** The preset it starts from, if any (`<type>.<key>`). */
  readonly presetId?: string;
  readonly build: (context: PresetBuildContext) => SectionStart;
}

export interface PageTemplate {
  /** Labels: `website:templates.<key>.name` / `.description` / `.pageTitle`. */
  readonly key: string;
  /** The suggested address; made unique against the Academy's pages when offered. */
  readonly slug: string;
  readonly icon: LucideIcon;
  readonly sections: readonly PageTemplateSection[];
}

type Edit<TType extends SectionType> = (
  config: SectionConfigMap[TType],
  context: PresetBuildContext
) => SectionConfigMap[TType];

interface Overrides<TType extends SectionType> {
  readonly edit?: Edit<TType>;
  /** Replaces the preset's design; `null` removes it. */
  readonly design?: SectionDesign | null;
}

function withOverrides<TType extends SectionType>(
  start: SectionStart<TType>,
  context: PresetBuildContext,
  { edit, design }: Overrides<TType>
): SectionStart<TType> {
  const config = edit ? edit(start.config, context) : start.config;
  const nextDesign = design === undefined ? start.design : design;
  return nextDesign ? { config, design: nextDesign } : { config };
}

export function fromPreset<TType extends SectionType>(
  type: TType,
  key: string,
  overrides: Overrides<TType> = {}
): PageTemplateSection {
  const preset = presetsFor(type).find((candidate) => candidate.key === key);
  if (!preset) throw new Error(`Unknown preset ${type}.${key}`);
  return {
    type,
    presetId: `${type}.${key}`,
    build: (context) =>
      withOverrides(preset.build(context), context, overrides) as SectionStart,
  };
}

export function fromDefault<TType extends SectionType>(
  type: TType,
  overrides: Overrides<TType> = {}
): PageTemplateSection {
  return {
    type,
    build: (context) =>
      withOverrides(
        { config: getDefaultSectionConfig(type) },
        context,
        overrides
      ) as SectionStart,
  };
}

export function fromStart<TType extends SectionType>(
  type: TType,
  build: (context: PresetBuildContext) => SectionStart<TType>
): PageTemplateSection {
  return { type, build: build as PageTemplateSection['build'] };
}

const REGISTER_NOW = lt('Register now', 'سجّل الآن');

const courseLanding: PageTemplate = {
  key: 'courseLanding',
  slug: 'course',
  icon: BookOpenCheck,
  sections: [
    fromPreset('hero', 'imageBeside', {
      edit: ({ highlight: _highlight, ...hero }, context) => ({
        ...hero,
        eyebrow: ph('Grade and subject', 'الصف والمادة'),
        title: ph('Course name', 'اسم الدورة'),
        description: ph(
          'Who the course is for, and what students will be able to do by the end',
          'لمن هذه الدورة، وما الذي سيستطيع الطالب فعله في نهايتها'
        ),
        cta: signUpButton(REGISTER_NOW),
        secondaryCta: whatsappButton(lt('Ask on WhatsApp', 'اسأل على واتساب')),
        highlights: [
          ph('Course length', 'مدة الدورة'),
          ph('Number of lessons', 'عدد الدروس'),
          ph('Start date', 'تاريخ البدء'),
        ].map((label) => ({ id: newItemId(), label })),
        image: themePhoto(context, 'home-hero'),
      }),
    }),
    // The real course's outcomes and syllabus, read live (the newest
    // published course until the Owner picks one).
    fromDefault('courseSpotlight', {
      edit: (spotlight) => ({
        ...spotlight,
        eyebrow: lt('Course outline', 'محتوى الدورة'),
      }),
    }),
    fromPreset('featureSplit', 'imageStart', {
      edit: (split) => ({
        ...split,
        eyebrow: lt('Inside the course', 'داخل الدورة'),
        title: lt('What the course includes', 'ما تتضمّنه الدورة'),
        items: [
          ph('First thing included', 'أول ما تتضمّنه الدورة'),
          ph('Second thing included', 'ثاني ما تتضمّنه الدورة'),
          ph('Third thing included', 'ثالث ما تتضمّنه الدورة'),
        ].map((title) => ({ id: newItemId(), title })),
        cta: undefined,
      }),
    }),
    fromPreset('timeline', 'course'),
    fromPreset('pricing', 'single'),
    fromPreset('testimonials', 'students'),
    fromPreset('faq', 'online'),
    fromPreset('countdown', 'registration'),
    fromPreset('cta', 'register', {
      edit: (cta) => ({
        ...cta,
        title: lt('Join the next group', 'انضم إلى المجموعة القادمة'),
        description: lt(
          'Create your account to register in the course.',
          'أنشئ حسابك لتسجّل في الدورة.'
        ),
      }),
    }),
  ],
};

const teacherProfile: PageTemplate = {
  key: 'teacherProfile',
  slug: 'teacher',
  icon: UserRound,
  sections: [
    fromPreset('hero', 'imageBeside', {
      edit: ({ highlight: _highlight, ...hero }, context) => ({
        ...hero,
        eyebrow: ph('Subject and grades', 'المادة والمراحل'),
        title: ph('Teacher name', 'اسم المدرّس'),
        description: ph(
          'A short introduction: experience, qualifications and teaching style',
          'تعريف قصير: الخبرة والمؤهلات وأسلوب التدريس'
        ),
        highlights: [
          ph('Years of experience', 'سنوات الخبرة'),
          ph('Subjects', 'المواد'),
          ph('Grades', 'المراحل'),
        ].map((label) => ({ id: newItemId(), label })),
        cta: signUpButton(lt('Join the classes', 'انضم إلى الحصص')),
        secondaryCta: pageButton(
          context,
          'courses',
          lt('See the courses', 'شاهد الدورات')
        ),
      }),
    }),
    fromPreset('about', 'story', {
      edit: (about) => ({
        ...about,
        title: lt('About the teacher', 'عن المدرّس'),
        body: ph(
          'The teacher’s story: studies, experience and why they teach',
          'قصة المدرّس: الدراسة والخبرة ولماذا اختار التدريس'
        ),
      }),
    }),
    fromPreset('features', 'cards', {
      edit: (features) => ({
        ...features,
        title: lt('In the classroom', 'داخل الفصل'),
        description: undefined,
        items: [
          ['GraduationCap', 'Explanation', 'الشرح'],
          ['BookOpen', 'Practice', 'التدريب'],
          ['Users', 'Follow-up', 'المتابعة'],
        ].map(([icon, en, ar]) => ({
          id: newItemId(),
          icon,
          title: lt(en, ar),
          description: ph(
            'How the teacher does it, in one sentence',
            'كيف يقدّمه المدرّس، في جملة واحدة'
          ),
        })),
      }),
    }),
    fromDefault('schedule', {
      edit: (schedule) => ({
        ...schedule,
        title: lt('Class times', 'مواعيد الحصص'),
      }),
    }),
    fromDefault('results'),
    fromDefault('featuredCourses', {
      edit: (courses) => ({
        ...courses,
        title: lt('Courses', 'الدورات'),
        count: 3,
      }),
    }),
    fromPreset('testimonials', 'students'),
    fromPreset('whatsappBar', 'chat'),
  ],
};

const offers: PageTemplate = {
  key: 'offers',
  slug: 'offers',
  icon: Megaphone,
  sections: [
    fromPreset('hero', 'centered', {
      edit: (hero) => ({
        ...hero,
        title: lt('Offers and registration', 'العروض والتسجيل'),
        description: ph(
          'What is on offer this term, and who it is for',
          'ما العروض المتاحة هذا الترم، ولمن هي'
        ),
        secondaryCta: whatsappButton(lt('Ask on WhatsApp', 'اسأل على واتساب')),
      }),
    }),
    // Under the opening scene: a page that opens with its hero needs no
    // theme intro above it.
    fromPreset('announcementBar', 'offer'),
    fromPreset('pricing', 'subjects'),
    fromPreset('countdown', 'offer'),
    fromPreset('steps', 'register'),
    fromPreset('interestForm', 'grades'),
    fromPreset('faq', 'registration'),
    fromPreset('whatsappBar', 'register'),
  ],
};

const aboutAcademy: PageTemplate = {
  key: 'aboutAcademy',
  slug: 'our-academy',
  icon: Building2,
  sections: [
    fromStart('pageHeader', (context) => ({
      config: {
        title: lt('About the academy', 'عن الأكاديمية'),
        description: ph(
          'One sentence that sums up the academy',
          'جملة واحدة تلخّص الأكاديمية'
        ),
        image: themePhoto(context, 'about-header'),
        search: 'none',
      },
    })),
    fromPreset('about', 'story'),
    fromPreset('statistics', 'live'),
    fromPreset('features', 'cards'),
    fromDefault('instructors', {
      edit: (instructors) => ({
        ...instructors,
        title: lt('Our teachers', 'مدرّسونا'),
      }),
    }),
    fromPreset('testimonials', 'parents'),
    fromPreset('contact', 'details'),
    fromPreset('cta', 'register'),
  ],
};

/** The templates, in the order the new-page dialog offers them. */
export const PAGE_TEMPLATES: readonly PageTemplate[] = [
  courseLanding,
  teacherProfile,
  offers,
  aboutAcademy,
];

export function findPageTemplate(key: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find((template) => template.key === key);
}

export function pageTemplateLabelKeys(template: Pick<PageTemplate, 'key'>): {
  readonly name: string;
  readonly description: string;
  readonly pageTitle: string;
} {
  const base = `website:templates.${template.key}`;
  return {
    name: `${base}.name`,
    description: `${base}.description`,
    pageTitle: `${base}.pageTitle`,
  };
}

/**
 * A template's sections, built for this Academy and theme. Keys whose value
 * is `undefined` (a field a template removed) are dropped, so the sections
 * are exactly what the API will store.
 */
export function buildTemplateSections(
  template: PageTemplate,
  context: PresetBuildContext
): SectionInstance[] {
  return template.sections.map((section) => {
    const start = section.build(context);
    return sectionFromStart(section.type, {
      ...start,
      config: dropUndefined(start.config),
    });
  });
}

function dropUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(dropUndefined) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, dropUndefined(child)])
    ) as T;
  }
  return value;
}

/** A slug for the template that no page of the Academy has yet (`course`, `course-2`…). */
export function availableTemplateSlug(
  template: Pick<PageTemplate, 'slug'>,
  pages: readonly { readonly slug: string }[]
): string {
  const taken = new Set(pages.map((page) => page.slug));
  if (!taken.has(template.slug)) return template.slug;
  let n = 2;
  while (taken.has(`${template.slug}-${n}`)) n += 1;
  return `${template.slug}-${n}`;
}
