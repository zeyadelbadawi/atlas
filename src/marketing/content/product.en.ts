/**
 * M1b product pages, English (`/features/<id>`). Every statement describes
 * shipped behaviour, checked against the help center and the code (the
 * `claim` field names the source; it is never rendered). Wording follows
 * B1-SPEC §A.10–A.12 and the launch-kit never-say list: no hard-coded trial
 * length, no plan-specific domain promise, manual payments only, no
 * integrity or trace wording, and the honest limits next to the claims.
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
const pricingCta = { label: 'See pricing', href: '/pricing' };

export const PRODUCT_EN: MarketingContent['product'] = {
  'academy-website': {
    name: 'Academy website',
    hero: {
      eyebrow: 'Academy website',
      title: 'An academy website under your name, edited on the page itself',
      lead: 'Every {brand} academy gets a public website on its own {brand} subdomain the moment you create it, and you can connect a domain you own. You build its pages in a visual editor from 32 section types or a page template, in Arabic and English, and publish when you are ready.',
      primaryCta: trialCta,
      secondaryCta: pricingCta,
    },
    sections: [
      {
        id: 'editor',
        title: 'How do I build my pages?',
        lead: 'In the visual editor you edit a page on the page itself. You type text in place, add and move sections, check phone and tablet sizes, undo a change and publish, all in one screen.',
        points: [
          'Type text straight on the page',
          'A library of 32 section types, from a hero to featured courses',
          'Check phone, tablet and desktop sizes before you publish',
          'Undo and redo while you work',
        ],
        learnMore: { label: 'How the visual editor works', href: 'help:/website/visual-editor' },
        claim: 'help website/visual-editor, website/sections (32 section types)',
      },
      {
        id: 'designs',
        title: 'What will my website look like?',
        lead: 'Pick one of four designs and upload your logo. {brand} builds a colour palette from it and checks that text stays readable. Start a section from a ready-made look, or a whole new page from one of four templates, with content in English and Arabic that you then make your own.',
        points: [
          'Four designs, and you can switch your draft to another one later',
          'Colours from your logo, with readability checks',
          'Ready-made section looks and four page templates',
        ],
        learnMore: {
          label: 'How section looks and page templates work',
          href: 'help:/website/section-looks-and-templates',
        },
        claim: 'WEB-2.1, ACD-5; help website/themes, website/section-looks-and-templates',
      },
      {
        id: 'safety',
        title: 'What stops a mistake from reaching visitors?',
        lead: 'Your changes stay in a draft until you publish. When you publish a page, a check points out missing image descriptions, buttons with no link and placeholder text. {brand} keeps the 30 most recent versions of each page, so you can preview an earlier one and restore it to your draft. You can also lock the header, menu and footer so managers keep editing pages without changing them.',
        points: [
          'Draft first, publish when you are ready',
          'A page check before you publish',
          'Page history: preview and restore an earlier version',
          'Lock the header, menu and footer',
        ],
        learnMore: { label: 'How page history works', href: 'help:/website/page-history' },
        claim: 'WEB-1.4; help website/publish-check, website/page-history, website/lock-header-footer',
      },
      {
        id: 'languages-and-domain',
        title: 'Which languages, and which address?',
        lead: 'Each page has an Arabic and an English version, and Arabic pages read right to left. Your academy starts on its own {brand} subdomain, and you can connect a domain you already own. Images you upload are turned into smaller versions automatically, so your pages load faster on phones.',
        points: [
          'Arabic and English versions of every page',
          'Your own {brand} subdomain as soon as the academy exists',
          'Connect a domain you already own',
          'Smaller versions of your images, made for you',
        ],
        learnMore: { label: 'How to connect your own domain', href: 'help:/academy/custom-domain' },
        claim: 'ACD-6.2, ACD-6.3 (generic wording), WEB-6.7; help website/overview (image versions)',
      },
    ],
    limits: {
      title: 'Where it stops',
      items: [
        'You connect a domain you already own, at the company that manages it. {brand} does not sell domains.',
        'The page check points out common problems. It does not review your wording.',
        'Page history keeps the 30 most recent versions of each page; older ones are removed.',
      ],
    },
    related: ['teams-and-academies', 'payments'],
    relatedTitle: 'Read next',
  },

  payments: {
    name: 'Payments',
    hero: {
      eyebrow: 'Payments',
      title: 'Students pay you by wallet, InstaPay or bank transfer. You approve once.',
      lead: 'On {brand}, students pay you directly with the methods you add: Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, InstaPay or bank transfer. They upload the proof inside your academy, you check it and approve it once, and they are enrolled and emailed. {brand} takes no commission on these payments.',
      primaryCta: trialCta,
      secondaryCta: { label: 'Talk to us', href: SALES },
    },
    sections: [
      {
        id: 'methods',
        title: 'Which payment methods can students use?',
        lead: 'You choose which methods each academy accepts and add your own details for each one. Students see those details at checkout and pay you directly, so the money goes straight to you.',
        points: [
          'Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, InstaPay and bank transfer',
          'Different methods for each academy',
          'No commission to {brand} on these payments; you pay only for your plan',
        ],
        learnMore: { label: 'How to set up payment methods', href: 'help:/selling/payment-methods' },
        claim: 'COM-2, COM-2.1–2.3, DL-48',
      },
      {
        id: 'proof',
        title: 'What does the student do after paying?',
        lead: 'The student uploads a photo of the receipt with its reference at checkout. The order then waits in your academy, marked as under review, until you decide.',
        points: ['A receipt photo and reference with every payment', 'The order waits for your review'],
        claim: 'COM-1.5',
      },
      {
        id: 'review',
        title: 'How do I approve a payment?',
        lead: 'You open the proof, check that the amount arrived and approve it once. The student is enrolled and gets an email. If something is wrong, you reject it with a reason and the student can pay again. Every order and payment sits in one list, with its proof and status.',
        points: [
          'Approve once to enrol the student',
          'Reject with a reason, and the student can pay again',
          'Every order and payment in one list',
        ],
        learnMore: { label: 'How to review a payment', href: 'help:/selling/review-payments' },
        claim: 'COM-3.0, COM-3.1, COM-3.2, COM-10',
      },
    ],
    limits: {
      title: 'Where it stops',
      items: [
        'Approval is manual and done by the account owner. There is no card or Fawry checkout today.',
        'Managers and instructors cannot approve payments; that stays with the account owner.',
        'You check that the money reached your own wallet or account. {brand} does not see your transfers.',
      ],
    },
    related: ['content-protection', 'academy-website'],
    relatedTitle: 'Read next',
  },

  'content-protection': {
    name: 'Lessons and devices',
    hero: {
      eyebrow: 'Lessons and devices',
      title: 'Lessons that play inside your academy, for the students you enrolled',
      lead: 'Lessons on {brand} are YouTube videos played inside your academy. Each time a lesson opens, {brand} checks that the student is enrolled. Each student account works on a limited number of devices, one screen at a time, and a visible label with the student’s personal code moves over every lesson video to deter sharing.',
      primaryCta: trialCta,
      secondaryCta: { label: 'Read how we handle security', href: '/security' },
    },
    sections: [
      {
        id: 'lessons',
        title: 'Where do my lessons live?',
        lead: 'You paste the link of a YouTube video you already have, unlisted works well, and arrange lessons into courses with the curriculum editor. Students watch inside your academy after you approve their payment.',
        points: [
          'Use the YouTube lessons you already have',
          'Arrange lessons into courses with a curriculum editor',
          'Every time a lesson opens, {brand} checks the student’s enrolment',
        ],
        learnMore: { label: 'How to add a YouTube lesson', href: 'help:/courses/youtube-lesson' },
        claim: 'LRN-1, LRN-2, LRN-3.2; help protection/overview (access check)',
      },
      {
        id: 'devices',
        title: 'Can one account be shared between students?',
        lead: 'Sharing is made inconvenient. You set how many devices each student can use at your academy, and a device too many is refused until the student removes an old one from their Devices page. Lessons play on one device at a time; opening a lesson on a second device asks to move playback there.',
        points: [
          'A device limit per student that you set',
          'One screen at a time',
          'The student frees a device from their own Devices page',
        ],
        learnMore: { label: 'How device limits work', href: 'help:/protection/device-limits' },
        claim: 'MED-6.1–6.4; help protection/device-limits',
      },
      {
        id: 'code',
        title: 'What do students see on the video?',
        lead: 'A visible label with the student’s personal code moves over every lesson video played in your academy, and stays there in full screen. The player has no download button. The label is visible on purpose: a student who records the screen records their own code too.',
        points: [
          'A personal code on every lesson video watched in your academy',
          'It stays on in full screen',
          'No download button in the player',
        ],
        note: 'Lessons are YouTube videos played inside your academy. A determined student can still copy the YouTube link itself. The code deters screen recording inside your academy.',
        claim: 'MED-5.1, MED-5.2, LRN-3.2; help protection/overview; YouTubeLessonPlayer (mandatory watermark)',
      },
    ],
    limits: {
      title: 'Where it stops',
      items: [
        'Nothing in {brand} can stop a student from recording the screen or filming it with a phone.',
        'An enrolled student can find a lesson’s YouTube link and watch it on YouTube, outside your academy.',
        'Device limits do not stop two people taking turns on the same devices.',
      ],
    },
    related: ['payments', 'quizzes-and-certificates'],
    relatedTitle: 'Read next',
  },

  'teams-and-academies': {
    name: 'Teams and academies',
    hero: {
      eyebrow: 'Teams and academies',
      title: 'Add your assistants, and run more than one academy from one account',
      lead: 'On {brand}, you invite assistants by email as managers or instructors. Each instructor sees and grades only the courses you assign to them. One account can also run more than one academy, each with its own name, website, payment methods and students, as your plan allows.',
      primaryCta: trialCta,
      secondaryCta: { label: 'Running several academy brands? Talk to us', href: SALES },
    },
    sections: [
      {
        id: 'roles',
        title: 'What can each person on my team do?',
        lead: 'There are three roles. You are the owner: you hold the account, pay for the plan and approve every payment. A manager helps you run the academy day to day. An instructor works only inside the courses you assign, grading the quizzes and homework there.',
        points: [
          'Owner, manager and instructor roles',
          'Invite assistants by email',
          'Instructors limited to their own courses and their grading',
          'Approving payments stays with the owner',
        ],
        learnMore: { label: 'How to add a manager or instructor', href: 'help:/team/add-staff' },
        claim: 'ORG-2.2, ORG-2.3, LRN-10, COM-2.0',
      },
      {
        id: 'academies',
        title: 'Can I open more than one academy?',
        lead: 'Yes. Starting a new subject or teaching with a partner, you open another academy from the same account. Each academy has its own name, website, payment methods and students, and you switch between them from the top bar. How many academies you can open depends on your plan.',
        points: [
          'Each academy with its own name, website and payment methods',
          'Students kept separate for each academy',
          'Switch between academies from the top bar',
        ],
        learnMore: { label: 'How organizations and academies fit together', href: 'help:/team/organization' },
        claim: 'ACD-8, ORG-4.2, ORG-3.1, COM-2',
      },
    ],
    limits: {
      title: 'Where it stops',
      items: [
        'Only the account owner approves student payments.',
        'The number of academies, students and instructors follows your plan.',
      ],
    },
    related: ['academy-website', 'quizzes-and-certificates'],
    relatedTitle: 'Read next',
  },

  'quizzes-and-certificates': {
    name: 'Quizzes and certificates',
    hero: {
      eyebrow: 'Quizzes and certificates',
      title: 'Quizzes, homework and certificates anyone can check online',
      lead: '{brand} quizzes support five question types, with manual grading where an answer needs a person. Homework has due dates, a late policy and written feedback. When a student completes a course they receive a certificate with a code, and anyone can check it on a public verification page.',
      primaryCta: trialCta,
      secondaryCta: pricingCta,
    },
    sections: [
      {
        id: 'quizzes',
        title: 'What kinds of questions can I ask?',
        lead: 'A quiz can mix five question types: single choice, multiple choice, true or false, short answer and essay. The first four are marked automatically; an essay waits for you or the course’s instructor to grade it.',
        points: [
          'Single choice, multiple choice, true or false, short answer and essay',
          'Automatic marking, and manual grading for essays',
          'Points per question and a time limit if you want one',
        ],
        learnMore: { label: 'How to create a quiz', href: 'help:/courses/create-quiz' },
        claim: 'LRN-7.1, LRN-7.4; help courses/create-quiz',
      },
      {
        id: 'assignments',
        title: 'How does homework work?',
        lead: 'You write the instructions and set a due date, a late policy and whether a student may resubmit. Students write an answer and can attach a PDF or an image. You grade each submission with a score and written feedback.',
        points: [
          'Due dates, late policy and resubmission',
          'Answers with a PDF or image attached',
          'A score and written feedback for each submission',
        ],
        learnMore: { label: 'How assignments work', href: 'help:/courses/assignments' },
        claim: 'LRN-9; help courses/assignments',
      },
      {
        id: 'certificates',
        title: 'How can someone check a certificate?',
        lead: 'Every certificate your academy issues has a verification code and link. Anyone who opens the link sees whether it is valid, who it was issued to, the course, the academy and the dates, or that it was revoked.',
        points: [
          'A verification code and link on every certificate',
          'A public page shows valid or revoked',
          'No sign-in needed to check',
        ],
        learnMore: { label: 'How certificate verification works', href: 'help:/courses/certificate-verification' },
        claim: 'LRN-11, LRN-11.5; help courses/certificate-verification',
      },
    ],
    limits: {
      title: 'Where it stops',
      items: [
        'Essay answers are graded by a person; {brand} does not mark them for you.',
        'A certificate shows what your academy issued. {brand} does not accredit courses.',
      ],
    },
    related: ['content-protection', 'teams-and-academies'],
    relatedTitle: 'Read next',
  },
};
