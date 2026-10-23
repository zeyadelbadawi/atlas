/**
 * Presets for the sections that introduce an academy: the hero, About, the
 * image-beside-benefits split and the notice strip. See
 * `section-presets.types.ts` for what a preset is and the rule its copy
 * follows (no invented facts: bracketed placeholders where one is needed).
 */
import type { SectionPreset } from './section-presets.types';
import {
  lt,
  newItemId,
  pageButton,
  ph,
  signUpButton,
  themePhoto,
  whatsappButton,
} from './preset-content.utils';

const BROWSE_COURSES = lt('Browse courses', 'تصفّح الدورات');
const REGISTER_NOW = lt('Register now', 'سجّل الآن');

export const HERO_PRESETS: readonly SectionPreset<'hero'>[] = [
  {
    type: 'hero',
    key: 'imageBeside',
    build: (context) => ({
      config: {
        eyebrow: ph('Your grades and subjects', 'المراحل والمواد التي تدرّسها'),
        title: lt(
          'Study with confidence, step by step',
          'ذاكِر بثقة، خطوة بخطوة'
        ),
        highlight: lt('step by step', 'خطوة بخطوة'),
        description: lt(
          'Browse our courses, see what each one covers and choose the one that suits your grade.',
          'تصفّح دوراتنا، واعرف ما تغطّيه كل دورة، واختر ما يناسب صفّك الدراسي.'
        ),
        image: themePhoto(context, 'home-hero'),
        cta: pageButton(context, 'courses', BROWSE_COURSES),
        secondaryCta: signUpButton(lt('Create an account', 'أنشئ حسابًا')),
        highlights: [
          {
            id: newItemId(),
            label: lt('Clear course details', 'تفاصيل واضحة لكل دورة'),
          },
          {
            id: newItemId(),
            label: lt('Learn on any device', 'تعلّم من أي جهاز'),
          },
          {
            id: newItemId(),
            label: lt('Questions welcome', 'أسئلتك مرحّب بها'),
          },
        ],
      },
    }),
  },
  {
    type: 'hero',
    key: 'centered',
    build: (context) => ({
      config: {
        title: lt('Every lesson brings you closer', 'كل درس يقرّبك من هدفك'),
        description: lt(
          'Find the right course for your grade and start learning with us.',
          'اعثر على الدورة المناسبة لصفّك الدراسي وابدأ التعلّم معنا.'
        ),
        cta: signUpButton(REGISTER_NOW),
        secondaryCta: pageButton(context, 'courses', BROWSE_COURSES),
      },
    }),
  },
  {
    type: 'hero',
    key: 'whatsapp',
    build: (context) => ({
      config: {
        eyebrow: lt('We are here to help', 'نحن هنا لمساعدتك'),
        title: lt(
          'Have a question? Ask us on WhatsApp',
          'لديك سؤال؟ اسألنا على واتساب'
        ),
        description: lt(
          'Message us about courses, groups and prices, and we will help you choose.',
          'راسلنا عن الدورات والمجموعات والأسعار، وسنساعدك على الاختيار.'
        ),
        image: themePhoto(context, 'home-hero'),
        cta: whatsappButton(lt('Chat on WhatsApp', 'راسلنا على واتساب')),
        secondaryCta: pageButton(context, 'courses', BROWSE_COURSES),
      },
      // On a phone, the photograph comes first and the button sits right
      // above the fold's end, where a thumb reaches it.
      design: { reverseOnMobile: true },
    }),
  },
  {
    type: 'hero',
    key: 'search',
    build: (context) => ({
      config: {
        title: lt(
          'Find the right course for you',
          'اعثر على الدورة المناسبة لك'
        ),
        description: lt(
          'Search our courses by name, or browse them all.',
          'ابحث في دوراتنا بالاسم، أو تصفّحها كلها.'
        ),
        image: themePhoto(context, 'home-hero'),
        showSearch: true,
        cta: pageButton(context, 'courses', lt('All courses', 'كل الدورات')),
      },
    }),
  },
];

