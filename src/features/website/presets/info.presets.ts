/**
 * Presets for the sections that explain and answer: the reasons to learn
 * with you, how joining works, the learning path, the FAQ and the live
 * numbers. See `section-presets.types.ts` for the rules.
 */
import type { SectionPreset } from './section-presets.types';
import { lt, newItemId, pageButton, ph } from './preset-content.utils';

export const FEATURES_PRESETS: readonly SectionPreset<'features'>[] = [
  {
    type: 'features',
    key: 'cards',
    build: () => ({
      config: {
        title: lt('Why study with us', 'لماذا تدرس معنا'),
        description: ph(
          'One line on what makes your academy the right choice',
          'سطر واحد عمّا يجعل أكاديميتك الاختيار المناسب'
        ),
        items: [
          {
            id: newItemId(),
            icon: 'GraduationCap',
            title: lt('Know your teachers', 'تعرّف على مدرّسيك'),
            description: lt(
              'Each course shows who teaches it.',
              'تعرض كل دورة اسم من يدرّسها.'
            ),
          },
          {
            id: newItemId(),
            icon: 'BookOpen',
            title: lt('A clear outline', 'مخطّط واضح'),
            description: lt(
              'See what every course covers before you register.',
              'اعرف ما تغطّيه كل دورة قبل أن تسجّل.'
            ),
          },
          {
            id: newItemId(),
            icon: 'Globe',
            title: lt('Learn from anywhere', 'تعلّم من أي مكان'),
            description: lt(
              'Open your lessons on a phone, tablet or computer.',
              'افتح دروسك من الهاتف أو الجهاز اللوحي أو الحاسوب.'
            ),
          },
        ],
      },
    }),
  },
  {
    type: 'features',
    key: 'strip',
    build: () => ({
      config: {
        layout: 'strip',
        items: [
          {
            id: newItemId(),
            icon: 'BookOpen',
            title: lt('Clear course outlines', 'مخطّط واضح لكل دورة'),
            description: lt('', ''),
          },
          {
            id: newItemId(),
            icon: 'Video',
            title: lt('Lessons online', 'دروس عبر الإنترنت'),
            description: lt('', ''),
          },
          {
            id: newItemId(),
            icon: 'Users',
            title: lt('Teachers you can ask', 'مدرّسون تسألهم'),
            description: lt('', ''),
          },
          {
            id: newItemId(),
            icon: 'Clock',
            title: ph('Your fourth highlight', 'الميزة الرابعة'),
            description: lt('', ''),
          },
        ],
      },
      design: { spacing: 'compact' },
    }),
  },
  {
    type: 'features',
    key: 'six',
    build: () => ({
      config: {
        title: lt('What studying with us includes', 'ماذا تتضمّن الدراسة معنا'),
        items: [
          ['GraduationCap', 'Explanation', 'الشرح'],
          ['BookOpen', 'Notes and summaries', 'المذكرات والملخصات'],
          ['Award', 'Tests', 'الاختبارات'],
          ['Users', 'Follow-up', 'المتابعة'],
          ['Headphones', 'Answering questions', 'الإجابة عن الأسئلة'],
          ['ShieldCheck', 'Revision', 'المراجعة'],
        ].map(([icon, en, ar]) => ({
          id: newItemId(),
          icon,
          title: lt(en, ar),
          description: ph(
            'How you do it, in one sentence',
            'كيف تقدّمونه، في جملة واحدة'
          ),
        })),
      },
      design: { background: 'soft' },
    }),
  },
];

