/**
 * The §C.1 Home composition for Theme 1 (plan Phase 5): the 11 sections in
 * plan order, with bilingual copy. It exists so Phase 5 can be verified on
 * the composition the plan specifies. Phase 7 moves this composition into
 * the backend template (`modern-education.template.ts` v2); until then,
 * provisioning still creates the v1 Home that `generated/` holds.
 *
 * Selected with the slug's composition segment:
 *   fx--modern-education--<state>--<palette>--c1
 *
 * Image slots reference theme assets. Only `home-hero` is released (the
 * Phase 3 pilot); the others render the neutral placeholder until the
 * final image stage (§E.6).
 */

const PAGES = {
  about: 'fx-modern-education-page-2',
  courses: 'fx-modern-education-page-4',
  faqs: 'fx-modern-education-page-6',
  contact: 'fx-modern-education-page-8',
};

const VISIBLE = { desktop: true, tablet: true, mobile: true };
const lt = (en, ar) => ({ en, ar });

let counter = 0;
const id = (name) => `fx-c1-${name}-${++counter}`;

function section(type, config) {
  return { id: id(type), enabled: true, visibility: VISIBLE, type, config };
}

const TESTIMONIALS = [
  {
    authorName: 'Sara Al-Mansoori',
    authorRole: lt('Product designer', 'مصمّمة منتجات'),
    quote: lt(
      'The projects were close to real work, and the feedback on each one helped me put together a portfolio I was proud to share.',
      'كانت المشاريع قريبة من العمل الحقيقي، وساعدتني الملاحظات على كل مشروع في بناء ملف أعمال أفخر بمشاركته.'
    ),
    rating: 5,
  },
  {
    authorName: 'James Whitfield',
    authorRole: lt('Operations lead', 'قائد عمليات'),
    quote: lt(
      'I could fit the lessons around a full-time job. Short videos, clear exercises and instructors who actually answered.',
      'استطعت أن أوفّق بين الدروس ووظيفتي بدوام كامل. فيديوهات قصيرة وتمارين واضحة ومدرّبون يجيبون فعلًا.'
    ),
    rating: 5,
  },
  {
    authorName: 'Nour Haddad',
    authorRole: lt('Data analyst', 'محلّلة بيانات'),
    quote: lt(
      'The step-by-step structure made a difficult subject approachable. I use what I learned every week.',
      'جعل التدرّج خطوة بخطوة الموضوعَ الصعب في المتناول. أستخدم ما تعلّمته كل أسبوع.'
    ),
    rating: 4,
  },
];

/**
 * The Home page sections. `state` only changes whether the testimonials
 * are still starter samples (`new`, never public) or were confirmed by the
 * Owner as real (`rich`).
 */
