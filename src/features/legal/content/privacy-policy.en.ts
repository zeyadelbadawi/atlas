/**
 * Atlas Privacy Policy — English.
 *
 * WRITTEN FROM THE ACTUAL SYSTEM, not from a template. Every category of
 * data named here corresponds to something Atlas genuinely stores, and
 * was checked against the schema and the running application:
 *
 *   - account fields          -> `users`
 *   - session/device records  -> `refresh_tokens` (IP, user agent, last used)
 *   - two-factor material     -> `user_two_factor`, `two_factor_recovery_codes`
 *   - email verification      -> `email_verification_tokens`
 *   - anti-abuse record       -> `trial_redemptions` (a hash, never an address)
 *   - audit trail             -> `audit_log_entries`
 *   - support                 -> `support_cases`, `support_case_messages`
 *   - payments                -> `payments` (no card data — see §5)
 *
 * THINGS DELIBERATELY NOT CLAIMED, because they are not true of Atlas:
 * no advertising, no analytics product, no marketing pixels, no
 * behavioural profiling, no sale of personal data, no automated
 * decision-making with legal effect. A privacy policy that lists
 * practices the product does not have is not a safer policy — it is an
 * inaccurate one.
 *
 * See `PRIVACY_LEGAL_SOURCES.md` for the sources consulted and the date
 * they were checked. This is an implementation draft and requires
 * qualified legal review.
 */
import type { LegalDocument } from './legal-content.types';