export const ABOUT_PRESETS: readonly SectionPreset<'about'>[] = [
  {
    type: 'about',
    key: 'story',
    build: (context) => ({
      config: {
        title: lt('About us', 'من نحن'),
        body: ph(
          'Tell your story: when the academy started, who teaches in it and what makes your classes different',
          'احكِ قصتكم: متى بدأت الأكاديمية، ومن يدرّس فيها، وما الذي يميّز حصصكم'
        ),
        image: themePhoto(context, 'about-story'),
        cta: pageButton(context, 'contact', lt('Contact us', 'تواصل معنا')),
      },
    }),
  },
  {
    type: 'about',
    key: 'mission',
    build: () => ({
      config: {
        title: lt('Our mission', 'رسالتنا'),
        body: ph(
          'In two or three sentences, say what you want every student to gain from studying with you',
          'في جملتين أو ثلاث، اذكر ما تريد أن يكسبه كل طالب من الدراسة معكم'
        ),
      },
      design: { align: 'center' },
    }),
  },
  {
    type: 'about',
    key: 'approach',
    build: (context) => ({
      config: {
        title: lt('How we teach', 'طريقتنا في التدريس'),
        body: ph(
          'Describe a typical class: how a lesson is explained, how students practise and how you follow their progress',
          'صِف حصة معتادة: كيف يُشرح الدرس، وكيف يتدرّب الطلاب، وكيف تتابعون مستواهم'
        ),
        image: themePhoto(context, 'home-benefit'),
        cta: pageButton(context, 'courses', BROWSE_COURSES),
      },
      design: { background: 'soft', reverseOnMobile: true },
    }),
  },
];

export const FEATURE_SPLIT_PRESETS: readonly SectionPreset<'featureSplit'>[] = [
  {
    type: 'featureSplit',
    key: 'imageStart',
    build: (context) => ({
      config: {
        eyebrow: lt('What you get', 'ما الذي ستحصل عليه'),
        title: lt(
          'Everything a student needs in one place',
          'كل ما يحتاجه الطالب في مكان واحد'
        ),
        image: themePhoto(context, 'home-benefit'),
        imagePosition: 'start',
        items: [
          {
            id: newItemId(),
            title: lt('Lessons you can return to', 'دروس يمكنك الرجوع إليها'),
            description: lt(
              'Open your course on a phone or a computer whenever you want to revise.',
              'افتح دورتك من الهاتف أو الحاسوب متى أردت المراجعة.'
            ),
          },
          {
            id: newItemId(),
            title: lt('A clear plan for each course', 'خطة واضحة لكل دورة'),
            description: lt(
              'Each course page shows what it covers, lesson by lesson.',
              'تعرض صفحة كل دورة ما تغطّيه، درسًا بدرس.'
            ),
          },
          {
            id: newItemId(),
            title: ph('Your third benefit', 'الميزة الثالثة'),
            description: ph('One sentence about it', 'جملة واحدة عنها'),
          },
        ],
        cta: signUpButton(REGISTER_NOW),
      },
    }),
  },
  {
    type: 'featureSplit',
    key: 'imageEnd',
    build: (context) => ({
      config: {
        eyebrow: lt('For parents', 'لأولياء الأمور'),
        title: lt('Follow your child’s learning', 'تابِع تعلّم ابنك'),
        description: ph(
          'Explain how parents hear about attendance, tests and progress',
          'اشرح كيف يعرف وليّ الأمر الحضور والاختبارات ومستوى التقدّم'
        ),
        image: themePhoto(context, 'about-story'),
        imagePosition: 'end',
        items: [
          {
            id: newItemId(),
            title: ph('First thing parents receive', 'أول ما يصل وليّ الأمر'),
          },
          {
            id: newItemId(),
            title: ph('Second thing parents receive', 'ثاني ما يصل وليّ الأمر'),
          },
        ],
        cta: pageButton(context, 'contact', lt('Talk to us', 'تحدّث إلينا')),
      },
      design: { background: 'soft', reverseOnMobile: true },
    }),
  },
];

export const ANNOUNCEMENT_BAR_PRESETS: readonly SectionPreset<'announcementBar'>[] =
  [
    {
      type: 'announcementBar',
      key: 'registration',
      build: () => ({
        config: {
          text: ph(
            'Registration for the new term is open',
            'التسجيل للترم الجديد مفتوح الآن'
          ),
          tone: 'brand',
          cta: signUpButton(REGISTER_NOW),
        },
      }),
    },
    {
      type: 'announcementBar',
      key: 'offer',
      build: () => ({
        config: {
          text: ph('Your offer, and the date it ends', 'العرض وتاريخ انتهائه'),
          tone: 'dark',
          cta: whatsappButton(lt('Ask on WhatsApp', 'اسأل على واتساب')),
        },
      }),
    },
    {
      type: 'announcementBar',
      key: 'notice',
      build: () => ({
        config: {
          text: ph(
            'A short notice, such as a holiday or a schedule change',
            'تنبيه قصير، مثل إجازة أو تغيير في المواعيد'
          ),
          tone: 'soft',
        },
      }),
    },
  ];
