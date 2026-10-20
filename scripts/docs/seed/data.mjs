// The Help Center demo dataset. Every person, number, address and account
// here is invented: emails use example.com, phone numbers are 010 0000 00xx,
// bank/wallet/InstaPay details are obvious placeholders.

export const PASSWORD = 'AtlasDocs#2026demo';
const p = (en, ar) => ({ en, ar });

export const OWNER = { name: p('Nour Hassan', 'نور حسن'), email: 'nour.owner@example.com', phone: '01000000001' };
export const ORG_NAME = 'Al-Nour Learning (demo)';
export const ACADEMY = {
  slug: 'al-nour',
  name: p('Al-Nour Academy', 'أكاديمية النور'),
  description: p(
    'Math, study skills and English courses for secondary-school students, taught step by step.',
    'كورسات رياضيات ومهارات مذاكرة وإنجليزي لطلاب الثانوي، بشرح خطوة بخطوة.'
  ),
  contactEmail: 'hello@al-nour.example.com',
  contactPhone: '+20 100 000 0002',
};
export const SECOND_ACADEMY = { slug: 'al-nour-kids', name: p('Al-Nour Kids', 'النور للأطفال') };

export const MANAGER = { name: p('Karim Adel', 'كريم عادل'), email: 'karim.manager@example.com', phone: '01000000003' };
export const INSTRUCTOR = { name: p('Mona Fathy', 'منى فتحي'), email: 'mona.instructor@example.com', phone: '01000000004' };
/** Invited as an instructor; never accepts (stays "pending"). */
export const INVITED = { name: p('Dina Farouk', 'دينا فاروق'), email: 'dina.invited@example.com' };

/**
 * Atlas's OWN InstaPay method (the Platform Owner's catalog row `instapay`,
 * inserted as a disabled placeholder by the backend migration
 * 20261102000400): what the organization pays its subscription with.
 * Stored exactly as `toStoredInstapayInstructions` stores a Platform Owner's
 * edit (step 08). Not the academy's own methods below.
 */
export const PLATFORM_INSTAPAY = {
  key: 'instapay',
  instructions: {
    type: 'manual_instapay',
    instapayAddress: 'atlas.demo@instapay',
    accountName: 'Atlas Platform (demo)',
    accountNameAr: 'منصة أطلس (تجريبي)',
    instructions: 'Send the exact amount shown by InstaPay to the address above, then upload a screenshot of the confirmation.',
    instructionsAr: 'حوّل المبلغ المعروض بالظبط بإنستاباي على العنوان ده، وبعدين ارفع صورة شاشة التأكيد.',
    referenceInstructions: 'Enter the InstaPay transaction number.',
    referenceInstructionsAr: 'اكتب رقم عملية إنستاباي.',
  },
};

export const PAYMENT_METHODS = {
  'bank-transfer': {
    enabled: true,
    instructions: {
      bankName: 'Demo Bank Egypt',
      branchName: 'Demo Branch',
      accountName: 'Al-Nour Academy (demo)',
      accountNameAr: 'أكاديمية النور (تجريبي)',
      accountNumber: '0000111122223333',
      instructions: 'Transfer the exact course price, then upload a photo of the receipt.',
      instructionsAr: 'حوّل سعر الكورس بالظبط، وبعدين ارفع صورة الإيصال.',
      referenceInstructions: 'Write your full name and the course name as the transfer reference.',
      referenceInstructionsAr: 'اكتب اسمك بالكامل واسم الكورس في خانة المرجع.',
    },
  },
  wallet: {
    enabled: true,
    instructions: {
      walletProvider: 'vodafone_cash',
      walletNumber: '01000000009',
      accountName: 'Nour Hassan (demo)',
      accountNameAr: 'نور حسن (تجريبي)',
      instructions: 'Send the course price to the wallet number above and keep the confirmation message.',
      instructionsAr: 'حوّل سعر الكورس على رقم المحفظة ده واحتفظ برسالة التأكيد.',
      referenceInstructions: 'Enter the number you sent from.',
      referenceInstructionsAr: 'اكتب الرقم اللي حوّلت منه.',
    },
  },
  instapay: {
    enabled: true,
    instructions: {
      instapayAddress: 'nour.academy@instapay',
      accountName: 'Al-Nour Academy (demo)',
      accountNameAr: 'أكاديمية النور (تجريبي)',
      instructions: 'Send the course price by InstaPay to the address above, then upload the screenshot.',
      instructionsAr: 'حوّل سعر الكورس بإنستاباي على العنوان ده، وبعدين ارفع صورة الشاشة.',
      referenceInstructions: 'Enter the InstaPay transaction number.',
      referenceInstructionsAr: 'اكتب رقم عملية إنستاباي.',
    },
  },
};

