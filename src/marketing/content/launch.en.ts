/**
 * B3 copy, English: the resources hub (`/resources`), the multi-academy
 * solution page (`/solutions/multi-academy`) and the server-rendered blog.
 *
 * Every product statement is checked against shipped behaviour: the help
 * center's "Create another academy" (DOC-ACD-007) and "Your organization"
 * (DOC-ORG-012) articles, and the catalog's `academies` limit (read at
 * build time, never typed here). The founding programme is link-only and is
 * not linked from here.
 */
import type { MarketingContent } from './content.types';

const REGISTER = '/auth/register';
const DASHBOARD = '/dashboard';
const SALES = '/contact?topic=sales';

const trialCta = {
  label: 'Start my academy trial',
  href: REGISTER,
  signedIn: { label: 'Open my dashboard', href: DASHBOARD },
};

export const RESOURCES_EN: MarketingContent['resources'] = {
  hero: {
    eyebrow: 'Resources',
    title: 'Articles, guides and a demo academy for academy owners',
    lead: 'Read the {brand} blog, find step-by-step answers in the help center, and open the demo academy to see what your students would see.',
  },
  blog: {
    title: 'Latest from the blog',
    lead: 'Articles on protecting your lessons, collecting payments, exam season and running your academy website.',
    allPosts: 'All blog posts',
    fallback: 'New articles are published on the blog in English and Arabic.',
    readingTime: '{minutes} min read',
  },
  help: {
    title: 'Help center',
    lead: 'Step-by-step guides for owners, managers, instructors and learners, in English and Arabic.',
    cta: 'Open the help center',
  },
  demo: {
    title: 'Look around a demo academy',
    lead: 'Al-Nour is a demo academy on {brand}. Its website and course pages are what your students would see on yours.',
    cta: 'Open the demo academy',
    note: 'Demo content: the academy, its courses and its teachers are not real.',
  },
  guides: {
    title: 'Understand {brand} before you start',
    items: [
      {
        title: 'Product overview',
        body: 'What an academy on {brand} can do today, with its limits.',
        href: '/features',
      },
      {
        title: 'Pricing and plans',
        body: 'Plans by number of students and academies, and how the trial works.',
        href: '/pricing',
      },
      {
        title: 'Running several academies',
        body: 'One account and one subscription for more than one academy.',
        href: '/solutions/multi-academy',
      },
      {
        title: 'Security and privacy',
        body: 'How academy data is kept apart and how sign-in is protected.',
        href: '/security',
      },
    ],
  },
  closing: {
    title: 'Ready to open your academy?',
    microcopy: '{trialDays}-day trial. No card needed.',
    primaryCta: trialCta,
    secondaryCta: { label: 'Set it up with us', href: SALES },
  },
};

