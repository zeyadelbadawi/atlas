/**
 * Atlas Terms of Service — English.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It invents no commercial terms.
 * Atlas has not defined a refund policy, a service-level guarantee,
 * uptime credits, a notice period, a price-change policy, or a governing
 * jurisdiction, so this document does not state one. Where a term is
 * genuinely undecided, the text says what is true today and leaves the
 * commitment open rather than inventing a promise the business would then
 * be bound by. Those open points are listed in the implementation report
 * as decisions requiring the business and a lawyer.
 *
 * Everything that IS stated was checked against the running product:
 * one free trial per customer, trial and subscription cancellation
 * behaviour, account and academy deletion, role model, and the
 * anti-abuse rules.
 *
 * This is an implementation draft and requires qualified legal review.
 */
import type { LegalDocument } from './legal-content.types';

export const TERMS_EN: LegalDocument = {
  title: 'Terms of Service',
  summary: 'The terms on which you may use the Atlas platform.',
  effectiveDate: '11 September 2026',
  lastUpdated: '11 September 2026',
  sections: [
    {
      id: 'acceptance',
      heading: '1. Acceptance of these terms',
      blocks: [
        {
          kind: 'paragraph',
          text: 'By creating an Atlas account or using the Atlas platform, you agree to these terms. If you are agreeing on behalf of an organization, you confirm you are authorised to bind it, and "you" means that organization.',
        },
        {
          kind: 'paragraph',
          text: 'If you do not agree to these terms, do not use Atlas.',
        },
      ],
    },
    {
      id: 'the-service',
      heading: '2. What Atlas provides',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas is a platform for running online academies: creating and publishing courses, enrolling and managing students, assigning instructors, publishing a public academy website, and managing a subscription. Features available to you depend on your plan.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: '3. Your account',
      blocks: [
        {
          kind: 'list',
          items: [
            'You must provide accurate registration information, including a working email address that you control.',
            'Atlas requires a permanent, deliverable email address. Disposable or temporary addresses are not accepted.',
            'You are responsible for keeping your password confidential and for activity that occurs under your account.',
            'You must be old enough to enter into a contract under the law that applies to you. Where an academy teaches minors, that academy is responsible for any consent its own law requires.',
            'We may suspend or terminate an account that breaches these terms, is used unlawfully, or threatens the security of the platform or other customers.',
          ],
        },
      ],
    },
    {
      id: 'organizations-academies',
      heading: '4. Organizations, academies, and roles',
      blocks: [
        {
          kind: 'paragraph',
          text: 'An Atlas account can create an organization, and an organization can contain academies, subject to the limits of its plan. The user who creates an organization is its owner.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Owner',
              detail:
                'Controls the organization, its billing and subscription, and may create and delete academies.',
            },
            {
              term: 'Manager',
              detail:
                'Operates an academy day to day. Managers do not control billing or the subscription.',
            },
            {
              term: 'Instructor',
              detail: 'Teaches and assesses on the courses assigned to them.',
            },
            {
              term: 'Student',
              detail: 'Enrols in and studies courses within an academy.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Each role can only do what its permissions allow, and those permissions are enforced by Atlas rather than by the interface alone.',
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: '5. Acceptable use',
      blocks: [
        { kind: 'paragraph', text: 'You agree not to:' },
        {
          kind: 'list',
          items: [
            'Use Atlas for anything unlawful, or to publish content you do not have the right to publish.',
            "Upload malware, or attempt to gain unauthorised access to Atlas, to other customers' data, or to the underlying infrastructure.",
            'Probe, scan, or test the security of the platform without our written permission.',
            'Interfere with the operation of Atlas, including by circumventing rate limits or automating abusive volumes of requests.',
            'Attempt to obtain more than one free trial per customer, including by creating additional accounts, organizations, or email addresses for that purpose.',
            'Resell or provide access to Atlas in a way that disguises it as your own platform, unless we have agreed to it in writing.',
          ],
        },
      ],
    },
    {
      id: 'your-content',
      heading: '6. Your content',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You keep ownership of the courses, materials, branding, and other content you put into Atlas. You grant Atlas the limited licence needed to host, store, process, and display that content in order to operate the service for you — for example, serving your public academy website to its visitors.',
        },
        {
          kind: 'paragraph',
          text: 'You are responsible for your content, including that you have the rights to it and that it complies with the law where your students are.',
        },
      ],
    },
    {
      id: 'our-ip',
      heading: '7. Atlas intellectual property',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas — the platform, its software, design, and brand — remains ours. These terms grant you the right to use the service, not any ownership in it. You may not copy, reverse engineer, or create derivative works from the platform.',
        },
      ],
    },
    {
      id: 'trials',
      heading: '8. Free trials',
      blocks: [
        {
          kind: 'list',
          items: [
            'A free trial is available once per customer. It is started deliberately, from the Plans page — it does not begin automatically when you create an account or an academy.',
            'Eligibility is determined by Atlas and is based on the email address of the account starting the trial. Creating another account, organization, or academy does not create a new entitlement.',
            'Deleting an account or an academy does not restore trial eligibility, and neither does cancelling, changing, or letting a subscription lapse.',
            'No payment card is required to start a trial, and a trial does not convert into a paid subscription by itself.',
            'When a trial ends or is cancelled, access to paid features stops. Your data remains until you delete it or the account is closed.',
            'We may withdraw or refuse a trial where we reasonably believe it is being abused.',
          ],
        },
      ],
    },
    {
      id: 'subscriptions',
      heading: '9. Subscriptions and payment',
      blocks: [
        {
          kind: 'list',
          items: [
            'Paid plans are billed according to the billing cycle shown when you subscribe.',
            'Plan limits — such as the number of academies, students, or instructors — are enforced by Atlas.',
            'Payments are handled by the configured payment provider. Atlas does not store your card details.',
            'You are responsible for any taxes that apply to your purchase unless we state otherwise.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Prices and plan contents may change. Where a change affects an active subscription, we will give notice in the product before it applies to you.',
        },
      ],
    },
    {
      id: 'cancellation',
      heading: '10. Cancellation and deletion',
      blocks: [
        {
          kind: 'definitions',
          items: [
            {
              term: 'Cancelling a free trial',
              detail:
                'Ends the trial immediately. Because a trial is available once per customer, cancelling does not return it.',
            },
            {
              term: 'Cancelling a paid subscription',
              detail:
                'Stops the subscription renewing. You keep access until the end of the period you have already paid for — cancelling does not cut short time you have purchased.',
            },
            {
              term: 'Deleting an academy',
              detail:
                'Takes its public website offline and releases the academy allowance on your plan so you can create another within your limit. It cannot be undone.',
            },
            {
              term: 'Deleting your account',
              detail:
                'Ends your sessions immediately and prevents further sign-in. It cannot be undone.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Atlas does not currently operate a published refund policy. Where a refund is requested, it is considered case by case, and nothing in these terms should be read as a promise of one.',
        },
      ],
    },
    {
      id: 'availability',
      heading: '11. Availability and changes to the service',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We work to keep Atlas available and reliable, but we do not currently offer a contractual uptime commitment or service credits. The service may be unavailable during maintenance, or because of faults or events outside our control.',
        },
        {
          kind: 'paragraph',
          text: 'We may add, change, or remove features. Where a change removes something you rely on, we will give reasonable notice in the product where we can.',
        },
      ],
    },
    {
      id: 'third-parties',
      heading: '12. Third-party services',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas relies on third parties for hosting, content delivery, storage, email delivery, error monitoring, and payments. Their availability and their own terms can affect the service. Content you link to from your courses is outside our control.',
        },
      ],
    },
    {
      id: 'privacy',
      heading: '13. Privacy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Our Privacy Policy explains what personal data Atlas handles and why, and forms part of your agreement with us. Where an academy uses Atlas to process data about its own students, that academy decides the purpose of that processing and is responsible for it.',
        },
      ],
    },
    {
      id: 'disclaimers',
      heading: '14. Disclaimers',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas is provided as it is. To the extent the law allows, we do not give warranties that the service will be uninterrupted, error-free, or fit for a particular purpose, and we are not responsible for the accuracy or legality of content our customers publish.',
        },
      ],
    },
    {
      id: 'liability',
      heading: '15. Limitation of liability',
      blocks: [
        {
          kind: 'paragraph',
          text: 'To the extent the law allows, neither party is liable for indirect or consequential loss, loss of profit, or loss of data arising from the use of Atlas. Nothing in these terms limits liability that cannot lawfully be limited.',
        },
        {
          kind: 'paragraph',
          text: 'Any overall cap on liability will be as agreed in a written contract between us; where none exists, the position is as set by the law that applies.',
        },
      ],
    },
    {
      id: 'governing-law',
      heading: '16. Governing law',
      blocks: [
        {
          kind: 'paragraph',
          text: 'The law that governs these terms, and where disputes are heard, will be as set out in a written agreement between us. Where no such agreement exists, the position is determined by the law that applies to you, including any consumer protections you have that cannot be excluded by contract.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '17. Changes to these terms',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update these terms. When we do, we will update the "last updated" date above, and where the change is significant we will tell you in the product before it takes effect. Continuing to use Atlas after that means you accept the updated terms.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '18. Contact',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Questions about these terms can be raised through the support option in your Atlas dashboard.',
        },
      ],
    },
  ],
};
