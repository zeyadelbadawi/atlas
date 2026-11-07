/**
 * SEO/AEO/GEO pass — the JSON-LD builders: schema.org types Google and the
 * answer engines read, absolute URLs only, nothing the Academy did not set.
 */
import { describe, expect, it } from 'vitest';
import type { Course } from '@types';
import {
  buildCourseJsonLd,
  buildCourseListJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  isoDuration,
} from './structured-data.utils';

const course = {
  id: 'c1',
  academyId: 'a1',
  title: 'UX Foundations',
  slug: 'ux-foundations',
  shortDescription: 'Research and wireframes.',
  description: 'Long.',
  thumbnail: 'https://cdn.example/ux.png',
  status: 'published',
  visibility: 'public',
  pricing: { type: 'paid', amount: 49, currency: 'USD' },
  instructors: [
    { id: 'i1', name: 'Layla', avatar: 'data:image/png;base64,AAAA' },
  ],
  stats: {
    totalSections: 2,
    totalLessons: 8,
    durationSeconds: 3 * 3600 + 1200,
    averageRating: 4.5,
    totalReviews: 12,
  },
  level: 'beginner',
  language: 'en',
  outcomes: ['Run interviews'],
  requirements: [],
  createdAt: '',
  updatedAt: '',
} as unknown as Course;

describe('buildOrganizationJsonLd', () => {
  it('is an EducationalOrganization with an @id, url and only fetchable images', () => {
    const json = buildOrganizationJsonLd({
      name: 'Horizon',
      origin: 'https://horizon.example/',
      logo: 'data:image/png;base64,AAAA',
      description: '',
      contactEmail: 'hi@horizon.example',
      address: { city: 'Dubai', country: 'AE' },
      sameAs: ['https://x.com/horizon', 'javascript:alert(1)', ''],
    });
    expect(json).toMatchObject({
      '@type': 'EducationalOrganization',
      '@id': 'https://horizon.example/#organization',
      url: 'https://horizon.example/',
      email: 'hi@horizon.example',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Dubai',
        addressCountry: 'AE',
      },
      sameAs: ['https://x.com/horizon'],
    });
    expect(json.logo).toBeUndefined();
    expect(json.description).toBeUndefined();
    expect(
      buildOrganizationJsonLd({ name: 'H', logo: 'https://cdn.example/l.png' })
        .logo
    ).toBe('https://cdn.example/l.png');
  });
});

describe('buildWebSiteJsonLd', () => {
  it('names the site at its canonical home URL, published by the organization', () => {
    expect(
      buildWebSiteJsonLd({
        name: 'Horizon',
        origin: 'https://horizon.example',
        languages: ['en', 'ar'],
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://horizon.example/#website',
      name: 'Horizon',
      url: 'https://horizon.example/',
      inLanguage: ['en', 'ar'],
      publisher: { '@id': 'https://horizon.example/#organization' },
    });
  });
});

describe('buildCourseJsonLd', () => {
  const url = 'https://horizon.example/courses/ux-foundations';

  it('describes the course, its offer, its online instance and its approved-review rating', () => {
    const json = buildCourseJsonLd(
      course,
      { name: 'Horizon' },
      { url, origin: 'https://horizon.example' }
    );
    expect(json).toMatchObject({
      '@type': 'Course',
      '@id': `${url}#course`,
      name: 'UX Foundations',
      description: 'Research and wireframes.',
      url,
      image: 'https://cdn.example/ux.png',
      inLanguage: 'en',
      educationalLevel: 'beginner',
      teaches: ['Run interviews'],
      provider: {
        '@id': 'https://horizon.example/#organization',
        name: 'Horizon',
      },
      offers: [
        {
          '@type': 'Offer',
          category: 'Paid',
          price: 49,
          priceCurrency: 'USD',
          url,
        },
      ],
      hasCourseInstance: [
        {
          '@type': 'CourseInstance',
          courseMode: 'Online',
          courseWorkload: 'PT3H20M',
          instructor: [{ '@type': 'Person', name: 'Layla' }],
        },
      ],
      aggregateRating: {
        ratingValue: 4.5,
        reviewCount: 12,
        bestRating: 5,
        worstRating: 1,
      },
    });
    // A data: avatar is no URL; prerequisites left empty are omitted.
    expect(json.hasCourseInstance?.[0].instructor?.[0].image).toBeUndefined();
    expect(json.coursePrerequisites).toBeUndefined();
  });

  it('a free course is offered at 0; no rating without reviews; no offer without a price', () => {
    const free = buildCourseJsonLd(
      {
        ...course,
        pricing: { type: 'free' },
        stats: { totalSections: 0, totalLessons: 0 },
      } as Course,
      { name: 'H' },
      { url }
    );
    expect(free.offers).toEqual([
      {
        '@type': 'Offer',
        category: 'Free',
        price: 0,
        priceCurrency: undefined,
        url,
        availability: 'https://schema.org/InStock',
      },
    ]);
    expect(free.aggregateRating).toBeUndefined();
    const unpriced = buildCourseJsonLd(
      { ...course, pricing: { type: 'paid' } } as Course,
      { name: 'H' },
      { url }
    );
    expect(unpriced.offers).toBeUndefined();
  });
});

describe('buildCourseListJsonLd / buildFaqPageJsonLd / isoDuration', () => {
  it('lists courses by position and URL', () => {
    expect(
      buildCourseListJsonLd([
        { url: 'https://h.example/courses/a', name: 'A' },
        { url: 'https://h.example/courses/b', name: 'B' },
      ]).itemListElement
    ).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        url: 'https://h.example/courses/a',
        name: 'A',
      },
      {
        '@type': 'ListItem',
        position: 2,
        url: 'https://h.example/courses/b',
        name: 'B',
      },
    ]);
  });

  it('marks up answered questions only, and nothing when there are none', () => {
    expect(
      buildFaqPageJsonLd([
        { question: 'Q?', answer: 'A.' },
        { question: ' ', answer: 'x' },
      ])?.mainEntity
    ).toEqual([
      {
        '@type': 'Question',
        name: 'Q?',
        acceptedAnswer: { '@type': 'Answer', text: 'A.' },
      },
    ]);
    expect(buildFaqPageJsonLd([])).toBeUndefined();
  });

  it('writes ISO 8601 durations', () => {
    expect(isoDuration(3600)).toBe('PT1H');
    expect(isoDuration(90)).toBe('PT2M');
    expect(isoDuration(0)).toBeUndefined();
    expect(isoDuration(null)).toBeUndefined();
  });
});