export const MULTI_ACADEMY_EN: MarketingContent['multiAcademy'] = {
  name: 'Several academies',
  hero: {
    eyebrow: 'Several academies, one account',
    title: 'Run more than one academy from one account and one subscription',
    lead: 'Teaching another subject, a second brand or a branch with a partner? On {brand}, the account owner opens another academy in the same organization. Each academy has its own website, courses, team and students, and all of them share one subscription. How many academies you can open depends on your plan.',
    primaryCta: trialCta,
    secondaryCta: { label: 'Talk to us about your academies', href: SALES },
  },
  separate: {
    title: 'What does each academy have of its own?',
    lead: 'Each academy is a complete academy: its own name and web address, its own website and design, its own courses, and its own students and payments. Students of one academy do not see the others.',
    items: [
      {
        title: 'Website and branding',
        body: 'Its own name, {brand} address, theme, logo and pages, in Arabic and English.',
      },
      {
        title: 'Courses and certificates',
        body: 'Its own courses, quizzes, homework and certificates.',
      },
      {
        title: 'Team',
        body: 'Managers and instructors are added to each academy separately.',
      },
      {
        title: 'Students and payments',
        body: 'Its own students, payment methods and course orders.',
      },
    ],
  },
  shared: {
    title: 'What is shared?',
    lead: 'All academies in one organization share the organization’s subscription and its plan limits. You sign in once and switch between academies from the top bar of the dashboard.',
    items: [
      {
        title: 'One owner account',
        body: 'Only the organization owner creates academies, manages billing and adds or removes staff.',
      },
      {
        title: 'One subscription',
        body: 'One plan and one payment for all the academies in the organization.',
      },
      {
        title: 'One dashboard',
        body: 'Switch between academies from the top bar; what you see follows the academy you chose.',
      },
    ],
  },
  plans: {
    title: 'How many academies can I open?',
    lead: 'The number of academies is part of each plan. These numbers come from the current price list.',
    planColumn: 'Plan',
    academiesColumn: 'Academies',
    caption: 'Academies included in each plan',
    note: 'Need more academies than the largest plan? Talk to us.',
    unavailable: 'See the current plans on the pricing page.',
  },
  steps: {
    title: 'How do I add another academy?',
    items: [
      {
        title: 'Open “Create an academy”',
        body: 'In the dashboard sidebar, choose Create an academy, then New Academy.',
      },
      {
        title: 'Name it and pick its address',
        body: 'Type the academy name; {brand} suggests an address you can change.',
      },
      {
        title: 'Choose how to start',
        body: 'Pick a theme and start from a ready-made website or a blank page.',
      },
      {
        title: 'Set up payments',
        body: 'Turn on bank transfer, InstaPay or a mobile wallet now, or later.',
      },
    ],
    learnMore: {
      label: 'How to create another academy',
      href: 'help:/academy/another-academy',
    },
  },
  limits: {
    title: 'Where it stops',
    items: [
      'Only the organization owner can create academies.',
      'Each academy needs its own name and address; names are unique on {brand}.',
      'Staff are added to each academy separately.',
      'When the plan’s academy limit is reached, you move to a plan with more academies or delete one you no longer need.',
      'A separate business with its own billing needs its own organization, with its own subscription.',
    ],
  },
  faq: {
    title: 'Questions about several academies',
    items: [
      {
        question: 'Do I pay for each academy separately?',
        answer:
          'No. All academies in one organization share its subscription. The plan sets how many academies you can have.',
      },
      {
        question: 'Can students of one academy see another academy?',
        answer:
          'No. Each academy has its own students, courses and website. A student joins the academy they signed up with.',
      },
      {
        question: 'Can a manager or instructor create an academy?',
        answer:
          'No. Only the organization owner creates academies. Managers and instructors work inside the academies they were added to.',
      },
      {
        question: 'What if I need a separate business with its own billing?',
        answer:
          'Create a second organization. It has its own subscription and plan, and you switch between organizations from the top bar.',
      },
    ],
  },
  closing: {
    title: 'Start with one academy and add more as you grow',
    microcopy: '{trialDays}-day trial. No card needed.',
    primaryCta: trialCta,
    secondaryCta: { label: 'Set it up with us', href: SALES },
  },
};

export const BLOG_EN: MarketingContent['blog'] = {
  name: 'Blog',
  hero: {
    eyebrow: 'The {brand} blog',
    title: 'Articles for teachers who run an academy online',
    lead: 'Practical writing on protecting your lessons, collecting payments, exams and running your academy website.',
  },
  seo: {
    title: 'Blog: Running an Online Academy in Egypt | {brand}',
    description:
      'Articles for teachers in Egypt who sell lessons online: protecting recorded lessons, student payments, exams and your academy website.',
    topicTitle: '{topic}: Articles for Academy Owners | {brand}',
    topicDescription: '{description}',
    pageSuffix: ' (page {page})',
    ogImageAlt: 'The {brand} blog',
  },
  topics: {
    protection: {
      label: 'Content protection',
      description:
        'How to keep paid lessons with the students who paid for them.',
    },
    payments: {
      label: 'Payments',
      description:
        'Collecting student payments by wallet, InstaPay and bank transfer, and approving them.',
    },
    exams: {
      label: 'Exams and quizzes',
      description: 'Quizzes, homework and certificates for your students.',
    },
    website: {
      label: 'Academy website',
      description: 'Building and publishing your academy’s website.',
    },
    season: {
      label: 'Teaching season',
      description:
        'Preparing your academy for the school year and exam season.',
    },
    teaching: {
      label: 'Teaching online',
      description: 'Running courses and students online, day to day.',
    },
    news: { label: '{brand} news', description: 'What is new on {brand}.' },
  },
  topicsLabel: 'Topics',
  allTopics: 'All topics',
  featured: 'Featured',
  readingTime: '{minutes} min read',
  publishedOn: 'Published {date}',
  readPost: 'Read the article',
  pagination: {
    label: 'Blog pages',
    newer: 'Newer posts',
    older: 'Older posts',
    status: 'Page {page} of {pages}',
  },
  empty: {
    title: 'No articles here yet',
    body: 'New articles are on their way. In the meantime, the help center has step-by-step guides.',
  },
  post: {
    relatedTitle: 'Read next',
    backToBlog: 'All articles',
    tocLabel: 'On this page',
    alternate: 'هذا المقال متاح بالعربية',
  },
  closing: {
    title: 'Try it with your own courses and students',
    microcopy: '{trialDays}-day trial. No card needed.',
    primaryCta: trialCta,
    secondaryCta: { label: 'Set it up with us', href: SALES },
  },
  unavailable: {
    title: 'The blog is temporarily unavailable',
    body: 'We could not load the articles just now. Please try again in a few minutes.',
    retry: 'Try again',
    home: 'Go to the home page',
  },
};
