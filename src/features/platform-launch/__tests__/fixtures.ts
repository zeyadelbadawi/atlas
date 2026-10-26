/** Contract-shaped fixtures for the Launch & content tests. */
import type {
  BlogPost,
  BlogTranslation,
  LaunchChecklistItem,
  SiteAnnouncement,
} from '../types';

export const EN: BlogTranslation = {
  title: 'Protect your recorded lessons',
  excerpt:
    'How watermarking and device limits keep paid lessons with paying students.',
  body: '## Why it matters\n\nRecorded lessons are your income.',
  coverAlt: '',
  seoTitle: '',
  seoDescription: '',
};

export const AR: BlogTranslation = {
  title: 'احمِ دروسك المسجلة',
  excerpt:
    'كيف تحافظ العلامة المائية وحدود الأجهزة على دروسك المدفوعة للطلاب الذين دفعوا.',
  body: '## لماذا يهم ذلك\n\nدروسك المسجلة مصدر دخلك.',
  coverAlt: '',
  seoTitle: '',
  seoDescription: '',
};

export function blogPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-1',
    slug: 'protect-recorded-lessons',
    kind: 'pillar',
    topic: 'protection',
    status: 'draft',
    publishAt: null,
    featured: false,
    coverImage: null,
    authorName: 'Atlas team',
    relatedPostIds: [],
    translations: { en: EN, ar: AR },
    readingMinutes: { en: 1, ar: 1 },
    version: 3,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
    publishedAt: null,
    createdByName: 'Ziad',
    updatedByName: 'Ziad',
    ...overrides,
  };
}

export function announcement(
  overrides: Partial<SiteAnnouncement> = {}
): SiteAnnouncement {
  return {
    id: 'ann-1',
    name: 'Launch week banner',
    surface: 'marketing_banner',
    status: 'draft',
    startsAt: null,
    endsAt: null,
    tone: 'promo',
    content: {
      en: {
        title: 'We are live',
        body: 'Atlas is open for every teacher.',
        ctaLabel: 'See pricing',
      },
      ar: {
        title: 'أطلقنا',
        body: 'أطلس متاح الآن لكل مدرس.',
        ctaLabel: 'الأسعار',
      },
    },
    ctaUrl: '/pricing',
    imageUrl: null,
    pages: [],
    dismissible: true,
    popupDelaySeconds: 5,
    popupFrequency: 'once',
    audience: 'all',
    priority: 50,
    version: 2,
    stats: { views: 1200, clicks: 85, dismissals: 40 },
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
    createdByName: 'Ziad',
    updatedByName: 'Ziad',
    ...overrides,
  };
}

export function checklistItem(
  overrides: Partial<LaunchChecklistItem> = {}
): LaunchChecklistItem {
  return {
    id: 'item-1',
    section: 'content',
    title: 'Publish the 11 launch posts',
    description: 'Both languages.',
    linkUrl: '/dashboard/platform/blog',
    done: false,
    doneAt: null,
    doneByName: null,
    notes: '',
    position: 0,
    version: 1,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

export const page = <T>(items: readonly T[]) => ({
  items,
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: items.length,
    totalPages: 1,
  },
});
