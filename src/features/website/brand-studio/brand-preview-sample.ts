/**
 * Sample content for the setup form's mini-preview (Theme 1 plan §F.4.3
 * step 1): the Academy doesn't exist yet, so there are no pages to show.
 * Static sections only — nothing here fetches data.
 */
import type { LocalizedText, WebsiteConfiguration, WebsitePage } from '@types';
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';

const lt = (en: string, ar: string): LocalizedText => ({ en, ar });
const TIMESTAMP = '2026-01-01T00:00:00.000Z';
const base = { enabled: true, visibility: DEFAULT_RESPONSIVE_VISIBILITY };

export function brandPreviewSample(academyName: string): {
  readonly page: WebsitePage;
  readonly configuration: Pick<
    WebsiteConfiguration,
    'brand' | 'navigation' | 'header' | 'footer'
  >;
} {
  const name = academyName.trim() || 'Your Academy';
  const page = {
    id: 'brand-preview-home',
    academyId: 'brand-preview',
    pageType: 'core',
    coreType: 'home',
    title: 'Home',
    slug: 'home',
    visible: true,
    seo: {},
    version: 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    sections: [
      {
        ...base,
        id: 'hero',
        type: 'hero',
        config: {
          eyebrow: lt('Welcome', 'مرحبًا بكم'),
          title: lt(
            `Learn something new at ${name}`,
            `تعلّم شيئًا جديدًا في ${name}`
          ),
          subtitle: lt(
            'Practical courses taught by people who do the work.',
            'دورات عملية يقدّمها أصحاب الخبرة.'
          ),
          cta: { label: lt('Explore courses', 'تصفّح الدورات') },
        },
      },
      {
        ...base,
        id: 'features',
        type: 'features',
        config: {
          title: lt('Why learners choose us', 'لماذا يختارنا المتعلّمون'),
          items: [
            {
              id: 'f1',
              icon: 'Award',
              title: lt('Certificates', 'شهادات'),
              description: lt(
                'Earn a certificate for every course.',
                'احصل على شهادة لكل دورة.'
              ),
            },
            {
              id: 'f2',
              icon: 'Users',
              title: lt('Expert mentors', 'مرشدون خبراء'),
              description: lt(
                'Learn from practitioners.',
                'تعلّم من الممارسين.'
              ),
            },
            {
              id: 'f3',
              icon: 'Clock',
              title: lt('Your own pace', 'بالسرعة التي تناسبك'),
              description: lt('Study whenever it suits you.', 'ادرس متى شئت.'),
            },
          ],
        },
      },
      {
        ...base,
        id: 'cta',
        type: 'cta',
        config: {
          title: lt('Ready to start?', 'مستعد للبدء؟'),
          description: lt(
            'Create your free account today.',
            'أنشئ حسابك المجاني اليوم.'
          ),
          cta: { label: lt('Get started', 'ابدأ الآن') },
        },
      },
    ],
  } as unknown as WebsitePage;

  return {
    page,
    configuration: {
      brand: {
        primaryColor: '221 83% 53%',
        secondaryColor: '221 83% 53%',
        accentColor: '221 83% 53%',
      },
      navigation: [
        { id: 'n1', label: lt('Home', 'الرئيسية'), pageId: page.id, order: 0 },
        {
          id: 'n2',
          label: lt('Courses', 'الدورات'),
          pageId: 'courses',
          order: 1,
        },
        { id: 'n3', label: lt('About', 'من نحن'), pageId: 'about', order: 2 },
      ] as WebsiteConfiguration['navigation'],
      header: {},
      footer: { groups: [], socialLinks: [] },
    },
  };
}
