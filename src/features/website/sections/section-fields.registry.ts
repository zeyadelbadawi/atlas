/**
 * Section field schemas — one entry per `SectionType`.
 *
 * See `section-field.types.ts` for why this drives one generic form
 * renderer instead of 11 bespoke ones. Phase 6 — `localized: true` marks
 * every field that is `LocalizedText` in the real Zod schema
 * (`website-section.schemas.ts`); see that file's own doc comment for the
 * exact rule (visitor-facing copy is localized, references/enums/proper
 * names are not). `maxLength` carries the content limit from the same
 * constant the schema uses, so the editor's counter and the save-time
 * check agree by construction.
 */
import {
  FEATURE_ICON_OPTIONS,
  MAX_CHIP_TEXT,
  MAX_FEATURE_SPLIT_ITEMS,
  MAX_HERO_HIGHLIGHTS,
  MAX_SECTION_STEPS,
  MAX_COURSE_CATALOG_PAGE_SIZE,
  MAX_HERO_DESCRIPTION_LENGTH,
  MAX_HERO_EYEBROW_LENGTH,
  MAX_HERO_SUBTITLE_LENGTH,
  MAX_HERO_TITLE_LENGTH,
  MAX_SECTION_ITEMS,
  MAX_SHORT_TEXT,
  MAX_STATISTIC_LABEL_LENGTH,
  MAX_STATISTIC_VALUE_LENGTH,
  MAX_STATISTICS_TITLE_LENGTH,
  MAX_STEP_DESCRIPTION_LENGTH,
  MAX_STEP_TITLE_LENGTH,
  MAX_STEPS_DESCRIPTION_LENGTH,
  MAX_STEPS_TITLE_LENGTH,
  MIN_COURSE_CATALOG_PAGE_SIZE,
  MIN_COURSE_CATEGORIES,
  MAX_SPOTLIGHT_MODULES,
  MIN_SPOTLIGHT_MODULES,
  MAX_COUNTDOWN_DESCRIPTION_LENGTH,
  MAX_COUNTDOWN_ENDED_MESSAGE_LENGTH,
  MAX_COUNTDOWN_TITLE_LENGTH,
  MAX_PRICING_DESCRIPTION_LENGTH,
  MAX_VIDEO_CAPTION_LENGTH,
  MAX_VIDEO_DESCRIPTION_LENGTH,
  MAX_WHATSAPP_BAR_DESCRIPTION_LENGTH,
  MAX_WHATSAPP_BAR_TITLE_LENGTH,
  MAX_LOGOS,
  MAX_LONG_TEXT,
  MAX_MAP_ADDRESS_LENGTH,
  MAX_MAP_NOTE_LENGTH,
  MAX_RESULT_VALUE_LENGTH,
  MAX_RESULTS,
  MAX_SCHEDULE_ROW_DETAIL_LENGTH,
  MAX_SCHEDULE_ROW_TITLE_LENGTH,
  MAX_SCHEDULE_ROWS,
  MAX_CERTIFICATES,
  MAX_DOWNLOAD_DESCRIPTION_LENGTH,
  MAX_DOWNLOAD_TITLE_LENGTH,
  MAX_DOWNLOADS,
  MAX_TIMELINE_MILESTONE_DESCRIPTION_LENGTH,
  MAX_TIMELINE_MILESTONE_TITLE_LENGTH,
  MAX_TIMELINE_MILESTONES,
  MAX_TIMELINE_PERIOD_LENGTH,
  MAX_VIDEO_TESTIMONIAL_QUOTE_LENGTH,
  MAX_VIDEO_TESTIMONIAL_ROLE_LENGTH,
  MAX_VIDEO_TESTIMONIALS,
} from '../constants/website.constants';
import type { SectionFieldSchema } from './section-field.types';
import { SCHEDULE_DAYS } from '@types';
import type { SectionType, WebsiteThemeKey } from '@types';

