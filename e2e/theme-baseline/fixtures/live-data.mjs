/**
 * Theme baseline — the live Academy data the fixture API serves next to the
 * generated website (`generated/<theme>.json`).
 *
 * Two data states, matching the two situations every theme has to handle
 * (Theme 1 plan §A.2, §I.1 "empty/rich"):
 *   - `new`  — a just-provisioned Academy: no courses, no students, no
 *              instructors, no reviews. This is what every Owner sees first.
 *   - `rich` — an established Academy: courses across categories,
 *              instructors, enrolments, ratings and a reviewed course.
 *
 * Course content is deliberately single-language (an Academy authors its
 * courses in one language); the website chrome and sections are bilingual.
 * No course has a thumbnail: the repositories hold no education imagery and
 * Phase 0 generates none, so the baseline records today's no-image state.
 */

export const FIXTURE_ACADEMY_NAME = 'Horizon Academy';

/**
 * Brand colours an Academy can store today (`WebsiteBrandConfig`: three HSL
 * triplets). `default` is exactly what `WebsiteBootstrapService` writes for a
 * new Academy. The others are the first entries of the plan's brand identity
 * matrix (§I.2), kept here so later phases compare against the same inputs.
 */
export const FIXTURE_PALETTES = {
  default: {
    primaryColor: '221 83% 53%',
    secondaryColor: '221 83% 53%',
    accentColor: '221 83% 53%',
  },
  orange: {
    primaryColor: '24 95% 53%',
    secondaryColor: '199 89% 38%',
    accentColor: '43 96% 56%',
  },
  purple: {
    primaryColor: '262 70% 50%',
    secondaryColor: '330 75% 55%',
    accentColor: '174 60% 42%',
  },
  'neon-yellow': {
    primaryColor: '66 100% 50%',
    secondaryColor: '0 0% 10%',
    accentColor: '190 100% 45%',
  },
  'near-black': {
    primaryColor: '220 15% 10%',
    secondaryColor: '220 10% 35%',
    accentColor: '220 10% 60%',
  },
  // The rest of the §I.2 identity matrix (Phase 5 brand matrix on Home).
  'pastel-pink': {
    primaryColor: '340 80% 85%',
    secondaryColor: '340 80% 85%',
    accentColor: '340 80% 85%',
  },
  monochrome: {
    primaryColor: '0 0% 20%',
    secondaryColor: '0 0% 60%',
    accentColor: '0 0% 40%',
  },
  red: {
    primaryColor: '0 80% 50%',
    secondaryColor: '0 80% 50%',
    accentColor: '0 80% 50%',
  },
  teal: {
    primaryColor: '175 70% 35%',
    secondaryColor: '175 70% 35%',
    accentColor: '175 70% 35%',
  },
  brown: {
    primaryColor: '25 50% 30%',
    secondaryColor: '35 60% 50%',
    accentColor: '25 50% 30%',
  },
  'multi-colour': {
    primaryColor: '200 90% 45%',
    secondaryColor: '330 80% 55%',
    accentColor: '45 95% 55%',
  },
  // No logo: Theme 1's own default seeds.
  'no-logo': {
    primaryColor: '217 91% 55%',
    secondaryColor: '173 65% 40%',
    accentColor: '38 92% 55%',
  },
};

const TIMESTAMP = '2026-09-01T09:00:00.000Z';

const INSTRUCTORS = [
  { id: 'fx-instructor-1', name: 'Layla Haddad' },
  { id: 'fx-instructor-2', name: 'Daniel Okafor' },
  { id: 'fx-instructor-3', name: 'Mariam Saleh' },
];

const CATEGORIES = [
  { id: 'fx-category-design', name: 'Design', slug: 'design' },
  { id: 'fx-category-business', name: 'Business', slug: 'business' },
  { id: 'fx-category-technology', name: 'Technology', slug: 'technology' },
];

function course(academyId, index, fields) {
  const category = CATEGORIES.find((c) => c.id === fields.categoryId);
  return {
    id: `fx-course-${index}`,
    academyId,
    slug: fields.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: 'published',
    visibility: 'public',
    language: 'en',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    publishedAt: TIMESTAMP,
    category: category ? { ...category, academyId } : undefined,
    ...fields,
  };
}