// Fake (well-formed but non-existent) YouTube ids and example.com links.
const yt = (n) => `https://www.youtube.com/watch?v=atlasDemo${String(n).padStart(2, '0')}`;
const link = (file) => `https://files.example.com/al-nour/${file}`;
const V = (en, ar, n, extra = {}) => ({ title: p(en, ar), kind: 'video', url: yt(n), ...extra });
const F = (en, ar, file) => ({ title: p(en, ar), kind: 'file', url: link(file) });

export const COURSES = [
  {
    key: 'calculus',
    slug: 'calculus-essentials',
    cover: 'cover-calculus.jpg',
    pricing: { type: 'paid', amount: 850, currency: 'EGP' },
    publish: true,
    level: 'intermediate',
    instructor: true,
    certificate: true,
    title: p('Calculus Essentials', 'أساسيات التفاضل والتكامل'),
    short: p(
      'Limits, derivatives and their applications, explained step by step with solved exam questions.',
      'النهايات والتفاضل وتطبيقاته، بشرح خطوة بخطوة وأسئلة امتحانات محلولة.'
    ),
    outcomes: p(
      ['Find limits and test continuity', 'Differentiate any function in the curriculum', 'Solve rate-of-change problems'],
      ['إيجاد النهايات ودراسة الاتصال', 'اشتقاق أي دالة في المنهج', 'حل مسائل معدلات التغيّر']
    ),
    requirements: p(['Algebra from the previous year'], ['جبر السنة اللي فاتت']),
    sections: [
      {
        title: p('Limits and continuity', 'النهايات والاتصال'),
        lessons: [
          V('What is a limit?', 'يعني إيه نهاية؟', 1, { preview: true }),
          F('Limits worksheet (PDF)', 'ورقة تدريب النهايات (PDF)', 'limits-worksheet.pdf'),
          V('Continuity of a function', 'اتصال الدالة', 2),
        ],
      },
      {
        title: p('Derivatives', 'التفاضل'),
        lessons: [
          V('The derivative as a rate of change', 'المشتقة كمعدل تغيّر', 3),
          V('The chain rule', 'قاعدة السلسلة', 4),
          F('Derivatives practice sheet', 'ورقة تدريب التفاضل', 'derivatives-practice.pdf'),
        ],
      },
    ],
    quiz: {
      afterSection: 0,
      title: p('Limits check-up', 'اختبار النهايات'),
      description: p('Five questions on limits and continuity.', 'خمسة أسئلة على النهايات والاتصال.'),
      questions: [
        {
          type: 'single_choice',
          prompt: p('What is the limit of (x² − 4)/(x − 2) as x approaches 2?', 'ما نهاية (س² − ٤)/(س − ٢) عندما تقترب س من ٢؟'),
          options: [[p('4', '٤'), true], [p('2', '٢'), false], [p('0', '٠'), false], [p('Undefined', 'غير معرّفة'), false]],
        },
        {
          type: 'multiple_choice',
          prompt: p('Which of these functions are continuous everywhere?', 'أي من الدوال دي متصلة على كل الأعداد الحقيقية؟'),
          options: [[p('x² + 1', 'س² + ١'), true], [p('1/x', '١/س'), false], [p('sin x', 'جا س'), true], [p('√x', '√س'), false]],
        },
        {
          type: 'true_false',
          prompt: p('A function can have a limit at a point where it is not defined.', 'ممكن يكون للدالة نهاية عند نقطة هي مش معرّفة عندها.'),
          options: [[p('True', 'صح'), true], [p('False', 'خطأ'), false]],
        },
        {
          type: 'short_answer',
          prompt: p('What is the limit of 3x + 1 as x approaches 2?', 'ما نهاية ٣س + ١ عندما تقترب س من ٢؟'),
          acceptedAnswers: ['7', '٧'],
        },
        {
          type: 'essay',
          points: 4,
          prompt: p('Explain in your own words why direct substitution fails for (x² − 4)/(x − 2) at x = 2, and how to find the limit.', 'اشرح بأسلوبك ليه التعويض المباشر مش بينفع في (س² − ٤)/(س − ٢) عند س = ٢، وإزاي نوجد النهاية.'),
        },
      ],
    },
    assignment: {
      section: 1,
      title: p('Derivatives problem set', 'واجب التفاضل'),
      description: p('Solve the five problems and upload your answers.', 'حل المسائل الخمسة وارفع إجاباتك.'),
      instructions: p(
        'Solve problems 1–5 from the practice sheet. Show every step, then paste your answers or a link to a photo of your notebook.',
        'حل المسائل من ١ لـ ٥ من ورقة التدريب. اكتب كل الخطوات، وبعدين الصق إجاباتك أو لينك صورة الكشكول.'
      ),
    },
  },
  {
    key: 'study',
    slug: 'study-skills-starter',
    cover: 'cover-study.jpg',
    pricing: { type: 'free' },
    publish: true,
    level: 'beginner',
    title: p('Study Skills Starter', 'بداية مهارات المذاكرة'),
    short: p('Plan your week, take better notes and revise smarter before exams.', 'نظّم أسبوعك، واكتب ملاحظات أحسن، وراجع بذكاء قبل الامتحانات.'),
    outcomes: p(['Build a weekly study plan', 'Take clear notes'], ['تعمل جدول مذاكرة أسبوعي', 'تكتب ملاحظات واضحة']),
    requirements: p([], []),
    sections: [
      {
        title: p('Getting started', 'البداية'),
        lessons: [
          V('Planning your week', 'تنظيم أسبوعك', 11, { preview: true }),
          V('Taking better notes', 'إزاي تكتب ملاحظات أحسن', 12),
          F('Weekly planner template', 'نموذج جدول المذاكرة الأسبوعي', 'weekly-planner.pdf'),
        ],
      },
    ],
  },
  {
    key: 'english',
    slug: 'english-grammar-basics',
    cover: 'cover-english.jpg',
    pricing: { type: 'paid', amount: 450, currency: 'EGP' },
    publish: true,
    level: 'beginner',
    title: p('English Grammar Basics', 'أساسيات قواعد الإنجليزي'),
    short: p('Tenses, questions and the grammar you need for everyday English.', 'الأزمنة والأسئلة والقواعد اللي محتاجها في الإنجليزي اليومي.'),
    outcomes: p(['Use the main tenses correctly'], ['تستخدم الأزمنة الأساسية صح']),
    requirements: p([], []),
    sections: [
      {
        title: p('Tenses', 'الأزمنة'),
        lessons: [V('Present simple', 'المضارع البسيط', 21), V('Past simple', 'الماضي البسيط', 22)],
      },
    ],
  },
  {
    key: 'physics',
    slug: 'physics-mechanics',
    cover: 'cover-physics.jpg',
    pricing: { type: 'paid', amount: 600, currency: 'EGP' },
    publish: false,
    level: 'intermediate',
    title: p('Physics: Mechanics', 'الفيزياء: الميكانيكا'),
    short: p('Motion, forces and energy — a draft course still being written.', 'الحركة والقوى والطاقة — كورس لسه بيتكتب.'),
    outcomes: p(['Describe motion with equations'], ['وصف الحركة بالمعادلات']),
    requirements: p([], []),
    sections: [{ title: p('Motion in a straight line', 'الحركة في خط مستقيم'), lessons: [V('Speed and velocity', 'السرعة والسرعة المتجهة', 31)] }],
  },
];