/** Fields only Atelier draws — see `SectionFieldDescriptor.themes`. */
const ATELIER_ONLY: readonly WebsiteThemeKey[] = ['atelier'];

/** Saturday first — the order an Egyptian week runs. */
const dayOptions = SCHEDULE_DAYS.map((day) => ({
  value: day,
  labelKey: `website:days.${day}`,
}));

const iconOptions = FEATURE_ICON_OPTIONS.map((icon) => ({
  value: icon,
  labelKey: `website:icons.${icon}`,
}));

export const SECTION_FIELD_SCHEMAS: Record<SectionType, SectionFieldSchema> = {
  hero: {
    type: 'hero',
    fields: [
      {
        key: 'eyebrow',
        kind: 'text',
        labelKey: 'website:fields.eyebrow',
        localized: true,
        maxLength: MAX_HERO_EYEBROW_LENGTH,
      },
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_HERO_TITLE_LENGTH,
      },
      {
        key: 'subtitle',
        kind: 'text',
        labelKey: 'website:fields.subtitle',
        localized: true,
        maxLength: MAX_HERO_SUBTITLE_LENGTH,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_HERO_DESCRIPTION_LENGTH,
      },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      {
        key: 'imageAlt',
        kind: 'text',
        labelKey: 'website:fields.imageAlt',
        localized: true,
      },
      { key: 'buttons', kind: 'buttons', labelKey: 'website:fields.buttons' },
      {
        key: 'highlight',
        kind: 'text',
        labelKey: 'website:fields.highlight',
        localized: true,
        maxLength: MAX_HERO_TITLE_LENGTH,
      },
      {
        key: 'showSearch',
        kind: 'boolean',
        labelKey: 'website:fields.showCourseSearch',
      },
    ],
    repeatable: {
      key: 'highlights',
      maxItems: MAX_HERO_HIGHLIGHTS,
      labelKey: 'website:fields.heroHighlights',
      itemLabelKey: 'website:fields.heroHighlight',
      itemFields: [
        {
          key: 'label',
          kind: 'text',
          labelKey: 'website:fields.label',
          localized: true,
          maxLength: MAX_CHIP_TEXT,
        },
      ],
    },
  },
  about: {
    type: 'about',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'body',
        kind: 'longText',
        labelKey: 'website:fields.body',
        localized: true,
      },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      {
        key: 'imageAlt',
        kind: 'text',
        labelKey: 'website:fields.imageAlt',
        localized: true,
      },
      { key: 'buttons', kind: 'buttons', labelKey: 'website:fields.buttons' },
    ],
  },
  featuredCourses: {
    type: 'featuredCourses',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      {
        key: 'mode',
        kind: 'select',
        labelKey: 'website:fields.mode',
        options: [
          { value: 'latest', labelKey: 'website:fields.modeLatest' },
          { value: 'selected', labelKey: 'website:fields.modeSelected' },
        ],
      },
      {
        key: 'layout',
        kind: 'select',
        labelKey: 'website:fields.layout',
        options: [
          { value: 'grid', labelKey: 'website:fields.layoutGrid' },
          { value: 'carousel', labelKey: 'website:fields.layoutCarousel' },
        ],
      },
      { key: 'count', kind: 'number', labelKey: 'website:fields.count' },
      {
        key: 'showPrice',
        kind: 'boolean',
        labelKey: 'website:fields.showPrice',
      },
      {
        key: 'showInstructor',
        kind: 'boolean',
        labelKey: 'website:fields.showInstructor',
      },
    ],
  },
  statistics: {
    type: 'statistics',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_STATISTICS_TITLE_LENGTH,
      },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.statisticItems',
      itemLabelKey: 'website:fields.statisticItem',
      itemFields: [
        {
          key: 'metric',
          kind: 'select',
          labelKey: 'website:fields.statMetric',
          options: [
            { value: 'none', labelKey: 'website:fields.statMetricNone' },
            { value: 'courses', labelKey: 'website:fields.statMetricCourses' },
            {
              value: 'students',
              labelKey: 'website:fields.statMetricStudents',
              // B0-WEB-10 — off by default in starter sections; when an
              // owner picks it, say plainly that the count is public.
              hintKey: 'website:fields.statMetricStudentsHint',
            },
            {
              value: 'instructors',
              labelKey: 'website:fields.statMetricInstructors',
            },
          ],
        },
        {
          key: 'value',
          kind: 'text',
          labelKey: 'website:fields.statValue',
          localized: true,
          maxLength: MAX_STATISTIC_VALUE_LENGTH,
        },
        {
          key: 'label',
          kind: 'text',
          labelKey: 'website:fields.statLabel',
          localized: true,
          maxLength: MAX_STATISTIC_LABEL_LENGTH,
        },
      ],
    },
  },
  features: {
    type: 'features',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.featureItems',
      itemLabelKey: 'website:fields.featureItem',
      itemFields: [
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.title',
          localized: true,
        },
        {
          key: 'description',
          kind: 'longText',
          labelKey: 'website:fields.description',
          localized: true,
        },
        {
          key: 'icon',
          kind: 'select',
          labelKey: 'website:fields.icon',
          options: iconOptions,
        },
      ],
    },
  },
  testimonials: {
    type: 'testimonials',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.testimonialItems',
      itemLabelKey: 'website:fields.testimonialItem',
      itemFields: [
        {
          key: 'quote',
          kind: 'longText',
          labelKey: 'website:fields.quote',
          localized: true,
        },
        {
          key: 'authorName',
          kind: 'text',
          labelKey: 'website:fields.authorName',
        },
        {
          key: 'authorRole',
          kind: 'text',
          labelKey: 'website:fields.authorRole',
          localized: true,
        },
        { key: 'avatar', kind: 'image', labelKey: 'website:fields.avatar' },
        {
          key: 'avatarAlt',
          kind: 'text',
          labelKey: 'website:fields.avatarAlt',
          localized: true,
        },
        {
          key: 'rating',
          kind: 'number',
          labelKey: 'website:fields.rating',
          min: 1,
          max: 5,
          optional: true,
        },
      ],
    },
  },
  faq: {
    type: 'faq',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'maxItems',
        kind: 'number',
        labelKey: 'website:fields.faqMaxItems',
        min: 1,
        max: MAX_SECTION_ITEMS,
        optional: true,
      },
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.faqCta' },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.faqItems',
      itemLabelKey: 'website:fields.faqItem',
      itemFields: [
        {
          key: 'question',
          kind: 'text',
          labelKey: 'website:fields.question',
          localized: true,
        },
        {
          key: 'answer',
          kind: 'longText',
          labelKey: 'website:fields.answer',
          localized: true,
        },
      ],
    },
  },
  cta: {
    type: 'cta',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      {
        key: 'buttons',
        kind: 'buttons',
        labelKey: 'website:fields.buttons',
        minButtons: 1,
      },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      {
        key: 'imageAlt',
        kind: 'text',
        labelKey: 'website:fields.imageAlt',
        localized: true,
      },
    ],
  },
  instructors: {
    type: 'instructors',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      { key: 'count', kind: 'number', labelKey: 'website:fields.count' },
    ],
  },
  gallery: {
    type: 'gallery',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
    ],
    repeatable: {
      key: 'images',
      labelKey: 'website:fields.galleryImages',
      itemLabelKey: 'website:fields.galleryImage',
      itemFields: [
        { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
        {
          key: 'imageAlt',
          kind: 'text',
          labelKey: 'website:fields.imageAlt',
          localized: true,
        },
        {
          key: 'caption',
          kind: 'text',
          labelKey: 'website:fields.caption',
          localized: true,
        },
      ],
    },
  },
  contact: {
    type: 'contact',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      { key: 'email', kind: 'text', labelKey: 'website:fields.email' },
      { key: 'phone', kind: 'text', labelKey: 'website:fields.phone' },
      { key: 'address', kind: 'text', labelKey: 'website:fields.address' },
      { key: 'showForm', kind: 'boolean', labelKey: 'website:fields.showForm' },
    ],
  },
  courseCatalog: {
    type: 'courseCatalog',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      {
        key: 'pageSize',
        kind: 'number',
        labelKey: 'website:fields.pageSize',
        min: MIN_COURSE_CATALOG_PAGE_SIZE,
        max: MAX_COURSE_CATALOG_PAGE_SIZE,
      },
      {
        key: 'defaultSort',
        kind: 'select',
        labelKey: 'website:fields.defaultSort',
        options: [
          { value: 'newest', labelKey: 'website:fields.defaultSortNewest' },
          { value: 'title', labelKey: 'website:fields.defaultSortTitle' },
          {
            value: 'priceAsc',
            labelKey: 'website:fields.defaultSortPriceAsc',
          },
          {
            value: 'priceDesc',
            labelKey: 'website:fields.defaultSortPriceDesc',
          },
        ],
      },
      {
        key: 'showSearch',
        kind: 'boolean',
        labelKey: 'website:fields.showSearch',
      },
      {
        key: 'showLevelFilter',
        kind: 'boolean',
        labelKey: 'website:fields.showLevelFilter',
      },
      {
        key: 'showPricingFilter',
        kind: 'boolean',
        labelKey: 'website:fields.showPricingFilter',
      },
      { key: 'showSort', kind: 'boolean', labelKey: 'website:fields.showSort' },
    ],
  },
  // Theme 1 plan §D.2 — the four shared section types.
  pageHeader: {
    type: 'pageHeader',
    fields: [
      {
        key: 'eyebrow',
        kind: 'text',
        labelKey: 'website:fields.eyebrow',
        localized: true,
      },
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      {
        key: 'imageAlt',
        kind: 'text',
        labelKey: 'website:fields.imageAlt',
        localized: true,
      },
      {
        key: 'search',
        kind: 'select',
        labelKey: 'website:fields.pageHeaderSearch',
        options: [
          { value: 'none', labelKey: 'website:fields.pageHeaderSearchNone' },
          {
            value: 'courses',
            labelKey: 'website:fields.pageHeaderSearchCourses',
          },
          { value: 'faq', labelKey: 'website:fields.pageHeaderSearchFaq' },
        ],
      },
    ],
  },
  courseCategories: {
    type: 'courseCategories',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      {
        key: 'maxItems',
        kind: 'number',
        labelKey: 'website:fields.categoriesMaxItems',
        min: MIN_COURSE_CATEGORIES,
        max: MAX_SECTION_ITEMS,
      },
      {
        key: 'showCounts',
        kind: 'boolean',
        labelKey: 'website:fields.showCourseCounts',
      },
    ],
  },
  steps: {
    type: 'steps',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_STEPS_TITLE_LENGTH,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_STEPS_DESCRIPTION_LENGTH,
      },
      // Only Atelier draws the plate beside the steps (its Method scene).
      {
        key: 'image',
        kind: 'image',
        labelKey: 'website:fields.image',
        themes: ATELIER_ONLY,
      },
      {
        key: 'imageAlt',
        kind: 'text',
        labelKey: 'website:fields.imageAlt',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
        themes: ATELIER_ONLY,
      },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.stepItems',
      maxItems: MAX_SECTION_STEPS,
      itemLabelKey: 'website:fields.stepItem',
      itemFields: [
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.title',
          localized: true,
          maxLength: MAX_STEP_TITLE_LENGTH,
        },
        {
          key: 'description',
          kind: 'longText',
          labelKey: 'website:fields.description',
          localized: true,
          maxLength: MAX_STEP_DESCRIPTION_LENGTH,
        },
      ],
    },
  },
  featureSplit: {
    type: 'featureSplit',
    fields: [
      {
        key: 'eyebrow',
        kind: 'text',
        labelKey: 'website:fields.eyebrow',
        localized: true,
      },
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      {
        key: 'imageAlt',
        kind: 'text',
        labelKey: 'website:fields.imageAlt',
        localized: true,
      },
      {
        key: 'imagePosition',
        kind: 'select',
        labelKey: 'website:fields.imagePosition',
        options: [
          { value: 'start', labelKey: 'website:fields.imagePositionStart' },
          { value: 'end', labelKey: 'website:fields.imagePositionEnd' },
        ],
      },
      { key: 'buttons', kind: 'buttons', labelKey: 'website:fields.buttons' },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.benefitItems',
      maxItems: MAX_FEATURE_SPLIT_ITEMS,
      itemLabelKey: 'website:fields.benefitItem',
      itemFields: [
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.title',
          localized: true,
        },
        {
          key: 'description',
          kind: 'longText',
          labelKey: 'website:fields.description',
          localized: true,
        },
      ],
    },
  },
  courseSpotlight: {
    type: 'courseSpotlight',
    fields: [
      {
        key: 'eyebrow',
        kind: 'text',
        labelKey: 'website:fields.eyebrow',
        localized: true,
      },
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
      },
      {
        key: 'showOutcomes',
        kind: 'boolean',
        labelKey: 'website:fields.showOutcomes',
      },
      {
        key: 'showSyllabus',
        kind: 'boolean',
        labelKey: 'website:fields.showSyllabus',
      },
      {
        key: 'maxModules',
        kind: 'number',
        labelKey: 'website:fields.maxModules',
        min: MIN_SPOTLIGHT_MODULES,
        max: MAX_SPOTLIGHT_MODULES,
      },
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.primaryCta' },
    ],
  },
  logos: {
    type: 'logos',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_LOGOS,
      labelKey: 'website:fields.logoItems',
      itemLabelKey: 'website:fields.logoItem',
      itemFields: [
        { key: 'image', kind: 'image', labelKey: 'website:fields.logoImage' },
        {
          key: 'alt',
          kind: 'text',
          labelKey: 'website:fields.logoAlt',
          localized: true,
          maxLength: MAX_SHORT_TEXT,
        },
        {
          key: 'url',
          kind: 'url',
          labelKey: 'website:fields.logoUrl',
          hintKey: 'website:fields.logoUrlHint',
        },
      ],
    },
  },
  map: {
    type: 'map',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'address',
        kind: 'longText',
        labelKey: 'website:fields.mapAddress',
        localized: true,
        maxLength: MAX_MAP_ADDRESS_LENGTH,
      },
      {
        key: 'note',
        kind: 'text',
        labelKey: 'website:fields.mapNote',
        localized: true,
        maxLength: MAX_MAP_NOTE_LENGTH,
      },
      {
        key: 'query',
        kind: 'text',
        labelKey: 'website:fields.mapQuery',
        hintKey: 'website:fields.mapQueryHint',
      },
    ],
  },
  schedule: {
    type: 'schedule',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_SCHEDULE_ROWS,
      labelKey: 'website:fields.scheduleRows',
      itemLabelKey: 'website:fields.scheduleRow',
      itemFields: [
        {
          key: 'day',
          kind: 'select',
          labelKey: 'website:fields.scheduleDay',
          options: dayOptions,
          defaultValue: 'sat',
        },
        {
          key: 'start',
          kind: 'time',
          labelKey: 'website:fields.scheduleStart',
        },
        {
          key: 'end',
          kind: 'time',
          labelKey: 'website:fields.scheduleEnd',
          hintKey: 'website:fields.scheduleEndHint',
        },
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.scheduleTitle',
          localized: true,
          maxLength: MAX_SCHEDULE_ROW_TITLE_LENGTH,
        },
        {
          key: 'teacher',
          kind: 'text',
          labelKey: 'website:fields.scheduleTeacher',
          localized: true,
          maxLength: MAX_SCHEDULE_ROW_DETAIL_LENGTH,
        },
        {
          key: 'location',
          kind: 'text',
          labelKey: 'website:fields.scheduleLocation',
          localized: true,
          maxLength: MAX_SCHEDULE_ROW_DETAIL_LENGTH,
        },
      ],
    },
  },
  results: {
    type: 'results',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_RESULTS,
      labelKey: 'website:fields.resultItems',
      itemLabelKey: 'website:fields.resultItem',
      itemFields: [
        {
          key: 'studentName',
          kind: 'text',
          labelKey: 'website:fields.studentName',
        },
        {
          key: 'result',
          kind: 'text',
          labelKey: 'website:fields.resultValue',
          localized: true,
          maxLength: MAX_RESULT_VALUE_LENGTH,
        },
        {
          key: 'detail',
          kind: 'text',
          labelKey: 'website:fields.resultDetail',
          localized: true,
          maxLength: MAX_SHORT_TEXT,
        },
        {
          key: 'photo',
          kind: 'image',
          labelKey: 'website:fields.studentPhoto',
        },
        {
          key: 'photoAlt',
          kind: 'text',
          labelKey: 'website:fields.studentPhotoAlt',
          localized: true,
          maxLength: MAX_SHORT_TEXT,
        },
        { key: 'top', kind: 'boolean', labelKey: 'website:fields.resultTop' },
      ],
    },
  },
  // CMS phase 3d (batch A).
  whatsappBar: {
    type: 'whatsappBar',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_WHATSAPP_BAR_TITLE_LENGTH,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_WHATSAPP_BAR_DESCRIPTION_LENGTH,
      },
      {
        key: 'buttons',
        kind: 'buttons',
        labelKey: 'website:fields.buttons',
        minButtons: 1,
      },
    ],
  },
  video: {
    type: 'video',
    fields: [
      { key: 'videoId', kind: 'youtube', labelKey: 'website:fields.videoLink' },
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_VIDEO_DESCRIPTION_LENGTH,
      },
      { key: 'poster', kind: 'image', labelKey: 'website:fields.videoPoster' },
      {
        key: 'caption',
        kind: 'text',
        labelKey: 'website:fields.caption',
        localized: true,
        maxLength: MAX_VIDEO_CAPTION_LENGTH,
      },
    ],
  },
  pricing: {
    type: 'pricing',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_PRICING_DESCRIPTION_LENGTH,
      },
      { key: 'plans', kind: 'plans', labelKey: 'website:fields.pricingPlans' },
    ],
  },
  countdown: {
    type: 'countdown',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_COUNTDOWN_TITLE_LENGTH,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_COUNTDOWN_DESCRIPTION_LENGTH,
      },
      {
        key: 'deadline',
        kind: 'deadline',
        labelKey: 'website:fields.deadline',
      },
      {
        key: 'endedMessage',
        kind: 'longText',
        labelKey: 'website:fields.endedMessage',
        localized: true,
        maxLength: MAX_COUNTDOWN_ENDED_MESSAGE_LENGTH,
      },
      { key: 'buttons', kind: 'buttons', labelKey: 'website:fields.buttons' },
    ],
  },
  // CMS phase 3d (batch D).
  timeline: {
    type: 'timeline',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_TIMELINE_MILESTONES,
      labelKey: 'website:fields.timelineItems',
      itemLabelKey: 'website:fields.timelineItem',
      itemFields: [
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.title',
          localized: true,
          maxLength: MAX_TIMELINE_MILESTONE_TITLE_LENGTH,
        },
        {
          key: 'period',
          kind: 'text',
          labelKey: 'website:fields.timelinePeriod',
          hintKey: 'website:fields.timelinePeriodHint',
          localized: true,
          maxLength: MAX_TIMELINE_PERIOD_LENGTH,
        },
        {
          key: 'description',
          kind: 'longText',
          labelKey: 'website:fields.description',
          localized: true,
          maxLength: MAX_TIMELINE_MILESTONE_DESCRIPTION_LENGTH,
        },
        {
          key: 'icon',
          kind: 'select',
          labelKey: 'website:fields.icon',
          options: iconOptions,
          noneLabelKey: 'website:fields.timelineIconNone',
        },
      ],
    },
  },
  videoTestimonials: {
    type: 'videoTestimonials',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_VIDEO_TESTIMONIALS,
      labelKey: 'website:fields.videoReviewItems',
      itemLabelKey: 'website:fields.videoReviewItem',
      itemFields: [
        {
          key: 'videoId',
          kind: 'youtube',
          labelKey: 'website:fields.videoLink',
        },
        {
          key: 'name',
          kind: 'text',
          labelKey: 'website:fields.reviewerName',
        },
        {
          key: 'role',
          kind: 'text',
          labelKey: 'website:fields.reviewerRole',
          hintKey: 'website:fields.reviewerRoleHint',
          localized: true,
          maxLength: MAX_VIDEO_TESTIMONIAL_ROLE_LENGTH,
        },
        {
          key: 'quote',
          kind: 'longText',
          labelKey: 'website:fields.reviewQuote',
          localized: true,
          maxLength: MAX_VIDEO_TESTIMONIAL_QUOTE_LENGTH,
        },
        {
          key: 'poster',
          kind: 'image',
          labelKey: 'website:fields.videoPoster',
        },
      ],
    },
  },
  downloads: {
    type: 'downloads',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_DOWNLOADS,
      labelKey: 'website:fields.downloadItems',
      itemLabelKey: 'website:fields.downloadItem',
      itemFields: [
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.title',
          localized: true,
          maxLength: MAX_DOWNLOAD_TITLE_LENGTH,
        },
        {
          key: 'description',
          kind: 'longText',
          labelKey: 'website:fields.description',
          localized: true,
          maxLength: MAX_DOWNLOAD_DESCRIPTION_LENGTH,
        },
        {
          key: 'url',
          kind: 'fileLink',
          labelKey: 'website:fields.downloadLink',
        },
        {
          key: 'fileType',
          kind: 'text',
          labelKey: 'website:fields.downloadFileType',
          hintKey: 'website:fields.downloadFileTypeHint',
        },
        {
          key: 'fileSize',
          kind: 'text',
          labelKey: 'website:fields.downloadFileSize',
          hintKey: 'website:fields.downloadFileSizeHint',
        },
      ],
    },
  },
  certificates: {
    type: 'certificates',
    fields: [
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
        maxLength: MAX_SHORT_TEXT,
      },
      {
        key: 'description',
        kind: 'longText',
        labelKey: 'website:fields.description',
        localized: true,
        maxLength: MAX_LONG_TEXT,
      },
    ],
    repeatable: {
      key: 'items',
      maxItems: MAX_CERTIFICATES,
      labelKey: 'website:fields.certificateItems',
      itemLabelKey: 'website:fields.certificateItem',
      itemFields: [
        {
          key: 'image',
          kind: 'image',
          labelKey: 'website:fields.certificateImage',
        },
        {
          key: 'title',
          kind: 'text',
          labelKey: 'website:fields.title',
          localized: true,
          maxLength: MAX_SHORT_TEXT,
        },
        {
          key: 'issuer',
          kind: 'text',
          labelKey: 'website:fields.certificateIssuer',
          localized: true,
          maxLength: MAX_SHORT_TEXT,
        },
        {
          key: 'year',
          kind: 'text',
          labelKey: 'website:fields.certificateYear',
          hintKey: 'website:fields.certificateYearHint',
        },
      ],
    },
  },
};