export const STEPS_PRESETS: readonly SectionPreset<'steps'>[] = [
  {
    type: 'steps',
    key: 'register',
    build: () => ({
      config: {
        title: lt('How to join', 'كيف تنضم إلينا'),
        description: lt(
          'Three steps from your first visit to your first lesson.',
          'ثلاث خطوات من زيارتك الأولى إلى درسك الأول.'
        ),
        items: [
          {
            id: newItemId(),
            title: lt('Create your account', 'أنشئ حسابك'),
            description: lt(
              'Sign up on this website from any device.',
              'سجّل على هذا الموقع من أي جهاز.'
            ),
          },
          {
            id: newItemId(),
            title: lt('Choose your course', 'اختر دورتك'),
            description: lt(
              'Read what each course covers and pick the one for your grade.',
              'اقرأ ما تغطّيه كل دورة واختر دورة صفّك الدراسي.'
            ),
          },
          {
            id: newItemId(),
            title: lt('Start learning', 'ابدأ التعلّم'),
            description: lt(
              'Open your lessons from your account on any device.',
              'افتح دروسك من حسابك على أي جهاز.'
            ),
          },
        ],
      },
    }),
  },
  {
    type: 'steps',
    key: 'placement',
    build: () => ({
      config: {
        title: lt('Your first week with us', 'أسبوعك الأول معنا'),
        items: [
          {
            id: newItemId(),
            title: lt('Talk to us', 'تحدّث إلينا'),
            description: ph(
              'How a family first gets in touch',
              'كيف تتواصل الأسرة معكم أول مرة'
            ),
          },
          {
            id: newItemId(),
            title: lt('Find the right group', 'اختيار المجموعة المناسبة'),
            description: ph(
              'How you place a student in a group',
              'كيف تختارون مجموعة الطالب'
            ),
          },
          {
            id: newItemId(),
            title: lt('The first class', 'الحصة الأولى'),
            description: ph(
              'What happens in the first class',
              'ماذا يحدث في الحصة الأولى'
            ),
          },
          {
            id: newItemId(),
            title: lt('Regular follow-up', 'المتابعة المنتظمة'),
            description: ph(
              'How you keep the family informed',
              'كيف تُطلعون الأسرة على المستوى'
            ),
          },
        ],
      },
      design: { background: 'soft' },
    }),
  },
];

export const TIMELINE_PRESETS: readonly SectionPreset<'timeline'>[] = [
  {
    type: 'timeline',
    key: 'year',
    build: () => ({
      config: {
        title: lt('Your path through the year', 'رحلتك خلال العام'),
        description: lt(
          'What we cover, stage by stage, until the final exam.',
          'ما ندرسه مرحلةً بمرحلة حتى الامتحان النهائي.'
        ),
        items: [
          {
            id: newItemId(),
            title: lt('Term 1', 'الترم الأول'),
            period: ph('Months', 'الشهور'),
            description: ph(
              'The units and tests of the first term',
              'وحدات الترم الأول واختباراته'
            ),
            icon: 'BookOpen',
          },
          {
            id: newItemId(),
            title: lt('Term 2', 'الترم الثاني'),
            period: ph('Months', 'الشهور'),
            description: ph(
              'The units and tests of the second term',
              'وحدات الترم الثاني واختباراته'
            ),
            icon: 'GraduationCap',
          },
          {
            id: newItemId(),
            title: lt('Final revision', 'المراجعة النهائية'),
            period: ph('Months', 'الشهور'),
            description: ph(
              'How you prepare students for the final exam',
              'كيف تُعدّون الطلاب للامتحان النهائي'
            ),
            icon: 'Award',
          },
        ],
      },
    }),
  },
  {
    type: 'timeline',
    key: 'course',
    build: () => ({
      config: {
        title: lt('What the course covers', 'ماذا تغطّي الدورة'),
        items: [1, 2, 3, 4].map((stage) => ({
          id: newItemId(),
          title: ph(`Stage ${stage}`, `المرحلة ${stage}`),
          period: ph(`Weeks of stage ${stage}`, `أسابيع المرحلة ${stage}`),
          description: ph(
            'What students learn in it',
            'ما يتعلّمه الطلاب فيها'
          ),
        })),
      },
    }),
  },
];

