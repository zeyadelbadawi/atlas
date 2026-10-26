/**
 * English copy for the platform marketing site. Tokens are described in
 * `content.types.ts`. Prices, trial length, limits and plan names are never
 * written here: they come from the live catalog at build time.
 */
import type { MarketingContent } from './content.types';
import { PRODUCT_EN } from './product.en';

const REGISTER = '/auth/register';
// Signed-in stand-ins for the trial CTAs: the app resolves `?open=` to the
// visitor's current academy (AcademyDashboardPage).
const DASHBOARD = '/dashboard';
const SUBSCRIPTION = '/dashboard/tenant/subscription';
const inAcademy = (section: 'payments' | 'courses' | 'team' | 'website') =>
  `/dashboard/academy?open=${section}`;
const SALES = '/contact?topic=sales';
/** B2 — the Founding Academies application (link-only contact topic). */
const FOUNDING = '/contact?topic=founding';

export const en: MarketingContent = {
  lang: 'en',
  dir: 'ltr',
  numberLocale: 'en-US',

  brand: {
    name: 'Atlas',
    otherName: 'أطلس',
    tagline: 'Your academy, your name.',
    categoryStatement:
      'Your own branded academy platform for Egyptian teachers who sell their lessons online.',
  },

  plurals: {
    days: { one: '{count} day', other: '{count} days' },
    months: { one: '{count} month', other: '{count} months' },
    students: { one: '{count} student', other: '{count} students' },
    academies: { one: '{count} academy', other: '{count} academies' },
    instructors: { one: '{count} instructor', other: '{count} instructors' },
    courses: { one: '{count} course', other: '{count} courses' },
  },

  unlimited: {
    students: 'unlimited students',
    academies: 'unlimited academies',
    instructors: 'unlimited instructors',
    courses: 'unlimited courses',
  },

  // ─── Chrome ───────────────────────────────────────────────────────────────
  chrome: {
    skipToContent: 'Skip to main content',
    header: {
      navLabel: 'Main',
      homeLabel: '{brand} home',
      product: 'Product',
      productOverview: {
        label: 'Product overview',
        description: 'What an academy on {brand} can do today.',
      },
      pricing: 'Pricing',
      security: 'Security',
      contact: 'Contact',
      about: 'About',
      help: 'Help center',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      menuLabel: 'Site menu',
    },
    productPages: [
      {
        id: 'academy-website',
        label: 'Academy website',
        description: 'Designs, a visual editor, page history and your own domain.',
        moreLabel: 'How the academy website works',
      },
      {
        id: 'payments',
        label: 'Payments',
        description: 'Wallets, InstaPay and bank transfer, approved by you.',
        moreLabel: 'How student payments work',
      },
      {
        id: 'content-protection',
        label: 'Lessons and devices',
        description: 'How lessons play and which devices can open them.',
        moreLabel: 'How lessons and devices work',
      },
      {
        id: 'teams-and-academies',
        label: 'Teams and academies',
        description: 'Roles for your assistants, and more than one academy.',
        moreLabel: 'How teams and several academies work',
      },
      {
        id: 'quizzes-and-certificates',
        label: 'Quizzes and certificates',
        description: 'Exams, homework and certificates anyone can check.',
        moreLabel: 'How quizzes, homework and certificates work',
      },
    ],
    languageSwitch: {
      targetLang: 'ar',
      targetName: 'العربية',
      targetShort: 'ع',
      targetAccessibleName: 'اقرأ هذه الصفحة بالعربية',
      columnTitle: 'Language',
      suggestion: {
        regionLabel: 'اقتراح اللغة',
        text: 'هذه الصفحة متاحة بالعربية.',
        action: 'افتحها بالعربية',
        dismiss: 'إخفاء',
      },
    },
    appHandoff: {
      dashboard: 'Opening your dashboard…',
      signIn: 'Opening the sign-in page…',
      signUp: 'Opening the sign-up page…',
    },
    theme: {
      label: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'Match my device',
    },
    ctas: {
      trial: { label: 'Start my academy trial', href: REGISTER },
      trialShort: {
        label: 'Start trial',
        href: REGISTER,
        ariaLabel: 'Start my academy trial',
      },
      trialWithDays: { label: 'Start {trialDays}-day trial', href: REGISTER },
      assisted: { label: 'Set it up with us', href: SALES },
      seePricing: { label: 'See pricing', href: '/pricing' },
      signIn: { label: 'Sign in', href: '/auth/sign-in' },
      talkToUs: { label: 'Talk to us', href: SALES },
      goToDashboard: { label: 'Open dashboard', href: '/dashboard' },
      goToDashboardShort: { label: 'Dashboard', href: '/dashboard' },
      managePlan: { label: 'Manage my plan', href: SUBSCRIPTION },
    },
    trialMicrocopy: '{trialDays}-day trial. No card needed.',
    stickyCta: { regionLabel: 'Quick actions' },
    footer: {
      label: 'Site footer',
      blurb: 'Online academies under their owners’ names, for teachers in Egypt.',
      columns: [
        {
          title: 'Product',
          links: [
            { label: 'Product overview', href: '/features' },
            { label: 'Pricing', href: '/pricing' },
          ],
          products: true,
        },
        {
          title: 'Company',
          links: [
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Security and privacy', href: '/security' },
          ],
        },
        {
          title: 'Help',
          links: [
            { label: 'Help center', href: 'help:/' },
            { label: 'Getting started', href: 'help:/getting-started' },
            { label: 'FAQ', href: 'help:/faq/general' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Privacy policy', href: '/privacy-policy' },
            { label: 'Terms of service', href: '/terms' },
          ],
        },
      ],
      cookiePreferences: 'Cookie preferences',
      copyright: '© {year} {brand}',
    },
    breadcrumbs: { home: 'Home', product: 'Product' },
    demoLabel: 'Demo content',
    media: {
      heroScreenshotAlt:
        'A demo academy’s home page on its own subdomain, with featured courses',
    },
  },

  // ─── SEO ──────────────────────────────────────────────────────────────────
  seo: {
    home: {
      title: 'Your Own Teaching Academy Online, Under Your Name | {brand}',
      description:
        'Move your paid students from WhatsApp groups to an academy with your name. They pay by wallet or InstaPay, you approve once. {trialDays}-day trial.',
      ogTitle: 'Your own teaching academy online, under your name',
      ogImageAlt: '{brand}: your own teaching academy online, under your name',
    },
    features: {
      title: 'Product: Academy Website, Payments and Teams | {brand}',
      description:
        'An academy site on your own subdomain or domain, wallet and InstaPay payments you approve, quizzes and certificates, and roles for your assistants.',
      ogTitle: 'What you can run on {brand} today',
      ogImageAlt: '{brand} product overview',
    },
    'academy-website': {
      title: 'Academy Website on Your Own Domain, Arabic & English | {brand}',
      description:
        'Your academy site on its own subdomain or a domain you own, built in a visual editor from 32 section types, with page history, in Arabic and English.',
      ogTitle: 'An academy website under your name',
      ogImageAlt: '{brand}: academy website and visual editor',
    },
    'payments': {
      title: 'Collect Course Payments by Vodafone Cash & InstaPay | {brand}',
      description:
        'Students pay you by wallet, InstaPay or bank transfer and upload the proof. You approve once and they are enrolled. No commission on these payments.',
      ogTitle: 'Student payments by wallet, InstaPay or bank transfer',
      ogImageAlt: '{brand}: student payments you approve',
    },
    'content-protection': {
      title: 'Lessons and Device Limits for Paid Courses | {brand}',
      description:
        'YouTube lessons played inside your academy for enrolled students, a device limit you set, one screen at a time, and the student\'s code on each video.',
      ogTitle: 'Lessons and devices on {brand}',
      ogImageAlt: '{brand}: lessons and device limits',
    },
    'teams-and-academies': {
      title: 'Add Teaching Assistants and Run Several Academies | {brand}',
      description:
        'Add assistants as managers or instructors; each instructor sees only their own courses. Open more academies with their own name, domain and students.',
      ogTitle: 'Teams and several academies on {brand}',
      ogImageAlt: '{brand}: roles for your team and several academies',
    },
    'quizzes-and-certificates': {
      title: 'Quizzes, Assignments and Verifiable Certificates | {brand}',
      description:
        'Quizzes with five question types and grading, assignments with due dates and feedback, and certificates anyone can verify online.',
      ogTitle: 'Quizzes, homework and certificates on {brand}',
      ogImageAlt: '{brand}: quizzes, assignments and certificates',
    },
    pricing: {
      title: '{brand} Pricing: Plans by Students and Academies',
      description:
        'Compare plans by number of students and academies, and see the trial terms and the limits of each plan before you start.',
      ogTitle: 'Choose by your number of students',
      ogImageAlt: '{brand} pricing: plans by students and academies',
    },
    security: {
      title: 'Security and Privacy: How Academy Data Is Kept Apart | {brand}',
      description:
        'How each academy’s data is kept separate, how sign-ins are protected, who on your team sees what, and what we don’t offer yet.',
      ogTitle: 'How we keep each academy’s data apart',
      ogImageAlt: '{brand} security and privacy',
    },
    about: {
      title: 'About {brand}: Why We Build It and How to Reach Us',
      description:
        '{brand} is a branded academy platform for Egyptian teachers who sell lessons online. Read why we build it, who it is for and how to reach us.',
      ogTitle: 'Why we build {brand}',
      ogImageAlt: 'About {brand}',
    },
    contact: {
      title: 'Contact {brand}: Plans, Setup Help and Support',
      description:
        'Ask about plans, get help setting up your academy, or reach support. Send us a message and tell us about your academy.',
      ogTitle: 'Talk to the {brand} team',
      ogImageAlt: 'Contact {brand}',
    },
    founding: {
      title: 'Founding Academies: Price Locked for 24 Months | {brand}',
      description:
        'The first 20 academies on {brand} pay the standard annual price and keep it for 24 months, with setup done together. We start 5 academies a week.',
      ogTitle: 'Become a {brand} Founding Academy',
      ogImageAlt: '{brand} Founding Academies',
    },
    notFound: {
      title: 'Page Not Found | {brand}',
      description:
        'This page does not exist. Go to the home page, see pricing or contact us.',
      ogTitle: 'Page not found',
      ogImageAlt: '',
    },
  },

  // ─── Home ─────────────────────────────────────────────────────────────────
  home: {
    hero: {
      eyebrow: 'For teachers in Egypt who already sell online',
      title:
        'Move your paid students from WhatsApp groups to an academy with your name on it',
      lead: '{brand} gives you an academy website under your own name. Students pay you by Vodafone Cash, InstaPay or bank transfer, then upload the proof in your academy. You approve it once and they’re enrolled in the course. {brand} takes no commission on those payments.',
      primaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Open my dashboard', href: DASHBOARD },
      },
      secondaryCta: { label: 'Set it up with us', href: SALES },
      microcopy: '{trialDays}-day trial. No card needed.',
    },

    facts: {
      label: 'At a glance',
      items: [
        {
          icon: 'globe',
          text: 'Your own {brand} subdomain from the moment you create the academy',
          claim: 'ACD-6.2',
        },
        {
          icon: 'link',
          text: 'Connect a domain you already own',
          claim: 'ACD-6.3',
        },
        {
          icon: 'monitor-smartphone',
          text: 'Each student account works on two devices, one screen at a time',
          claim: 'MED-6.1',
        },
        {
          icon: 'wallet',
          text: 'No commission on wallet, InstaPay or bank payments',
          claim: 'COM-2',
        },
      ],
    },

    routine: {
      eyebrow: 'The routine today',
      title:
        'You already sell online. The routine around it is what wears you down.',
      lead: 'Many teachers in Egypt who sell lessons online run on three tools: a WhatsApp group, a YouTube link and a growing pile of transfer screenshots. That works until the group gets big. Then someone has to match every screenshot to a name, keep track of who paid, and hope the link stays with paying students.',
      items: [
        {
          title: 'Receipts, one by one',
          body: 'Transfer receipts arrive as WhatsApp screenshots, and someone has to check each one against a name.',
        },
        {
          title: 'Links get forwarded',
          body: 'A lesson link sent to the group can reach students who never paid.',
        },
        {
          title: 'Nothing carries your name',
          body: 'Your lessons are spread across other people’s platforms, with no single place that is clearly yours.',
        },
      ],
      link: { label: 'See how payments work', href: '#payments' },
    },

    payments: {
      anchor: 'payments',
      eyebrow: 'Payments',
      title:
        'Students pay by Vodafone Cash or InstaPay. You approve the proof and they’re enrolled.',
      lead: 'On {brand}, students pay you directly with the methods you add: Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, InstaPay or bank transfer. They upload the proof inside your academy. You check it and approve it once. The student is enrolled and gets an email, and the money goes straight to you.',
      steps: [
        {
          title: 'How students pay',
          body: 'The student picks one of your payment methods and sees your payment details at checkout.',
          claim: 'COM-2',
        },
        {
          title: 'Upload the proof',
          body: 'They upload a photo of the receipt with its reference, and the payment shows as under review.',
          claim: 'COM-1.5',
        },
        {
          title: 'Approve once',
          body: 'You open the proof, check the amount and approve. The student is enrolled and emailed. If something is wrong, reject it with a reason and the student can pay again.',
          claim: 'COM-3.1, COM-3.2',
        },
      ],
      points: [
        '{brand} takes no commission on these payments. You pay only for your plan.',
        'Every order and payment sits in one list, with its proof and status.',
      ],
      disclosure:
        'Approval is manual and done by the account owner. There is no card or Fawry checkout today.',
      cta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'See my payments in the dashboard', href: inAcademy('payments') },
      },
    },

    website: {
      anchor: 'website',
      eyebrow: 'Your website',
      title: 'Your teaching academy, under your name and on your own domain',
      lead: 'Every {brand} academy gets a public website on its own {brand} subdomain as soon as you create it, and you can connect a domain you already own. Pick one of four designs and add your logo, and the colours come from it. Your pages come in Arabic and English, and you publish when you’re ready.',
      items: [
        {
          title: 'Four designs, your colours',
          body: 'Choose a design and upload your logo. {brand} builds a palette from it and checks that text stays readable.',
          claim: 'WEB-2.1, ACD-5',
        },
        {
          title: 'Pages you edit yourself',
          body: 'Edit each page on the page itself, starting from ready-made sections or a page template. Preview it on phone and desktop, then publish.',
          claim: 'WEB-1.3.1, WEB-1.4',
        },
        {
          title: 'Arabic and English',
          body: 'Each page has an Arabic and an English version, and Arabic pages read right to left.',
          claim: 'WEB-6.7',
        },
        {
          title: 'Your domain',
          body: 'Start on your {brand} subdomain and connect your own domain whenever you have one.',
          claim: 'ACD-6.2, ACD-6.3',
        },
      ],
    },

    team: {
      anchor: 'team',
      eyebrow: 'Your team',
      title:
        'Add your assistants as instructors. Each one sees only the courses they teach.',
      lead: 'On {brand}, you invite assistants by email as managers or instructors. An instructor works only inside the courses you assign, grading the quizzes and homework there. A manager helps you run the academy day to day. Approving student payments stays with you, the account owner, and nobody else on the team can do it.',
      items: [
        {
          title: 'Owner',
          body: 'You. You hold the account, pay for the plan and approve every payment.',
          claim: 'COM-2.0',
        },
        {
          title: 'Manager',
          body: 'Helps you run the academy day to day.',
          claim: 'ORG-2.3',
        },
        {
          title: 'Instructor',
          body: 'Sees and grades only the courses assigned to them.',
          claim: 'LRN-10',
        },
      ],
      moreAcademies: {
        title: 'One account, more than one academy',
        body: 'Starting a new subject or teaching with a partner? Open another academy from the same account, with its own name, website and students. How many you can open depends on your plan.',
      },
      cta: { label: 'Running several academy brands? Talk to us', href: SALES },
    },

    assessments: {
      anchor: 'assessments',
      eyebrow: 'Quizzes and certificates',
      title: 'Quizzes, homework and certificates anyone can check online',
      lead: '{brand} quizzes support five question types, with manual grading for answers that need a person to mark. Set homework with due dates and a late policy, then send feedback. When a student completes a course, they get a certificate with a code that anyone can check on a public page.',
      items: [
        {
          title: 'Quizzes',
          body: 'Five question types, with manual grading where you need it.',
          claim: 'LRN-7.1, LRN-7.4',
        },
        {
          title: 'Homework',
          body: 'Due dates, a late policy and written feedback on every submission.',
          claim: 'LRN-9',
        },
        {
          title: 'Certificates',
          body: 'Issued when a student completes the course, with a public page that confirms each one.',
          claim: 'LRN-11, LRN-11.5',
        },
      ],
    },

    students: {
      anchor: 'students',
      eyebrow: 'Your students',
      title: 'How do I manage my students?',
      lead: 'Students create their account on your {brand} academy website, then buy the courses they need. You decide how they join: open sign-up, sign-up with your approval, or by invitation only. Reports show enrolments and progress and point out students who have gone quiet. You can also email your students from the academy.',
      items: [
        {
          title: 'Who can join',
          body: 'Open sign-up, sign-up with your approval, or invitation only.',
          claim: 'ORG-3.2',
        },
        {
          title: 'Student reports',
          body: 'Enrolments, progress and students at risk of falling behind.',
          claim: 'ANL-2',
        },
        {
          title: 'Email your students',
          body: 'Send announcements by email. Each plan includes a monthly email allowance per academy.',
          claim: 'MSG-9',
        },
        {
          title: 'Two devices, one screen',
          body: 'Each student account works on up to two devices and one screen at a time. Students remove an old device themselves from their Devices page.',
          claim: 'MED-6.1, MED-6.3',
        },
      ],
    },

    languages: {
      anchor: 'languages',
      eyebrow: 'Arabic and English',
      title: 'Does {brand} work in Arabic and English?',
      lead: 'Every {brand} academy website has pages in Arabic and English, and the Arabic pages are laid out right to left with Arabic type. The {brand} dashboard, where you run your courses, students and payments, also works in both languages, in a light or dark theme.',
      items: [
        {
          title: 'Two languages on your site',
          body: 'Each page has an Arabic and an English version, so students read in the language they prefer.',
          claim: 'WEB-1.3.3, WEB-6.7',
        },
        {
          title: 'A dashboard in your language',
          body: 'Run your academy in Arabic or English, light or dark.',
        },
      ],
    },

    howItWorks: {
      anchor: 'how-it-works',
      eyebrow: 'How it works',
      title: 'How does {brand} work?',
      lead: 'Getting started on {brand} takes four steps: create your account and start the {trialDays}-day trial, set up your academy, add courses from your YouTube lessons, and send students the link. You can do these steps on your own, or ask the {brand} team to set the academy up with you.',
      steps: [
        {
          title: 'Create your account',
          body: 'Pick a plan and start your {trialDays}-day trial. No card needed.',
        },
        {
          title: 'Set up your academy',
          body: 'Choose its name, design and logo, and add the payment methods you accept.',
        },
        {
          title: 'Add your courses',
          body: 'Build courses from the YouTube lessons you already have, with quizzes and homework.',
          claim: 'LRN-3.2',
        },
        {
          title: 'Send students the link',
          body: 'Share your academy’s address. Students sign up, pay you and wait for your approval.',
        },
      ],
    },

    fit: {
      eyebrow: 'Is it for you?',
      title: 'Is {brand} a good fit for you?',
      lead: '{brand} suits teachers in Egypt who already sell lessons to their own students and collect payments by wallet, InstaPay or bank transfer. {brand} is not the right choice yet for anyone who needs a mobile app, card or Fawry checkout, live classes, or WhatsApp messages to parents.',
      goodTitle: 'A good fit if you',
      good: [
        'sell lessons to your own students',
        'collect payments by wallet, InstaPay or bank transfer',
        'keep your lesson videos on YouTube',
        'want an academy with your own name on it',
      ],
      notYetTitle: 'Not the right fit yet if you need',
      notYet: [
        'a mobile app for your students',
        'card or Fawry checkout',
        'live classes',
        'WhatsApp or SMS messages to parents',
      ],
      link: { label: 'Read the pricing questions', href: '/pricing#faq' },
    },

    pricingTeaser: {
      eyebrow: 'Pricing',
      title: 'How much does {brand} cost?',
      lead: '{brand} plans are monthly or yearly subscriptions priced in Egyptian pounds. Plans differ in how many students, academies and instructors you can have, and each self-serve plan starts with a {trialDays}-day trial with no card. {brand} takes no commission on the payments your students make to you.',
      link: { label: 'Compare plans', href: '/pricing' },
    },

    faq: {
      anchor: 'faq',
      eyebrow: 'Questions',
      title: 'Questions teachers ask about {brand}',
      lead: 'Short, direct answers to what teachers ask before moving paid students to {brand}: what {brand} is, whether there is an app, how screen recording and YouTube links work, how students pay, what happens on a third device, how sales are recorded, and how the trial works.',
      items: [
        {
          question: 'What is {brand}?',
          answer:
            '{brand} is a branded academy platform for Egyptian teachers who sell their lessons online. Each teacher gets an academy website under their own name, courses built from YouTube lessons, and student payments by wallet, InstaPay or bank transfer that the teacher approves, with no commission taken by {brand}.',
        },
        {
          question: 'Is there a mobile app?',
          answer:
            'Not yet. Your academy runs in the phone’s browser, and students manage their own devices from a Devices page. If your students need an app today, {brand} isn’t the right fit yet.',
        },
        {
          question: 'Can students record the screen?',
          answer:
            'No website can fully stop screen recording. Lessons are YouTube videos played inside your academy, and a determined student can still copy the YouTube link itself. What {brand} controls is the account: each student account works on two devices, one screen at a time.',
          claim: 'MED-6.1',
        },
        {
          question: 'My videos are already on YouTube. Can I use them?',
          answer:
            'Yes. Paste the YouTube link into a lesson and the video plays inside your academy. Unlisted videos work well for this. The link itself can still be copied, so treat it as something students could share.',
          claim: 'LRN-3.2',
        },
        {
          question: 'How do students pay, and can my assistant approve payments?',
          answer:
            'Students pay you by wallet, InstaPay or bank transfer and upload the proof in your academy. You approve it and they’re enrolled. Only the account owner can approve payments, so assistants can’t approve them today.',
          claim: 'COM-2.0, COM-3.1',
        },
        {
          question: 'What happens if a student tries a third device?',
          answer:
            'They see a message asking them to remove one of their two devices first, and they can do that from their Devices page. Your team can’t reset a student’s devices for them yet.',
          claim: 'MED-6.2, MED-6.3',
        },
        {
          question: 'Can I see how much I’ve sold?',
          answer:
            'Every order and payment is in your orders and payments lists, with its status and proof. Revenue charts don’t include manual payments yet.',
          claim: 'COM-3.0, COM-4.1',
        },
        {
          question: 'Is my academy’s data kept apart from other academies?',
          answer:
            'Yes. Each academy’s students and courses are separated in the database itself, and we have checked this in production. A student account in one academy does not appear in another.',
          claim: 'ORG-5.2, ORG-3.1',
        },
        {
          question: 'How long is the trial, and what happens after it?',
          answer:
            'Each self-serve plan has a {trialDays}-day trial with that plan’s full limits, and you don’t need a card. To keep going, pay for your plan by InstaPay, wallet or bank transfer and upload the proof. Your plan starts once we approve it.',
          claim: 'BIL-5',
        },
      ],
    },

    assisted: {
      title: 'Prefer to set it up with someone?',
      lead: 'If you would rather not set up your {brand} academy alone, tell us about your subject, your students and how they pay you today. The {brand} team will get back to you by email and work through the setup with you, from the design to your first course.',
      cta: { label: 'Set it up with us', href: SALES },
    },

    closing: {
      title:
        'Put your next group of paid students in an academy with your name on it.',
      microcopy: '{trialDays}-day trial. No card needed.',
      primaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Open my courses', href: inAcademy('courses') },
      },
      secondaryCta: { label: 'Set it up with us', href: SALES },
    },
  },

  // ─── Features hub ─────────────────────────────────────────────────────────
  features: {
    hero: {
      eyebrow: 'Product',
      title: 'What you can run on {brand} today',
      lead: '{brand} gives an Egyptian teacher an academy website under their own name, student payments by wallet, InstaPay or bank transfer that the owner approves, courses with quizzes, homework and certificates, and roles for assistants. Each part below says what {brand} does today and where it stops.',
      primaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Open my dashboard', href: DASHBOARD },
      },
      secondaryCta: { label: 'See pricing', href: '/pricing' },
    },
    groups: [
      {
        id: 'payments',
        anchor: 'payments',
        learnMore: { label: 'How to set up payment methods', href: 'help:/selling/payment-methods' },
        title: 'How do students pay?',
        lead: 'Students pay you directly by Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, InstaPay or bank transfer, using the details you add for each academy. They upload the proof in your academy, you approve it once, and they are enrolled and emailed. {brand} takes no commission on these payments.',
        points: [
          'Choose which methods each academy accepts',
          'Students upload a receipt photo and reference at checkout',
          'Approve once to enrol; reject with a reason and the student can pay again',
          'Every order and payment in one list, with proof and status',
        ],
        note: 'Approval is manual and done by the account owner. There is no card or Fawry checkout today.',
        claim: 'COM-2, COM-1.5, COM-3.0, COM-3.1, COM-3.2',
      },
      {
        id: 'website',
        anchor: 'website',
        learnMore: { label: 'How the website builder works', href: 'help:/website/overview' },
        title: 'What will my academy website look like?',
        lead: 'Every {brand} academy gets a public website on its own {brand} subdomain the moment you create it, and you can connect a domain you own. Pick one of four designs, upload your logo to set the colours, and build pages from ready-made sections in Arabic and English.',
        points: [
          'Four designs to choose from',
          'A colour palette built from your logo, with readability checks',
          'Edit pages on the page itself, from ready-made sections; preview on phone and desktop, publish when ready',
          'Arabic and English versions of every page',
        ],
        claim: 'ACD-6.2, ACD-6.3, WEB-2.1, ACD-5, WEB-1.4, WEB-6.7',
      },
      {
        id: 'lessons',
        anchor: 'lessons',
        learnMore: { label: 'How to add a YouTube lesson', href: 'help:/courses/youtube-lesson' },
        title: 'Where do my lessons live?',
        lead: 'Lessons on {brand} are YouTube videos played inside your academy. You paste the link of a video you already have, unlisted works well, and arrange lessons into courses. Students watch inside your academy after you approve their payment, and each student account works on two devices, one screen at a time.',
        points: [
          'Use the YouTube lessons you already have',
          'Arrange lessons into courses with a curriculum editor',
          'Each student account works on two devices, one screen at a time',
        ],
        note: 'Lessons are YouTube videos played inside your academy. A determined student can still copy the YouTube link itself.',
        claim: 'LRN-1, LRN-2, LRN-3.2, MED-6.1',
      },
      {
        id: 'assessments',
        anchor: 'assessments',
        learnMore: { label: 'How to create a quiz', href: 'help:/courses/create-quiz' },
        title: 'How do quizzes, homework and certificates work?',
        lead: '{brand} quizzes support five question types and manual grading where an answer needs a person. Homework has due dates, a late policy and written feedback. When a student completes a course they receive a certificate, and anyone can confirm it on a public verification page.',
        points: [
          'Five question types',
          'Due dates, late policy and feedback on homework',
          'Certificates with a public verification page',
        ],
        claim: 'LRN-7.1, LRN-7.4, LRN-9, LRN-11, LRN-11.5',
      },
      {
        id: 'team',
        anchor: 'team',
        learnMore: { label: 'How to add a manager or instructor', href: 'help:/team/add-staff' },
        title: 'Can my assistants work in it with me?',
        lead: 'Yes. On {brand}, you invite assistants by email as managers or instructors. Instructors see and grade only the courses you assign to them. Managers help you run the academy. Approving payments stays with you, the account owner. One account can also run more than one academy, as your plan allows.',
        points: [
          'Three roles: owner, manager and instructor',
          'Instructors limited to their own courses',
          'More than one academy in one account, each with its own name and students',
        ],
        claim: 'ORG-2.2, ORG-2.3, LRN-10, ACD-8, ORG-4.2',
      },
      {
        id: 'students',
        anchor: 'students',
        learnMore: { label: 'How to choose who can join', href: 'help:/team/registration-policy' },
        title: 'How do I keep track of my students?',
        lead: 'Students sign up on your {brand} academy website, and you choose whether sign-up is open, needs your approval or is by invitation only. Reports show enrolments, progress and students at risk of falling behind. You can send email announcements to your students from the academy.',
        points: [
          'Open, approval-based or invitation-only sign-up',
          'Reports on enrolments, progress and at-risk students',
          'Email announcements, with a monthly allowance per academy',
        ],
        claim: 'ORG-3.2, ANL-2, MSG-9',
      },
    ],
    productPages: {
      title: 'Each part in detail',
      lead: 'A page for each part of the product: what it does today, how it works and where it stops.',
    },
    closing: {
      title: 'Try it with your own courses and students',
      microcopy: '{trialDays}-day trial. No card needed.',
      primaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Open my courses', href: inAcademy('courses') },
      },
      secondaryCta: { label: 'Set it up with us', href: SALES },
    },
  },

  // ─── Product pages (M1b) ──────────────────────────────────────────────────
  product: PRODUCT_EN,

  // ─── Pricing ──────────────────────────────────────────────────────────────
  pricing: {
    hero: {
      eyebrow: 'Pricing',
      title: 'Choose by your number of students',
      lead: 'Every {brand} plan is a monthly or yearly subscription in Egyptian pounds. Plans differ in how many students, academies and instructors you can have. Each self-serve plan starts with a {trialDays}-day trial, and you don’t need a card. {brand} takes no commission on your students’ payments.',
    },
    billingToggle: {
      label: 'Billing period',
      monthly: 'Monthly',
      yearly: 'Yearly',
      yearlyNote: 'Pay for {paidMonthsCount}, use all 12',
      yearlySaving: 'Save {saving} a year',
    },
    card: {
      perMonth: '{price} / month',
      perYear: '{yearlyPrice} / year',
      yearlyEquivalent: 'About {monthlyEquivalent} a month, paid yearly',
      recommendedBadge: 'Recommended',
      trialLine: '{trialDays}-day trial, no card needed',
      noTrialLine: 'No trial on this plan',
      ctaTrial: 'Start my trial on {planName}',
      ctaTalk: 'Talk to us about {planName}',
      limitsHeading: 'Includes',
      priceUnavailable: 'Contact us for the current price',
    },
    plans: {
      starter: {
        audience: 'For a teacher bringing paid students online, up to {students}.',
        recommended: false,
      },
      growth: {
        audience: 'For teachers with assistants, up to {students}.',
        recommended: true,
      },
      enterprise: {
        audience:
          'For a team running several academy brands, up to {academies} and {students}.',
        recommended: false,
      },
    },
    larger: {
      title: 'Need more than {topPlanName}?',
      body: 'If you have more than {maxStudents} or {maxAcademies}, or you need special terms, tell us what you need and we’ll put together a plan with you.',
      points: [
        'Limits set to your size',
        'Onboarding planned with your team',
        'Billing agreed in writing',
      ],
      cta: { label: 'Talk to us', href: SALES },
    },
    includedInEvery: {
      title: 'In every plan',
      items: [
        'An academy website on its own {brand} subdomain, with four designs and pages in Arabic and English',
        'Courses with your YouTube lessons, quizzes, homework and certificates',
        'Payments by wallet, InstaPay or bank transfer that you approve, with no commission from {brand}',
        'Manager and instructor roles for your team',
        'Student reports and email announcements',
      ],
    },
    limitsTable: {
      title: 'Compare plan limits',
      caption: 'Limits for each plan, from our current price list',
      scrollHint: 'Scroll sideways to see every plan',
      limitColumn: 'Limit',
      rows: [
        { key: 'students', label: 'Students' },
        { key: 'academies', label: 'Academies' },
        { key: 'instructors', label: 'Instructors' },
        { key: 'courses', label: 'Courses' },
        {
          key: 'generalStorage',
          label: 'File storage',
          hint: 'Images, documents and attachments',
        },
        {
          key: 'monthlyEmails',
          label: 'Emails to students',
          hint: 'Per academy, each month',
        },
      ],
      unlimited: 'Unlimited',
      storageValue: '{count} GB',
      emailsValue: '{count} a month',
      notSet: '–',
    },
    withheldLimitLabels: {
      staff: 'Staff accounts',
      videoStorage: 'Video storage',
      videoMinutes: 'Video minutes',
      recordedSessions: 'Recorded sessions',
      liveSessionsAddOn: 'Live sessions add-on',
    },
    trial: {
      anchor: 'trial',
      title: 'How does the trial work?',
      lead: 'Every self-serve {brand} plan starts with a {trialDays}-day trial that gives you the full limits of the plan you pick. You don’t need a card, there is one trial per customer, and cancelling during the trial ends it straight away. To keep going after the trial, you pay for the plan.',
      items: [
        '{trialDays} days with the full limits of the plan you pick.',
        'No card. One trial per customer.',
        'Cancel during the trial and it ends straight away.',
        'We email you 3 days and 1 day before your trial ends, so you have time to pay.',
      ],
      giftedYearly:
        'When you buy a yearly plan for the first time, we add {giftedDuration} to it.',
      giftedMonthly: 'Your first monthly purchase comes with {giftedDuration} added.',
    },
    payingAtlas: {
      title: 'How do I pay for {brand}?',
      lead: 'You pay for your {brand} plan by InstaPay, mobile wallet or bank transfer, then upload the proof in your dashboard. A person on the {brand} team checks the proof and activates your plan, so activation is not automatic. All {brand} prices are in Egyptian pounds.',
      items: [
        'Pay by InstaPay, mobile wallet or bank transfer, then upload the proof in your dashboard.',
        'We check the proof by hand and then activate your plan, so activation is not automatic.',
        'Prices are in Egyptian pounds.',
      ],
    },
    changes: {
      title: 'What happens at a limit, or when I change plans?',
      lead: 'Nothing is deleted when you reach a {brand} plan limit. New students can’t join and new courses can’t be added until you upgrade. You can upgrade at any time, move to a smaller plan near the end of a period, or cancel and keep a paid plan until its period ends.',
      items: [
        {
          title: 'At your limit',
          body: 'We let you know when you’re getting close. At the limit nothing is deleted, but new students can’t join and new courses can’t be added until you upgrade.',
        },
        {
          title: 'Upgrading',
          body: 'Upgrade any time. Your new limits start when your payment is approved, and the new plan’s period starts when your current one ends. During a yearly plan, upgrades go through support.',
        },
        {
          title: 'Moving to a smaller plan',
          body: 'Buy the smaller plan in the last seven days of your current period. Your data stays, but you can’t add more than the smaller plan allows.',
        },
        {
          title: 'Cancelling',
          body: 'A trial ends as soon as you cancel. A paid plan runs to the end of the period you paid for.',
        },
        {
          title: 'Refunds',
          body: 'Refunds follow our Terms of Service.',
        },
      ],
      termsLink: { label: 'Read the Terms of Service', href: '/terms' },
    },
    honestLimits: {
      anchor: 'limits',
      title: 'What’s included and what isn’t',
      lead: '{brand} today covers your academy website, courses with YouTube lessons, quizzes and certificates, student payments you approve, and team roles. {brand} does not yet offer a mobile app, card or Fawry checkout, live classes, video file uploads, payments that approve themselves, or WhatsApp and SMS messages. The full list is below.',
      includedTitle: 'Available today',
      included: [
        'Your academy website, subdomain and connection to your own domain',
        'Courses with YouTube lessons, quizzes, homework and certificates',
        'Wallet, InstaPay and bank-transfer payments that you approve',
        'Owner, manager and instructor roles',
        'Student reports and email announcements',
      ],
      notYetTitle: 'Not available yet',
      notYet: [
        'A mobile app. Your academy runs in the phone’s browser.',
        'Card or Fawry checkout. Students pay by wallet, InstaPay or bank transfer.',
        'Live classes.',
        'Uploading video files to {brand}. Lessons are YouTube videos played inside your academy, and a determined student can still copy the YouTube link itself.',
        'Payments that approve themselves. You review each proof yourself.',
        'WhatsApp or SMS messages to students or parents.',
      ],
    },
    faq: {
      anchor: 'faq',
      eyebrow: 'Pricing questions',
      title: 'Questions about {brand} plans and billing',
      lead: 'Direct answers about {brand} plans and billing: whether every plan is a subscription, how you pay and how long activation takes, commission on your course sales, what happens at a limit, changing plans, your own domain, lesson sharing, the mobile app, and plans for larger academies.',
      items: [
        {
          question: 'Is there a plan without a subscription?',
          answer:
            'No. Every plan is a monthly or yearly subscription. You can try any self-serve plan for {trialDays} days first, and you don’t need a card to start.',
        },
        {
          question: 'How do I pay for my plan?',
          answer:
            'By InstaPay, mobile wallet or bank transfer. Upload the proof in your dashboard, and we activate your plan after we check it.',
        },
        {
          question: 'How long does activation take?',
          answer:
            'A person on our team checks each proof, so activation is not instant. Paying a few days before your trial ends gives us time to review it without a gap.',
        },
        {
          question: 'Does {brand} take a commission on my course sales?',
          answer:
            'No. Students pay you directly by wallet, InstaPay or bank transfer, into your own accounts. {brand} charges only your plan subscription.',
          claim: 'COM-2',
        },
        {
          question: 'What happens when I reach a limit?',
          answer:
            'We let you know when you’re close. Nothing is deleted at the limit, but new students can’t join and new courses can’t be added until you move to a bigger plan.',
        },
        {
          question: 'Can I change plans or cancel?',
          answer:
            'Upgrade any time: new limits start when your payment is approved. To move to a smaller plan, buy it in the last seven days of your current period. If you cancel, a paid plan runs to the end of the period you paid for.',
        },
        {
          question: 'Can I use my own domain?',
          answer:
            'Yes. Your academy starts on its own {brand} subdomain, and you can connect a domain you already own from the academy’s settings.',
          claim: 'ACD-6.2, ACD-6.3',
        },
        {
          question: 'Can students share or copy my lessons?',
          answer:
            'Lessons are YouTube videos played inside your academy, so a determined student can still copy the YouTube link itself, and no website can fully stop screen recording. Each student account works on two devices and one screen at a time, which limits account sharing.',
          claim: 'LRN-3.2, MED-6.1',
        },
        {
          question: 'Is there a mobile app?',
          answer:
            'Not yet. Your academy works in the phone’s browser for you and your students.',
        },
        {
          question: 'What if I need more than the biggest plan?',
          answer:
            'Tell us what you need. For more students or academies than {topPlanName} allows, or for special terms, we put together a plan with you. Use the contact page and choose “Plans and pricing”.',
        },
      ],
    },
    pricesUpdated: 'Prices last updated {date}',
    currencyNote: 'All prices are in Egyptian pounds (EGP).',
    closing: {
      title: 'Not sure which plan fits?',
      lead: 'Tell us how many students and academies you have, and the {brand} team will help you choose.',
      primaryCta: { label: 'Talk to us', href: SALES },
      secondaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Manage my plan', href: SUBSCRIPTION },
      },
    },
  },

  // ─── Security ─────────────────────────────────────────────────────────────
  security: {
    hero: {
      eyebrow: 'Security and privacy',
      title: 'How we keep each academy’s data apart',
      lead: 'This page explains in plain words how {brand} keeps each academy’s data apart, who on your team can see what, how sign-ins and stored data are protected, and what {brand} does not offer yet. If something you need is not covered here, ask us before you move your students.',
    },
    sections: [
      {
        anchor: 'separation',
        learnMore: { label: 'How each academy’s data is kept separate', href: 'help:/security/data-isolation' },
        title: 'How is each academy’s data kept apart?',
        lead: '{brand} keeps every academy’s students, courses and payments separate in the database itself, and we have checked this separation in production. A student uses one {brand} account for every academy they join, but each academy sees only its own students and what they do there, and never which other academies a student belongs to.',
        items: [
          {
            title: 'Separated in the database',
            body: 'Every request is limited to the academy it belongs to, at the database level.',
            claim: 'ORG-5.2',
          },
          {
            title: 'Each academy sees only its own students',
            body: 'Your academy sees only the students who joined it, and other academies can’t see your students or their activity.',
            claim: 'ORG-3.1',
          },
        ],
      },
      {
        anchor: 'roles',
        learnMore: { label: 'What each role can do', href: 'help:/roles' },
        title: 'Who can see my academy’s data?',
        lead: 'On {brand}, the account owner decides who joins the team and in which role. The owner sees the whole account and is the only role that approves payments. Managers help run the academy, instructors see only their assigned courses, and {brand} platform administrators can see academy details to run the service.',
        items: [
          {
            title: 'Owner',
            body: 'Sees the whole account and is the only role that can approve payments.',
            claim: 'COM-2.0',
          },
          {
            title: 'Manager',
            body: 'Helps run the academy and can see the contact details students give, including their phone number.',
            claim: 'ORG-2.2',
          },
          {
            title: 'Instructor',
            body: 'Sees only the courses assigned to them and the students in those courses.',
            claim: 'LRN-10',
          },
          {
            title: 'People at {brand}',
            body: 'Our platform administrators can see academy and student details, including phone numbers, to run the service.',
            claim: 'B0-CPY-01',
          },
        ],
      },
      {
        anchor: 'sign-in',
        learnMore: { label: 'How to protect your account', href: 'help:/security/account-protection' },
        title: 'How are sign-ins protected?',
        lead: '{brand} emails a confirmation code when someone signs in from a new device, and anyone on your team can turn on two-factor authentication with an authenticator app. Your dashboard and academy website are served over encrypted HTTPS connections, and {brand} manages the certificates for its subdomains.',
        items: [
          {
            title: 'A code on new devices',
            body: 'When someone signs in from a device we haven’t seen before, we email them a code to confirm it’s them.',
            claim: 'IAM-4.1',
          },
          {
            title: 'Two-factor authentication',
            body: 'Anyone on your team can turn on two-factor authentication with an authenticator app, from their own profile.',
          },
          {
            title: 'Encrypted connections',
            body: 'Your dashboard and your academy website are served over HTTPS only, and we manage the certificates for {brand} subdomains.',
          },
        ],
      },
      {
        anchor: 'stored-data',
        learnMore: { label: 'What data {brand} keeps about learners', href: 'help:/security/learner-data' },
        title: 'How is data stored and backed up?',
        lead: '{brand} encrypts sensitive payment settings when it stores them, and backs up the database every day. Lesson videos stay on YouTube and play inside your academy, so a determined student can still copy the YouTube link itself.',
        items: [
          {
            title: 'Encrypted payment settings',
            body: 'Sensitive payment settings are encrypted when we store them.',
          },
          {
            title: 'Daily backups',
            body: 'We back up the database every day and keep each backup for 14 days.',
            claim: 'OPS-08',
          },
          {
            title: 'Lesson videos',
            body: 'Lessons are YouTube videos played inside your academy. A determined student can still copy the YouTube link itself.',
            claim: 'LRN-3.2',
          },
        ],
      },
    ],
    notYet: {
      anchor: 'not-yet',
      title: 'What doesn’t {brand} offer yet?',
      lead: '{brand} does not yet let you require two-factor authentication for your whole team, sign people out automatically after inactivity, or export your academy’s data yourself. Students can’t delete or download their own data instantly: they send a request from Your data in their profile and our team handles it, and {brand} holds no security certifications. We would rather you hear this from us first.',
      items: [
        'A setting that requires two-factor authentication for everyone on your team.',
        'Automatic sign-out after a period of inactivity.',
        'Self-service export of your academy’s data.',
        'Instant, self-service deletion or download of a student’s own data (today it is a request our team handles).',
        'Security certifications or third-party audit reports.',
      ],
    },
    requests: {
      anchor: 'privacy-requests',
      title: 'How do I make a privacy request?',
      body: 'If you or one of your students wants a copy of personal data, a correction or a deletion, send us a request from the contact page and we’ll handle it by hand. Students can also send the request themselves from Your data in their profile. Our privacy policy explains what we collect and why.',
      cta: { label: 'Send a privacy request', href: '/contact?topic=support' },
      privacyLink: { label: 'Read the privacy policy', href: '/privacy-policy' },
    },
    closing: {
      title: 'Have a security question?',
      lead: 'Ask the {brand} team before you move your students. We’ll reply by email.',
      primaryCta: { label: 'Ask us a security question', href: SALES },
      secondaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Review my team’s access', href: inAcademy('team') },
      },
    },
  },

  // ─── About ────────────────────────────────────────────────────────────────
  about: {
    hero: {
      eyebrow: 'About',
      title: 'Why we build {brand}',
      lead: '{brand} is a branded academy platform for Egyptian teachers who sell their lessons online.',
    },
    story: {
      title: 'Why {brand} exists',
      paragraphs: [
        '{brand} is a branded academy platform for Egyptian teachers who sell their lessons online. Many teachers in Egypt already run a real business online. Students pay by Vodafone Cash or InstaPay, lessons sit on YouTube, and a WhatsApp group holds it together. What’s missing is a place that belongs to the teacher.',
        '{brand} gives that business a home: a website with the teacher’s name on it, courses students pay for in the ways they already use, and a team that can help without seeing everything.',
        'We build it step by step and say plainly what works today. When a feature isn’t ready, you won’t find it described on this site.',
      ],
    },
    audience: {
      title: 'Who is {brand} for?',
      lead: '{brand} is built for teachers in Egypt who already sell lessons online, usually secondary and preparatory teachers with paid students and assistants. {brand} also suits teams running several academy brands from one account, and private tutors who want a bilingual academy site and certificates students can show.',
      items: [
        {
          title: 'Teachers who already sell online',
          body: 'Secondary and preparatory teachers with paid students, often working with assistants.',
        },
        {
          title: 'Teams with more than one brand',
          body: 'Teachers and companies that run several academies from one account.',
        },
        {
          title: 'Tutors who want a professional site',
          body: 'Private tutors, including international-curriculum tutors, who want a bilingual site and certificates students can show.',
        },
      ],
    },
    principles: {
      title: 'How does {brand} work with teachers?',
      lead: '{brand} follows four rules in how it describes and sells the product: every feature is shown with its limits, students pay teachers directly with no commission to {brand}, plans and prices are published in Egyptian pounds, and no testimonials, logos or numbers appear until real academies agree.',
      items: [
        {
          title: 'Say where it stops',
          body: 'Every feature we describe comes with its limits, in the same place.',
        },
        {
          title: 'Your students, your money',
          body: 'Students pay you directly. We take no commission on those payments.',
        },
        {
          title: 'Prices in the open',
          body: 'Our plans and prices are on the pricing page, in Egyptian pounds.',
        },
        {
          title: 'Real proof only',
          body: 'We won’t show testimonials, logos or numbers until real academies agree to share them.',
        },
      ],
    },
    reach: {
      title: 'Talk to a person',
      body: 'Questions about {brand}, your plan or moving your academy? Send us a message and we’ll reply by email.',
      cta: { label: 'Contact us', href: '/contact' },
    },
    closing: {
      title: 'See how your academy would look',
      microcopy: '{trialDays}-day trial. No card needed.',
      primaryCta: {
        label: 'Start my academy trial',
        href: REGISTER,
        signedIn: { label: 'Edit my academy website', href: inAcademy('website') },
      },
      secondaryCta: { label: 'See pricing', href: '/pricing' },
    },
  },

  // ─── Contact ──────────────────────────────────────────────────────────────
  contact: {
    hero: {
      eyebrow: 'Contact',
      title: 'Talk to the {brand} team',
      lead: 'Contact the {brand} team to ask about plans and prices, get help setting up your academy, sort out a problem with your account or discuss a partnership. Tell us a little about your academy, your students and how they pay you today, and we’ll reply by email.',
    },
    points: {
      privacy: 'We use your details only to reply to you.',
      privacyWithConsent:
        'We use your details to reply to you, and for anything more only if you tick a box below.',
    },
    aside: {
      title: 'You might also need',
      links: [
        { label: 'Plans and prices', href: '/pricing' },
        { label: 'Security and privacy', href: '/security' },
        { label: 'Sign in to your account', href: '/auth/sign-in' },
      ],
    },
    form: {
      label: 'Contact the {brand} team',
      name: 'Your name',
      email: 'Email',
      emailHint: 'We’ll reply to this address.',
      organization: 'Academy or organization (optional)',
      topic: 'Topic',
      topicPlaceholder: 'Choose a topic',
      message: 'Message',
      messageHint:
        'For example: what you teach, roughly how many students you have, and how they pay you today.',
      messageCount: '{count} / {max}',
      whatsapp: 'WhatsApp number (optional)',
      whatsappHint: 'Only if you’d like us to reply on WhatsApp.',
      consentLegend: 'Your choices',
      submit: 'Send message',
      submitting: 'Sending…',
      requiredNote: 'All fields are required unless marked optional.',
      noScript:
        'This form needs JavaScript to send. Turn it on and reload the page.',
    },
    topics: {
      sales: 'Plans and pricing',
      support: 'Help with my account',
      partnership: 'Partnership',
      other: 'Something else',
      founding: 'Founding Academies',
    },
    foundingHint:
      'Applying as a Founding Academy? Tell us your academy’s name, roughly how many students you teach and when you would like to start. We start 5 academies a week, in the order applications arrive.',
    consent: {
      contact: 'You may contact me about this enquiry by email, phone or WhatsApp.',
      marketing: 'Send me news and offers about {brand}. I can unsubscribe at any time.',
    },
    errors: {
      nameRequired: 'Enter your name.',
      nameTooShort: 'Use at least {nameMin} characters.',
      nameTooLong: 'Use {nameMax} characters or fewer.',
      emailRequired: 'Enter your email address.',
      emailInvalid: 'Enter a valid email address, like name@example.com.',
      emailTooLong: 'Use {emailMax} characters or fewer.',
      organizationTooLong: 'Use {organizationMax} characters or fewer.',
      topicRequired: 'Choose a topic.',
      messageRequired: 'Enter a message.',
      messageTooShort: 'Tell us a little more, at least {messageMin} characters.',
      messageTooLong: 'Use {messageMax} characters or fewer.',
      whatsappInvalid: 'Enter the number with its country code, like +20 10 1234 5678.',
      summary: 'Check the highlighted fields and try again.',
    },
    success: {
      title: 'Message sent',
      body: 'Thank you. We’ve received your message and will reply by email.',
      again: 'Send another message',
    },
    failure: {
      title: 'Your message was not sent',
      body: 'Something went wrong on our side or with the connection. Your text is still here, so please try again.',
      rateLimited:
        'You’ve sent several messages in a short time. Please wait a few minutes, then try again.',
    },
  },

  // ─── Founding Academies (B2, noindex, shared by link only) ────────────────
  founding: {
    hero: {
      eyebrow: 'Founding Academies',
      title: 'Be one of the first 20 academies on {brand}',
      lead: 'The first 20 academies that join {brand} on a yearly plan pay the standard annual price and keep that price for 24 months, renewal included. We set up your academy with you, and we start 5 academies a week so each one gets proper attention.',
    },
    offer: {
      title: 'What a founding academy gets',
      lead: 'Four terms, written plainly. The price is the standard one; what you get is the lock, the setup and our attention.',
      items: [
        {
          title: 'The standard annual price',
          body: 'You pay the yearly price listed for your plan today, in Egyptian pounds.',
        },
        {
          title: 'Locked for 24 months',
          body: 'Your yearly price stays the same for 24 months from the day your plan starts, renewal included. If our catalog prices go up in that time, yours does not.',
        },
        {
          title: 'Setup done with you, included',
          body: 'Up to 6 hours of setup with our team is part of the plan: your academy website, your first courses and your payment methods, done together step by step.',
        },
        {
          title: 'Five academies a week',
          body: 'Setup is done by people on our team, so we start 5 founding academies a week, in the order applications arrive. There are 20 seats in total.',
        },
      ],
    },
    prices: {
      eyebrow: 'Prices',
      title: 'The annual prices',
      lead: 'These are the standard yearly prices of the {brand} plans, from the current catalog. A founding academy keeps the price of its plan for 24 months.',
      perYear: '{yearlyPrice} / year',
      lockNote: 'Prices are in Egyptian pounds. The price of your plan on the day it starts is the price you keep for 24 months.',
      unavailable: 'Contact us for the current annual prices.',
    },
    fit: {
      title: 'Who it is for',
      fitTitle: 'A good fit if you',
      fit: [
        'Teach paid students and want an academy under your own name',
        'Are ready to pay for a full year',
        'Can give a few hours in your first weeks to setting up with us',
        'Want to tell us what works for you and what does not',
      ],
      notYetTitle: 'Not the right fit if you',
      notYet: [
        'Want to try {brand} before deciding: a regular trial suits you better',
        'Prefer to pay month by month: the founding price is for yearly plans only',
        'Need what we do not offer yet, such as a mobile app or live sessions',
      ],
    },
    steps: {
      title: 'What happens after you apply',
      items: [
        {
          title: 'You apply',
          body: 'Send the form on the contact page. Tell us about your academy and your students.',
        },
        {
          title: 'We talk',
          body: 'Someone from our team replies to agree your start week and the plan that fits your size.',
        },
        {
          title: 'You pay the annual price',
          body: 'Pay by InstaPay, mobile wallet or bank transfer and upload the proof. Your plan and its 24-month price lock start when we approve the payment.',
        },
        {
          title: 'We set up together',
          body: 'In your start week we set up your academy with you: website, courses and payment methods.',
        },
      ],
    },
    faq: {
      anchor: 'faq',
      eyebrow: 'Questions',
      title: 'Questions about Founding Academies',
      items: [
        {
          question: 'Is the founding price a discount?',
          answer:
            'No. You pay the standard annual price of your plan. What you get is that price locked for 24 months, setup with our team included, and a place among the first 20 academies.',
        },
        {
          question: 'What happens after 24 months?',
          answer:
            'Your plan renews at the catalog price of that time. If it is different from yours, we email you before the renewal.',
        },
        {
          question: 'Can I change plans during the 24 months?',
          answer:
            'Yes. Talk to us and we move you to the plan that fits. The lock then covers the annual price of the new plan as it is on the day you change.',
        },
        {
          question: 'Can I pay monthly?',
          answer: 'No. The founding price is for yearly plans only.',
        },
        {
          question: 'What if I cancel?',
          answer:
            'Your plan runs to the end of the year you paid for. If you leave the programme, the price lock ends at your next renewal.',
        },
        {
          question: 'Why only 5 academies a week?',
          answer:
            'Because setup is done by people on our team. Five a week is what we can do well. If this week is full, we give you the next start week.',
        },
        {
          question: 'How many seats are left?',
          answer:
            'There are 20 seats in total. Ask us through the form and we tell you where things stand.',
        },
      ],
    },
    closing: {
      title: 'Apply to be a founding academy',
      lead: 'Tell us about your academy. We reply by email, or on WhatsApp if you prefer, and agree your start week with you.',
      primaryCta: { label: 'Apply through the contact form', href: FOUNDING },
      whatsapp: 'Message us on WhatsApp',
      whatsappMessage: 'Hello, I would like to apply for the {brand} Founding Academies programme.',
    },
  },

  // ─── 404 ──────────────────────────────────────────────────────────────────
  notFound: {
    eyebrow: 'Error 404',
    title: 'Page not found',
    body: 'This page does not exist. Go to the home page, see pricing or contact us.',
    links: [
      { label: 'Home page', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Contact us', href: '/contact' },
    ],
  },

  // ─── llms.txt ─────────────────────────────────────────────────────────────
  llms: {
    heading: '{brand}',
    summary:
      '{brand} is a branded academy platform for Egyptian teachers who sell their lessons online. Each teacher runs an academy under their own name, where students pay the teacher directly and the teacher approves each payment.',
    details:
      '{brand} is built for teachers in Egypt. Each academy gets a public website on its own {brand} subdomain, with the option to connect a domain the owner already has, four designs and pages in Arabic and English; the dashboard also works in Arabic and English. Teachers build courses from YouTube lessons played inside the academy, with quizzes (five question types), homework with due dates and feedback, and certificates anyone can verify on a public page. Lessons are YouTube videos, so a determined student can still copy the YouTube link itself. Students pay the academy directly by Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, InstaPay or bank transfer and upload proof of payment; the account owner approves it and the student is enrolled and emailed. {brand} takes no commission on these payments. Each student account works on two devices, one screen at a time. Owners can add managers and instructors, and instructors see only their own courses. One account can run more than one academy, depending on the plan. Plans are priced in Egyptian pounds, monthly or yearly, and each self-serve plan starts with a {trialDays}-day trial without a card. Not available yet: a mobile app, card or Fawry checkout, live classes, video file uploads, payments that approve themselves, and WhatsApp or SMS messaging.',
    pagesTitle: 'Pages',
    pageNotes: {
      home: 'What {brand} is, how student payments work, and who it suits.',
      features: 'What an academy on {brand} can do today, with its limits.',
      'academy-website': 'The academy website: visual editor, 32 section types, templates, page history, languages and domains.',
      'payments': 'How students pay by wallet, InstaPay or bank transfer, and how the owner approves.',
      'content-protection': 'How lessons play, device limits, the student code on videos, and the limits.',
      'teams-and-academies': 'Owner, manager and instructor roles, and running more than one academy.',
      'quizzes-and-certificates': 'Quiz question types, homework, and certificates anyone can verify.',
      pricing: 'Plans by number of students and academies, trial terms and limits.',
      security: 'How academy data is kept apart, sign-in protection and privacy requests.',
      about: 'Why {brand} exists and who it is for.',
      contact: 'Contact form for plans, setup help, support and partnerships.',
    },
    pricingFileNote:
      'Plans, prices in EGP, billing periods, limits and trial terms, generated from the live catalog.',
    crawlerPolicy:
      'Search and answer crawlers may read this site. AI training crawlers are disallowed in robots.txt.',
  },

  // ─── JSON-LD ──────────────────────────────────────────────────────────────
  jsonLd: {
    organizationDescription:
      '{brand} is a branded academy platform for Egyptian teachers who sell their lessons online.',
    softwareApplicationName: '{brand}',
    softwareApplicationDescription:
      'A web platform for running an online academy under your own name: an academy website on its own subdomain or your domain, courses with YouTube lessons, quizzes, homework and certificates, and student payments by wallet, InstaPay or bank transfer that the owner approves, with no commission.',
    websiteDescription:
      'Your own branded academy platform for Egyptian teachers who sell their lessons online.',
  },
};
