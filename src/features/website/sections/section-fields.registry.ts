/**
 * Section field schemas — one entry per `SectionType`.
 *
 * See `section-field.types.ts` for why this drives one generic form
 * renderer instead of 11 bespoke ones. Phase 6 — `localized: true` marks
 * every field that is `LocalizedText` in the real Zod schema
 * (`website-section.schemas.ts`); see that file's own doc comment for the
 * exact rule (visitor-facing copy is localized, references/enums/proper
 * names are not).
 */
import {
  FEATURE_ICON_OPTIONS,
  MAX_COURSE_CATALOG_PAGE_SIZE,
  MAX_SECTION_ITEMS,
  MIN_COURSE_CATALOG_PAGE_SIZE,
  MIN_COURSE_CATEGORIES,
} from '../constants/website.constants';
import type { SectionFieldSchema } from './section-field.types';
import type { SectionType } from '@types';

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
      },
      {
        key: 'title',
        kind: 'text',
        labelKey: 'website:fields.title',
        localized: true,
      },
      {
        key: 'subtitle',
        kind: 'text',
        labelKey: 'website:fields.subtitle',
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
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.primaryCta' },
      {
        key: 'secondaryCta',
        kind: 'cta',
        labelKey: 'website:fields.secondaryCta',
      },
      {
        key: 'highlight',
        kind: 'text',
        labelKey: 'website:fields.highlight',
        localized: true,
      },
      {
        key: 'showSearch',
        kind: 'boolean',
        labelKey: 'website:fields.showCourseSearch',
      },
    ],
    repeatable: {
      key: 'highlights',
      labelKey: 'website:fields.heroHighlights',
      itemLabelKey: 'website:fields.heroHighlight',
      itemFields: [
        {
          key: 'label',
          kind: 'text',
          labelKey: 'website:fields.label',
          localized: true,
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
        },
        {
          key: 'label',
          kind: 'text',
          labelKey: 'website:fields.statLabel',
          localized: true,
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
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.primaryCta' },
      {
        key: 'secondaryCta',
        kind: 'cta',
        labelKey: 'website:fields.secondaryCta',
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
      labelKey: 'website:fields.stepItems',
      itemLabelKey: 'website:fields.stepItem',
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
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.primaryCta' },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.benefitItems',
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
};