export const FAQ_PRESETS: readonly SectionPreset<'faq'>[] = [
  {
    type: 'faq',
    key: 'registration',
    build: () => ({
      config: {
        title: lt('Registration and payment', 'التسجيل والدفع'),
        items: [
          {
            id: newItemId(),
            question: lt('How do I register?', 'كيف أسجّل؟'),
            answer: lt(
              'Create an account on this website, then open the course you want and follow its registration steps.',
              'أنشئ حسابًا على هذا الموقع، ثم افتح الدورة التي تريدها واتّبع خطوات التسجيل فيها.'
            ),
          },
          {
            id: newItemId(),
            question: lt(
              'How much does a course cost?',
              'كم تبلغ تكلفة الدورة؟'
            ),
            answer: lt(
              'Each course shows its price on its own page.',
              'يظهر سعر كل دورة في صفحتها الخاصة.'
            ),
          },
          {
            id: newItemId(),
            question: lt('How can I pay?', 'ما طرق الدفع المتاحة؟'),
            answer: ph(
              'List the ways families can pay',
              'اذكر طرق الدفع المتاحة للأسر'
            ),
          },
          {
            id: newItemId(),
            question: lt(
              'Can I change my group later?',
              'هل يمكنني تغيير مجموعتي لاحقًا؟'
            ),
            answer: ph(
              'Explain your rule for changing groups',
              'اشرح قاعدتكم في تغيير المجموعات'
            ),
          },
        ],
      },
    }),
  },
  {
    type: 'faq',
    key: 'online',
    build: () => ({
      config: {
        title: lt('Studying online', 'الدراسة عبر الإنترنت'),
        items: [
          {
            id: newItemId(),
            question: lt(
              'Can I study on my phone?',
              'هل يمكنني الدراسة من هاتفي؟'
            ),
            answer: lt(
              'Yes. Lessons open on phones, tablets and computers.',
              'نعم. تعمل الدروس على الهواتف والأجهزة اللوحية والحواسيب.'
            ),
          },
          {
            id: newItemId(),
            question: lt(
              'How long can I access a course?',
              'ما مدة وصولي إلى الدورة؟'
            ),
            answer: ph(
              'Say how long a student keeps access to a course',
              'اذكر المدة التي يحتفظ فيها الطالب بالوصول إلى الدورة'
            ),
          },
          {
            id: newItemId(),
            question: lt(
              'What if I have a question about a lesson?',
              'ماذا لو كان لديّ سؤال عن درس؟'
            ),
            answer: ph(
              'Explain how students ask their questions and who answers them',
              'اشرح كيف يطرح الطلاب أسئلتهم ومن يجيب عنها'
            ),
          },
        ],
      },
      design: { width: 'wide' },
    }),
  },
  {
    type: 'faq',
    key: 'teaser',
    build: (context) => ({
      config: {
        title: lt('Frequently asked questions', 'الأسئلة الشائعة'),
        maxItems: 3,
        items: [
          {
            id: newItemId(),
            question: lt('Who are your courses for?', 'لمن دوراتكم؟'),
            answer: ph(
              'The grades and subjects you teach',
              'المراحل والمواد التي تدرّسونها'
            ),
          },
          {
            id: newItemId(),
            question: lt('How do I register?', 'كيف أسجّل؟'),
            answer: lt(
              'Create an account on this website, then open the course you want and follow its registration steps.',
              'أنشئ حسابًا على هذا الموقع، ثم افتح الدورة التي تريدها واتّبع خطوات التسجيل فيها.'
            ),
          },
          {
            id: newItemId(),
            question: lt('How can I contact you?', 'كيف أتواصل معكم؟'),
            answer: lt(
              'Use the details on our Contact page, or send us a message from there.',
              'استخدم بيانات التواصل في صفحة «تواصل معنا»، أو أرسل إلينا رسالة من هناك.'
            ),
          },
        ],
        cta: pageButton(context, 'faqs', lt('All questions', 'كل الأسئلة')),
      },
    }),
  },
];

export const STATISTICS_PRESETS: readonly SectionPreset<'statistics'>[] = [
  {
    type: 'statistics',
    key: 'live',
    build: () => ({
      // Live numbers only: each resolves from the Academy's real data at
      // render time, so a preset never carries a typed figure.
      config: {
        title: lt('Our academy in numbers', 'أكاديميتنا بالأرقام'),
        items: [
          {
            id: newItemId(),
            metric: 'courses',
            value: lt('', ''),
            label: lt('Courses', 'دورة'),
          },
          {
            id: newItemId(),
            metric: 'students',
            value: lt('', ''),
            label: lt('Students', 'طالب'),
          },
          {
            id: newItemId(),
            metric: 'instructors',
            value: lt('', ''),
            label: lt('Teachers', 'مدرّس'),
          },
        ],
      },
    }),
  },
  {
    type: 'statistics',
    key: 'compact',
    build: () => ({
      config: {
        items: [
          {
            id: newItemId(),
            metric: 'courses',
            value: lt('', ''),
            label: lt('Courses', 'دورة'),
          },
          {
            id: newItemId(),
            metric: 'instructors',
            value: lt('', ''),
            label: lt('Teachers', 'مدرّس'),
          },
        ],
      },
      design: { spacing: 'compact' },
    }),
  },
];
