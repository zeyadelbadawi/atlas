/**
 * Section field schemas — one entry per `SectionType`.
 *
 * See `section-field.types.ts` for why this drives one generic form
 * renderer instead of 11 bespoke ones.
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
      { key: 'eyebrow', kind: 'text', labelKey: 'website:fields.eyebrow' },
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'subtitle', kind: 'text', labelKey: 'website:fields.subtitle' },
      { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      { key: 'imageAlt', kind: 'text', labelKey: 'website:fields.imageAlt' },
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.primaryCta' },
      { key: 'secondaryCta', kind: 'cta', labelKey: 'website:fields.secondaryCta' },
    ],
  },
  about: {
    type: 'about',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'body', kind: 'longText', labelKey: 'website:fields.body' },
      { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
      { key: 'imageAlt', kind: 'text', labelKey: 'website:fields.imageAlt' },
    ],
  },
  featuredCourses: {
    type: 'featuredCourses',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
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
      { key: 'showPrice', kind: 'boolean', labelKey: 'website:fields.showPrice' },
      { key: 'showInstructor', kind: 'boolean', labelKey: 'website:fields.showInstructor' },
    ],
  },
  statistics: {
    type: 'statistics',
    fields: [{ key: 'title', kind: 'text', labelKey: 'website:fields.title' }],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.statisticItems',
      itemLabelKey: 'website:fields.statisticItem',
      itemFields: [
        { key: 'value', kind: 'text', labelKey: 'website:fields.statValue' },
        { key: 'label', kind: 'text', labelKey: 'website:fields.statLabel' },
      ],
    },
  },
  features: {
    type: 'features',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
    ],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.featureItems',
      itemLabelKey: 'website:fields.featureItem',
      itemFields: [
        { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
        { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
        { key: 'icon', kind: 'select', labelKey: 'website:fields.icon', options: iconOptions },
      ],
    },
  },
  testimonials: {
    type: 'testimonials',
    fields: [{ key: 'title', kind: 'text', labelKey: 'website:fields.title' }],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.testimonialItems',
      itemLabelKey: 'website:fields.testimonialItem',
      itemFields: [
        { key: 'quote', kind: 'longText', labelKey: 'website:fields.quote' },
        { key: 'authorName', kind: 'text', labelKey: 'website:fields.authorName' },
        { key: 'authorRole', kind: 'text', labelKey: 'website:fields.authorRole' },
        { key: 'avatar', kind: 'image', labelKey: 'website:fields.avatar' },
        { key: 'avatarAlt', kind: 'text', labelKey: 'website:fields.avatarAlt' },
      ],
    },
  },
  faq: {
    type: 'faq',
    fields: [{ key: 'title', kind: 'text', labelKey: 'website:fields.title' }],
    repeatable: {
      key: 'items',
      labelKey: 'website:fields.faqItems',
      itemLabelKey: 'website:fields.faqItem',
      itemFields: [
        { key: 'question', kind: 'text', labelKey: 'website:fields.question' },
        { key: 'answer', kind: 'longText', labelKey: 'website:fields.answer' },
      ],
    },
  },
  cta: {
    type: 'cta',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
      { key: 'cta', kind: 'cta', labelKey: 'website:fields.primaryCta' },
    ],
  },
  instructors: {
    type: 'instructors',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
      { key: 'count', kind: 'number', labelKey: 'website:fields.count' },
    ],
  },
  gallery: {
    type: 'gallery',
    fields: [{ key: 'title', kind: 'text', labelKey: 'website:fields.title' }],
    repeatable: {
      key: 'images',
      labelKey: 'website:fields.galleryImages',
      itemLabelKey: 'website:fields.galleryImage',
      itemFields: [
        { key: 'image', kind: 'image', labelKey: 'website:fields.image' },
        { key: 'imageAlt', kind: 'text', labelKey: 'website:fields.imageAlt' },
        { key: 'caption', kind: 'text', labelKey: 'website:fields.caption' },
      ],
    },
  },
  contact: {
    type: 'contact',
    fields: [
      { key: 'title', kind: 'text', labelKey: 'website:fields.title' },
      { key: 'description', kind: 'longText', labelKey: 'website:fields.description' },
      { key: 'email', kind: 'text', labelKey: 'website:fields.email' },
      { key: 'phone', kind: 'text', labelKey: 'website:fields.phone' },
      { key: 'address', kind: 'text', labelKey: 'website:fields.address' },
      { key: 'showForm', kind: 'boolean', labelKey: 'website:fields.showForm' },
    ],
  },
};
