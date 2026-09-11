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
import { FEATURE_ICON_OPTIONS } from '../constants/website.constants';
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
    ],
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
};