// Learners of al-nour. `story` says what the seed does with each one.
export const LEARNERS = [
  { key: 'salma', name: p('Salma Ibrahim', 'سلمى إبراهيم'), story: 'calculus (InstaPay, approved); section 1 done; quiz with an essay awaiting grading; assignment submitted' },
  { key: 'omar', name: p('Omar Khaled', 'عمر خالد'), story: 'calculus (bank transfer, approved); completed; certificate issued' },
  { key: 'hana', name: p('Hana Mostafa', 'هنا مصطفى'), story: 'study skills (free) in progress; English (wallet, approved) then a refund request' },
  { key: 'ali', name: p('Ali Hassan', 'علي حسن'), story: 'calculus order pending review (wallet proof uploaded)' },
  { key: 'mariam', name: p('Mariam Adel', 'مريم عادل'), story: 'English order rejected (bank transfer)' },
  { key: 'youssef', name: p('Youssef Tarek', 'يوسف طارق'), story: 'study skills (free); blocked by staff' },
  { key: 'laila', name: p('Laila Samir', 'ليلى سمير'), story: 'registered while the academy required approval: pending approval' },
  { key: 'ziad', name: p('Ziad Fawzy', 'زياد فوزي'), story: 'calculus granted manually by staff, access expires in 60 days' },
];
export const learnerEmail = (l) => `${l.key}.learner@example.com`;

export const CONTACT_MESSAGES = [
  { name: 'Ahmed Demo', email: 'ahmed.visitor@example.com', message: 'Hello, is the Calculus Essentials course suitable for first-year students? Thanks.' },
  { name: 'فاطمة تجريبي', email: 'fatma.visitor@example.com', message: 'السلام عليكم، هل ممكن أدفع الكورس بفودافون كاش؟ وهل في مجموعات أونلاين؟' },
];