function richCourses(academyId) {
  return [
    course(academyId, 1, {
      title: 'UX Design Foundations',
      shortDescription:
        'Research, wireframe and test your first product flows with a mentor.',
      description:
        'A practical introduction to user experience design. You will interview users, map journeys, sketch and wireframe solutions, and run usability tests on a real product brief.',
      categoryId: 'fx-category-design',
      pricing: { type: 'paid', amount: 149, currency: 'USD' },
      level: 'beginner',
      instructors: [INSTRUCTORS[0]],
      outcomes: [
        'Plan and run five user interviews',
        'Turn research into journey maps',
        'Build and test clickable wireframes',
      ],
      requirements: ['No prior design experience needed'],
      stats: {
        totalSections: 3,
        totalLessons: 9,
        durationSeconds: 5 * 3600 + 20 * 60,
        hasPreview: true,
        averageRating: 4.8,
        totalReviews: 3,
      },
    }),
    course(academyId, 2, {
      title: 'Brand Identity Studio',
      shortDescription:
        'Build a complete visual identity from strategy to logo system.',
      categoryId: 'fx-category-design',
      pricing: { type: 'paid', amount: 199, currency: 'USD' },
      level: 'intermediate',
      instructors: [INSTRUCTORS[0]],
      stats: { totalSections: 4, totalLessons: 14, durationSeconds: 7 * 3600 },
    }),
    course(academyId, 3, {
      title: 'Financial Modelling Essentials',
      shortDescription:
        'Forecast revenue, costs and cash flow with confidence.',
      categoryId: 'fx-category-business',
      pricing: { type: 'paid', amount: 179, currency: 'USD' },
      level: 'intermediate',
      instructors: [INSTRUCTORS[1]],
      stats: {
        totalSections: 5,
        totalLessons: 18,
        durationSeconds: 8 * 3600 + 30 * 60,
        averageRating: 4.6,
        totalReviews: 12,
      },
    }),
    course(academyId, 4, {
      title: 'Leading Remote Teams',
      shortDescription:
        'Rituals, tools and habits for managers of distributed teams.',
      categoryId: 'fx-category-business',
      pricing: { type: 'free' },
      level: 'all_levels',
      instructors: [INSTRUCTORS[1], INSTRUCTORS[2]],
      stats: { totalSections: 2, totalLessons: 6, durationSeconds: 2 * 3600 },
    }),
    course(academyId, 5, {
      title: 'Python for Data Analysis',
      shortDescription:
        'Clean, explore and visualise real datasets with pandas.',
      categoryId: 'fx-category-technology',
      pricing: { type: 'paid', amount: 129, currency: 'USD' },
      level: 'beginner',
      instructors: [INSTRUCTORS[2]],
      stats: {
        totalSections: 6,
        totalLessons: 24,
        durationSeconds: 11 * 3600,
        averageRating: 4.9,
        totalReviews: 27,
      },
    }),
    course(academyId, 6, {
      title: 'Cloud Fundamentals',
      shortDescription:
        'Core cloud concepts, services and costs explained clearly.',
      categoryId: 'fx-category-technology',
      pricing: { type: 'paid', amount: 99, currency: 'USD' },
      level: 'advanced',
      instructors: [INSTRUCTORS[2]],
      stats: { totalSections: 4, totalLessons: 12, durationSeconds: 6 * 3600 },
    }),
  ];
}

const CURRICULUM = [
  {
    id: 'fx-section-1',
    title: 'Understanding your users',
    order: 0,
    lessons: [
      {
        id: 'fx-lesson-1',
        title: 'What UX really means',
        order: 0,
        contentType: 'video',
        isPreview: true,
      },
      {
        id: 'fx-lesson-2',
        title: 'Planning user interviews',
        order: 1,
        contentType: 'text',
        isPreview: false,
      },
      {
        id: 'fx-lesson-3',
        title: 'Interview practice brief',
        order: 2,
        contentType: 'file',
        isPreview: false,
      },
    ],
  },
  {
    id: 'fx-section-2',
    title: 'From research to journeys',
    order: 1,
    lessons: [
      {
        id: 'fx-lesson-4',
        title: 'Synthesising findings',
        order: 0,
        contentType: 'video',
        isPreview: false,
      },
      {
        id: 'fx-lesson-5',
        title: 'Journey mapping',
        order: 1,
        contentType: 'video',
        isPreview: false,
      },
      {
        id: 'fx-lesson-6',
        title: 'Opportunity framing',
        order: 2,
        contentType: 'text',
        isPreview: false,
      },
    ],
  },
  {
    id: 'fx-section-3',
    title: 'Wireframes and testing',
    order: 2,
    lessons: [
      {
        id: 'fx-lesson-7',
        title: 'Sketching solutions',
        order: 0,
        contentType: 'video',
        isPreview: false,
      },
      {
        id: 'fx-lesson-8',
        title: 'Clickable wireframes',
        order: 1,
        contentType: 'video',
        isPreview: false,
      },
      {
        id: 'fx-lesson-9',
        title: 'Running a usability test',
        order: 2,
        contentType: 'video',
        isPreview: false,
      },
    ],
  },
];

const REVIEWS = [
  {
    id: 'fx-review-1',
    studentName: 'Omar K.',
    rating: 5,
    body: 'Clear, practical and the mentor feedback on my wireframes was worth the price alone.',
  },
  {
    id: 'fx-review-2',
    studentName: 'Sara M.',
    rating: 5,
    body: 'I ran my first real usability test in week three. Highly recommended.',
  },
  {
    id: 'fx-review-3',
    studentName: 'James L.',
    rating: 4,
    body: 'Great structure. I would have liked one more exercise on journey maps.',
  },
];

/** Everything the public API would return for this Academy in `state`. */
export function buildLiveData(academyId, state) {
  const rich = state === 'rich';
  const courses = rich ? richCourses(academyId) : [];
  return {
    identity: {
      academyId,
      name: FIXTURE_ACADEMY_NAME,
      contactEmail: 'hello@horizon-academy.example',
      ...(rich
        ? {
            contactPhone: '+971 4 555 0142',
            address: {
              street: '12 Knowledge Park',
              city: 'Dubai',
              country: 'AE',
            },
          }
        : {}),
    },
    statistics: rich
      ? {
          courses: courses.length,
          students: 1240,
          instructors: INSTRUCTORS.length,
        }
      : { courses: 0, students: 0, instructors: 0 },
    courses,
    // `GET public/websites/:id/categories`: categories holding a published
    // public course, with counts (the real endpoint's rule).
    categories: CATEGORIES.map((category) => ({
      ...category,
      courseCount: courses.filter((c) => c.categoryId === category.id).length,
    })).filter((category) => category.courseCount > 0),
    curriculum: rich ? CURRICULUM : [],
    reviews: rich
      ? REVIEWS.map((review) => ({
          ...review,
          courseId: 'fx-course-1',
          studentId: `${review.id}-student`,
          status: 'published',
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        }))
      : [],
  };
}