export const PRIVACY_POLICY_EN: LegalDocument = {
  title: 'Privacy Policy',
  summary:
    'How Atlas collects, uses, and protects personal data when you use the Atlas platform.',
  effectiveDate: '11 September 2026',
  lastUpdated: '11 September 2026',
  sections: [
    {
      id: 'who-we-are',
      heading: '1. Who we are',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas is a software-as-a-service platform that lets education providers run online academies — creating courses, enrolling students, managing instructors, publishing a public academy website, and handling subscriptions.',
        },
        {
          kind: 'paragraph',
          text: "This policy describes how Atlas, as the operator of the platform, handles personal data. It is written for the Atlas platform itself. Each academy that uses Atlas decides independently what it does with its own students' data; where an academy acts on its own account, that academy — not Atlas — determines the purpose of that processing, and its own privacy notice applies to it.",
        },
      ],
    },
    {
      id: 'scope',
      heading: '2. Scope of this policy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'This policy applies to the Atlas web application, the Atlas API, and the public academy websites Atlas hosts on behalf of its customers.',
        },
        {
          kind: 'paragraph',
          text: 'It does not apply to third-party websites you may reach from links in course content, or to what an individual academy does with data outside Atlas.',
        },
      ],
    },
    {
      id: 'what-we-collect',
      heading: '3. Personal data we collect',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We collect the following, and nothing here is optional-but-collected-anyway: each item exists because a specific part of the product needs it.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Account information',
              detail:
                'Your name, email address, and a securely hashed form of your password. Atlas never stores your password itself. Optionally, a profile picture and interface preferences such as language and theme.',
            },
            {
              term: 'Organization and academy information',
              detail:
                'The name and settings of the organization and academies you create or belong to, your role within them, and your permissions.',
            },
            {
              term: 'Role-specific information',
              detail:
                'Depending on your role: enrolments, course progress, quiz attempts, assignment submissions and grades (students); course authorship and teaching assignments (instructors); academy and organization management activity (managers and owners).',
            },
            {
              term: 'Authentication and security information',
              detail:
                'Records of your active sessions, including the IP address and browser user agent seen when a session was created or last used, and when it was last active. If you enable two-factor authentication, an encrypted authenticator secret and hashed single-use recovery codes.',
            },
            {
              term: 'Email verification',
              detail:
                'A short-lived, single-use token sent to your email address to confirm you can receive mail there, and the date verification succeeded.',
            },
            {
              term: 'Anti-abuse information',
              detail:
                'To enforce our one-free-trial-per-customer rule, we store a one-way cryptographic hash derived from the email address that used a trial. This hash cannot be reversed to recover the address. We also record the IP address and browser user agent present at that moment, which we retain only as evidence for investigating abuse and which are never used to decide whether you are eligible.',
            },
            {
              term: 'Support information',
              detail:
                'The content of support tickets you submit and the messages exchanged on them, together with your name and email so we can reply.',
            },
            {
              term: 'Payment and subscription information',
              detail:
                'Your plan, subscription status, billing cycle, invoices, and the record of payments made. See section 5 for what we specifically do not hold.',
            },
            {
              term: 'Audit and security logs',
              detail:
                'Records of significant actions taken in your organization — such as creating an academy, redeeming or cancelling a trial, and administrative changes — including who performed them and when.',
            },
            {
              term: 'Technical information',
              detail:
                'Server logs of requests made to Atlas, containing the request path, response status, timestamp, and a request identifier. Credentials, tokens, and passwords are removed from these logs before they are written.',
            },
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '4. Cookies and similar technologies',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas uses very little browser storage, and what it uses is mostly not cookies. We describe it accurately rather than using "cookies" as a catch-all.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Strictly necessary',
              detail:
                "Your authentication tokens and the identifiers of the organization and academy you are currently working in, held in your browser's local storage. Without these you cannot stay signed in. These cannot be switched off while you are using Atlas.",
            },
            {
              term: 'Preferences',
              detail:
                'Your language, colour theme, and whether the dashboard sidebar is collapsed. The sidebar state is stored in a cookie; the rest is stored in local storage. These make Atlas remember how you like it, and you can decline them.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Atlas does not use analytics cookies, advertising cookies, marketing pixels, or any third-party tracking script. There is no such technology in the product, so there is nothing of that kind for you to consent to.',
        },
        {
          kind: 'paragraph',
          text: 'You can review and change your choice at any time using the Cookie Preferences link in the footer.',
        },
      ],
    },
    {
      id: 'payments',
      heading: '5. Payment data',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas does not collect or store full payment card numbers, card security codes, or bank account credentials. Where a payment is taken, it is handled by the configured payment provider, and Atlas retains only the resulting record — amount, status, date, and a reference — needed to show your billing history and to keep your subscription accurate.',
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '6. How we use personal data',
      blocks: [
        {
          kind: 'list',
          items: [
            'To provide the platform: creating and running your account, organizations, academies, courses, and enrolments.',
            'To authenticate you and keep your account secure, including showing you your active sessions and letting you end them.',
            'To confirm your email address is real and reachable.',
            'To operate subscriptions and billing, including free trials.',
            'To prevent abuse — in particular, to stop the same customer repeatedly obtaining a free trial, and to refuse signups from disposable or undeliverable email addresses.',
            'To respond to your support requests.',
            'To keep an audit trail of significant actions, so account owners can see what happened in their organization and we can investigate security incidents.',
            'To diagnose faults and keep the service running.',
            'To comply with legal obligations.',
          ],
        },
      ],
    },
    {
      id: 'legal-bases',
      heading: '7. Legal bases for processing',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Where the law requires us to identify a basis for processing, we rely on the following:',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Performance of a contract',
              detail:
                'Most processing exists because it is necessary to deliver the service you or your organization signed up for.',
            },
            {
              term: 'Legitimate interests',
              detail:
                'Security, fraud and abuse prevention, and keeping the platform reliable — balanced against your rights, which is why our anti-abuse record stores a one-way hash rather than your email address.',
            },
            {
              term: 'Consent',
              detail:
                'Non-essential preference storage, which you may decline without losing access to Atlas.',
            },
            {
              term: 'Legal obligation',
              detail:
                'Retaining billing and certain security records where the law requires it.',
            },
          ],
        },
      ],
    },
    {
      id: 'sharing',
      heading: '8. Service providers and sharing',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas does not sell personal data, and does not share it for advertising. We use a small number of providers to run the service:',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'Hosting and infrastructure',
              detail:
                'The Atlas application and its database run on cloud infrastructure operated by our hosting provider.',
            },
            {
              term: 'Content delivery and network security',
              detail:
                'A content-delivery and DNS provider sits in front of Atlas to serve traffic and protect against network attacks.',
            },
            {
              term: 'Object storage',
              detail:
                'Uploaded media — such as course materials and images — is stored with a cloud object-storage provider.',
            },
            {
              term: 'Email delivery',
              detail:
                'Transactional email, such as verification and password-reset messages, is sent through an email delivery provider.',
            },
            {
              term: 'Error monitoring',
              detail:
                'Application errors are reported to an error-monitoring provider so we can fix faults. Credentials, tokens, cookies, and authorization headers are removed before an error report leaves Atlas.',
            },
            {
              term: 'Payment providers',
              detail:
                'Where payments are enabled, they are processed by the configured payment provider under its own terms.',
            },
          ],
        },
        {
          kind: 'paragraph',
          text: 'We may also disclose personal data where we are legally required to, or to establish or defend legal claims.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: '9. International transfers',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Some of the providers described above operate outside the country where you are located, which means your personal data may be transferred across borders. Where the law that applies to you restricts such transfers — including under Egyptian and Saudi data protection law — we take the steps that law requires before transferring, such as relying on your consent, an adequacy assessment, or appropriate contractual safeguards.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '10. How long we keep data',
      blocks: [
        {
          kind: 'definitions',
          items: [
            {
              term: 'Account and content',
              detail:
                'Kept while your account exists. If you delete your account, we delete or irreversibly disassociate your personal data, except where a record must be retained (below).',
            },
            {
              term: 'Sessions',
              detail:
                'Session records expire automatically and can be revoked by you at any time from your profile.',
            },
            {
              term: 'Email verification tokens',
              detail: 'Short-lived and single-use; they expire automatically.',
            },
            {
              term: 'Anti-abuse records',
              detail:
                'The one-way hash recording that a free trial was used is retained even after an account or organization is deleted. This is deliberate: without it, deleting an account would reset the free-trial limit and the rule would be unenforceable. It contains no readable personal data.',
            },
            {
              term: 'Billing, audit and security records',
              detail:
                'Retained as long as needed for accounting, legal, and security purposes.',
            },
          ],
        },
      ],
    },
    {
      id: 'deletion',
      heading: '11. Deleting your account or academy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You can delete your own Atlas account from your profile settings. Deleting your account signs you out everywhere, ends your active sessions immediately, and prevents further sign-in.',
        },
        {
          kind: 'paragraph',
          text: 'If you own an organization, you can also delete an academy you created. Deleting an academy takes its public website offline and frees the academy allowance on your plan.',
        },
        {
          kind: 'paragraph',
          text: 'Some records survive deletion, as described in section 10 — principally billing and audit records we are required to keep, and the non-reversible anti-abuse hash. Deletion is not reversible, and we cannot restore a deleted account or academy.',
        },
      ],
    },
    {
      id: 'security',
      heading: '12. Security',
      blocks: [
        {
          kind: 'list',
          items: [
            'Passwords are stored using a modern password-hashing algorithm and are never recoverable.',
            "Data is separated per tenant at the database level, so one organization cannot read another's data.",
            'All traffic to Atlas is encrypted in transit.',
            'Two-factor authentication is available, with authenticator secrets encrypted at rest and single-use recovery codes stored only as hashes.',
            'You can see and revoke your active sessions; revoking one takes effect immediately.',
            'Credentials, tokens, and authorization headers are removed from logs and error reports.',
            'Rate limiting protects sign-in, registration, and password reset against automated attack.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'No system can be guaranteed completely secure, and we do not claim otherwise. If we become aware of a breach affecting your personal data, we will act in line with the notification obligations that apply to us.',
        },
      ],
    },
    {
      id: 'your-rights',
      heading: '13. Your rights',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Depending on the law that applies to you, you may have the right to access the personal data we hold about you, to have it corrected, to have it deleted, to object to or restrict certain processing, to withdraw consent where we rely on it, and to receive your data in a portable form.',
        },
        {
          kind: 'paragraph',
          text: 'Some of these you can exercise directly in the product: you can view and correct your profile, view and revoke your sessions, change your cookie preferences, and delete your account. For anything else, contact us using the details below. We will respond within the time the applicable law allows.',
        },
        {
          kind: 'paragraph',
          text: 'If you believe we have not handled your personal data properly, you may complain to the data protection authority in your country — in Egypt, the Personal Data Protection Centre; in Saudi Arabia, the Saudi Data and AI Authority (SDAIA).',
        },
      ],
    },
    {
      id: 'children',
      heading: '14. Children',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas is provided to education providers, and an academy may teach students who are minors under the law that applies to them. Where that is the case, the academy is responsible for obtaining any consent its own law requires from a parent or guardian. Atlas does not knowingly create accounts directly for children without an academy acting in that role.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '15. Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update this policy as Atlas changes. When we do, we will update the "last updated" date above, and where the change is significant we will tell you in the product before it takes effect.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '16. Contact us',
      blocks: [
        {
          kind: 'paragraph',
          text: 'For any privacy question, or to make a request about your personal data, contact us through the support option in your Atlas dashboard. If you do not have an account, you can reach us using the contact details published on the Atlas website.',
        },
      ],
    },
  ],
};