export function buildTheme1HomeSections(state) {
  counter = 0;
  return [
    section('hero', {
      eyebrow: lt('Enrolment is open', 'التسجيل مفتوح الآن'),
      title: lt(
        'Learn the skills that move your career forward',
        'تعلّم المهارات التي تدفع مسيرتك المهنية إلى الأمام'
      ),
      highlight: lt('move your career forward', 'تدفع مسيرتك المهنية'),
      description: lt(
        'Practical, expert-led courses you can take at your own pace, with real projects and support whenever you need it.',
        'دورات عملية يقدّمها خبراء، تتعلّم فيها بالسرعة التي تناسبك، مع مشاريع حقيقية ودعم متى احتجت إليه.'
      ),
      cta: {
        label: lt('Explore courses', 'استكشف الدورات'),
        pageId: PAGES.courses,
      },
      secondaryCta: {
        label: lt('Talk to us', 'تحدّث إلينا'),
        pageId: PAGES.contact,
      },
      showSearch: true,
      highlights: [
        {
          id: id('hl'),
          label: lt('Project-based learning', 'تعلّم قائم على المشاريع'),
        },
        {
          id: id('hl'),
          label: lt('Learn at your own pace', 'تعلّم بالسرعة التي تناسبك'),
        },
        {
          id: id('hl'),
          label: lt('Support from real instructors', 'دعم من مدرّبين حقيقيين'),
        },
      ],
      image: 'theme-asset:modern-education/home-hero',
    }),
    section('features', {
      layout: 'strip',
      title: lt('Why learners choose us', 'لماذا يختارنا المتعلّمون'),
      items: [
        {
          id: id('f'),
          icon: 'GraduationCap',
          title: lt('Expert instructors', 'مدرّبون خبراء'),
          description: lt(
            'Taught by people who do the work every day.',
            'يقدّمها أشخاص يمارسون العمل كل يوم.'
          ),
        },
        {
          id: id('f'),
          icon: 'Clock',
          title: lt('Flexible schedule', 'جدول مرن'),
          description: lt(
            'Start any time and learn around your week.',
            'ابدأ في أي وقت وتعلّم بما يناسب أسبوعك.'
          ),
        },
        {
          id: id('f'),
          icon: 'BookOpen',
          title: lt('Hands-on projects', 'مشاريع تطبيقية'),
          description: lt(
            'Every course ends with work you can show.',
            'تنتهي كل دورة بعمل يمكنك عرضه.'
          ),
        },
        {
          id: id('f'),
          icon: 'Headphones',
          title: lt('Real support', 'دعم حقيقي'),
          description: lt(
            'Questions answered by the instructor.',
            'يجيب المدرّب عن أسئلتك بنفسه.'
          ),
        },
      ],
    }),
    section('courseCategories', {
      title: lt('Explore by category', 'استكشف حسب التصنيف'),
      description: lt(
        'Find the right place to start, whatever you want to learn.',
        'اعثر على نقطة البداية المناسبة، أيًّا كان ما تريد تعلّمه.'
      ),
      maxItems: 8,
      showCounts: true,
    }),
    section('featuredCourses', {
      title: lt('Featured courses', 'دورات مميّزة'),
      description: lt(
        'Popular courses our learners recommend.',
        'دورات يوصي بها متعلّمونا.'
      ),
      mode: 'latest',
      layout: 'grid',
      count: 6,
      showPrice: true,
      showInstructor: true,
    }),
    section('featureSplit', {
      eyebrow: lt('Why Horizon Academy', 'لماذا Horizon Academy'),
      title: lt(
        'Learning designed around real progress',
        'تعلّم مصمَّم حول تقدّم حقيقي'
      ),
      description: lt(
        'Every course is built to take you from the basics to confident, practical work, one clear step at a time.',
        'صُمّمت كل دورة لتنقلك من الأساسيات إلى عمل عملي بثقة، خطوة واضحة تلو الأخرى.'
      ),
      image: 'theme-asset:modern-education/home-benefit',
      imagePosition: 'start',
      items: [
        {
          id: id('b'),
          title: lt('Clear learning paths', 'مسارات تعلّم واضحة'),
          description: lt(
            'Know exactly what to learn next and why it matters.',
            'اعرف تمامًا ما ستتعلّمه لاحقًا ولماذا يهمّ.'
          ),
        },
        {
          id: id('b'),
          title: lt('Feedback on your work', 'ملاحظات على عملك'),
          description: lt(
            'Instructors review your projects and help you improve.',
            'يراجع المدرّبون مشاريعك ويساعدونك على التحسّن.'
          ),
        },
        {
          id: id('b'),
          title: lt('Skills you can use', 'مهارات تستخدمها فعلًا'),
          description: lt(
            'Courses focus on what you will do at work, not just theory.',
            'تركّز الدورات على ما ستفعله في العمل، لا على النظرية فقط.'
          ),
        },
      ],
      cta: { label: lt('About us', 'تعرّف علينا'), pageId: PAGES.about },
    }),
    section('steps', {
      title: lt('How it works', 'كيف يعمل'),
      description: lt(
        'Getting started takes a few minutes.',
        'البدء لا يستغرق سوى دقائق.'
      ),
      items: [
        {
          id: id('s'),
          title: lt('Choose a course', 'اختر دورة'),
          description: lt(
            'Browse the catalog and pick the course that fits your goal.',
            'تصفّح الدورات واختر ما يناسب هدفك.'
          ),
        },
        {
          id: id('s'),
          title: lt('Learn at your pace', 'تعلّم بالسرعة التي تناسبك'),
          description: lt(
            'Watch short lessons and practise with guided exercises.',
            'شاهد دروسًا قصيرة وتدرّب عبر تمارين موجّهة.'
          ),
        },
        {
          id: id('s'),
          title: lt('Apply what you learn', 'طبّق ما تعلّمته'),
          description: lt(
            'Finish with a project that shows your new skills.',
            'اختتم بمشروع يُظهر مهاراتك الجديدة.'
          ),
        },
      ],
    }),
    section('instructors', {
      title: lt('Meet your instructors', 'تعرّف على مدرّبيك'),
      description: lt(
        'Practitioners who love teaching what they do.',
        'ممارسون يحبّون تعليم ما يتقنونه.'
      ),
      count: 4,
    }),
    section('statistics', {
      title: lt('Horizon Academy in numbers', 'Horizon Academy بالأرقام'),
      items: [
        {
          id: id('st'),
          metric: 'courses',
          value: lt('', ''),
          label: lt('Courses', 'دورة'),
        },
        {
          id: id('st'),
          metric: 'students',
          value: lt('', ''),
          label: lt('Learners', 'متعلّم'),
        },
        {
          id: id('st'),
          metric: 'instructors',
          value: lt('', ''),
          label: lt('Instructors', 'مدرّب'),
        },
      ],
    }),
    section('testimonials', {
      title: lt('What our learners say', 'ماذا يقول متعلّمونا'),
      items: TESTIMONIALS.map((item) => ({
        id: id('t'),
        ...item,
        sample: state !== 'rich',
      })),
    }),
    section('faq', {
      title: lt('Questions, answered', 'إجابات عن أسئلتك'),
      maxItems: 4,
      cta: {
        label: lt('See all questions', 'عرض كل الأسئلة'),
        pageId: PAGES.faqs,
      },
      items: [
        {
          id: id('q'),
          question: lt(
            'Do I need any experience to start?',
            'هل أحتاج إلى خبرة سابقة للبدء؟'
          ),
          answer: lt(
            'No. Each course lists what you need before you start, and most begin with the basics.',
            'لا. تذكر كل دورة ما تحتاجه قبل البدء، وتبدأ معظمها من الأساسيات.'
          ),
        },
        {
          id: id('q'),
          question: lt(
            'How long do I have access to a course?',
            'ما مدة وصولي إلى الدورة؟'
          ),
          answer: lt(
            'Once you enrol you can learn at your own pace and come back to the lessons whenever you need them.',
            'بعد التسجيل يمكنك التعلّم بالسرعة التي تناسبك والعودة إلى الدروس متى احتجت إليها.'
          ),
        },
        {
          id: id('q'),
          question: lt(
            'Can I learn on my phone?',
            'هل يمكنني التعلّم من هاتفي؟'
          ),
          answer: lt(
            'Yes. Lessons work on phones, tablets and computers, and your progress is saved everywhere.',
            'نعم. تعمل الدروس على الهواتف والأجهزة اللوحية والحواسيب، ويُحفظ تقدّمك في كل مكان.'
          ),
        },
        {
          id: id('q'),
          question: lt(
            'How do I get help if I am stuck?',
            'كيف أحصل على المساعدة إذا واجهتني صعوبة؟'
          ),
          answer: lt(
            'Send your question through the course or contact us, and an instructor will get back to you.',
            'أرسل سؤالك عبر الدورة أو تواصل معنا، وسيعود إليك أحد المدرّبين.'
          ),
        },
        {
          id: id('q'),
          question: lt(
            'Do you offer free courses?',
            'هل تقدّمون دورات مجانية؟'
          ),
          answer: lt(
            'Some courses are free. Look for the "Free" label in the catalog.',
            'بعض الدورات مجانية. ابحث عن علامة «مجاني» في قائمة الدورات.'
          ),
        },
      ],
    }),
    section('cta', {
      title: lt('Start learning today', 'ابدأ التعلّم اليوم'),
      description: lt(
        'Create your free account and take the first step toward your next skill.',
        'أنشئ حسابك المجاني وخُذ الخطوة الأولى نحو مهارتك التالية.'
      ),
      cta: {
        label: lt('Create your free account', 'أنشئ حسابك المجاني'),
        authAction: 'signUp',
      },
      secondaryCta: {
        label: lt('Browse courses', 'تصفّح الدورات'),
        pageId: PAGES.courses,
      },
      image: 'theme-asset:modern-education/home-cta',
    }),
  ];
}
