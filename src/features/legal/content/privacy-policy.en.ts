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
 *   - trial eligibility       -> `trial_redemptions` (HMAC v2 / legacy v1 hash of
 *                                the owner's canonical email, never the address;
 *                                IP/UA cleared after 180 d by `trial-forensics-scrub`)
 *   - gifted-days eligibility -> `paid_gift_redemptions` (append-only, same hash)
 *   - emailed codes           -> `auth_email_challenges`,
 *                                `account_deletion_challenges` (24 h), outbox
 *                                `code` stripped on settle (W3)
 *   - security events         -> `security_events` (HMAC email + monthly-key
 *                                HMAC IP, platform owner only, 90 d)
 *   - email records           -> `communication_outbox` / `_deliveries` (90 d),
 *                                `communication_suppressions` (hash),
 *                                `notifications` (180 d / 365 d),
 *                                `communication_campaigns` (academy messages)
 *   - audit trail             -> `audit_log_entries`
 *   - support                 -> `support_cases`, `support_case_messages`
 *   - payments                -> `payments` (no card data — see §5)
 *   - page performance (RUM)  -> `atlas_rum_*` Prometheus histograms: page
 *                                template + phone/desktop only, aggregate,
 *                                15-day retention (Reports/REAL_USER_MONITORING.md)
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
  lastUpdated: '4 October 2026',
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
                'Records of your active sessions, including the IP address and browser user agent seen when a session was created or last used, and when it was last active. If you enable two-factor authentication, an encrypted authenticator secret and hashed single-use recovery codes. Short-lived records of the one-time codes we email you to confirm a sign-in or an account deletion, and security event records, are described in section 7.',
            },
            {
              term: 'Email verification',
              detail:
                'A short-lived, single-use token sent to your email address to confirm you can receive mail there, and the date verification succeeded.',
            },
            {
              term: 'Eligibility records',
              detail:
                'To apply our one-free-trial-per-customer rule and our once-per-customer gifted subscription days, we keep records that contain a keyed cryptographic hash of the organization owner’s email address, not the address itself. Section 6 explains what these records contain and how long we keep them.',
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
              term: 'Email records',
              detail:
                'Records of the emails Atlas sends — including messages an academy sends to its learners and staff — and whether each one was delivered. Section 7 explains these records.',
            },
            {
              term: 'Technical information',
              detail:
                'Server logs of requests made to Atlas, containing the request path, response status, timestamp, and a request identifier. Credentials, tokens, and passwords are removed from these logs before they are written.',
            },
            {
              term: 'Page performance measurements',
              detail:
                'For a sample of visits, three page-speed timings (how long the main content took to appear, how quickly the page responded to a tap or click, and how much the layout shifted), the type of page (for example “course page”, never its address), and whether the screen is phone-sized. Nothing that identifies you, your account, your academy, your device or the page address is sent or stored with them; they are kept only as aggregate counts and deleted after 15 days. Browsers that send Global Privacy Control or Do Not Track are never measured.',
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
          text: 'Atlas does not use analytics cookies, advertising cookies, marketing pixels, or any third-party tracking script. The page-speed measurement described in section 3 stores nothing in your browser and uses no identifier, so it is neither a cookie nor a tracking technology; it runs on Atlas’s own servers, is never used to profile anyone, and is skipped entirely for browsers that send Global Privacy Control or Do Not Track.',
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
      id: 'eligibility-records',
      heading: '6. Free trials and gifted subscription days',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas offers two benefits that each customer can receive only once: a free trial, and — on plans and billing cycles that include them — gifted setup days on the customer’s first-ever approved paid subscription. To apply these rules fairly, including after an account has been deleted, we keep two eligibility records.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'How we recognise the same customer',
              detail:
                'Both records are based on the email address of the organization’s owner. Before anything is stored, the address is normalised so that common variations of one mailbox count as the same customer: it is lower-cased, anything after a “+” in the part before the @ is ignored at major email providers (such as Gmail, Outlook, Hotmail, Yahoo, iCloud and Proton Mail), and dots in that part are ignored for Gmail addresses. The result is converted into a keyed cryptographic hash (HMAC) using a secret key held by Atlas. The email address itself is not stored in either record.',
            },
            {
              term: 'Free trial record',
              detail:
                'Created when a free trial starts. It contains the hash, when the trial started and when it was due to end, the organization and account that used it, and the IP address and browser user agent at that moment. The IP address and user agent are kept only as evidence for investigating abuse, are never used to decide eligibility, and are cleared automatically after 180 days. Trial records created with our earlier method — a salted hash without a secret key — are still checked, so a trial used before the change still counts. Cancelling a trial does not make the customer eligible again.',
            },
            {
              term: 'Gifted subscription days record',
              detail:
                'Created when gifted setup days are granted on a first paid subscription. Whether a subscription qualifies depends on the plan and billing cycle chosen. The record contains the hash, the organization and account, a payment reference, the plan, the billing cycle, the number of gifted days and their dates. It contains no IP address or user agent. These records are only ever added, never edited, and a refund does not restore eligibility.',
            },
            {
              term: 'Customers from before these records existed',
              detail:
                'Customers who had already used a free trial, or had already paid for a subscription, before these records were introduced may also be recorded in them, based on our existing account, subscription and payment records, so that the once-per-customer rules apply to them too. These entries contain the same kind of hash, but no IP address or user agent.',
            },
            {
              term: 'What this means if you delete your account',
              detail:
                'Deleting an account or organization removes its link to these records, but the hash and dates remain. Signing up again with the same mailbox — including a variation of it such as the same Gmail address with dots or a “+” tag — does not create a new free trial or new gifted days.',
            },
            {
              term: 'How long we keep them',
              detail:
                'The hashes and dates are kept for as long as Atlas offers these once-per-customer benefits, because without them the rule could be bypassed simply by deleting an account and signing up again.',
            },
          ],
        },
      ],
    },
    {
      id: 'emails-and-security',
      heading: '7. Emails, sign-in codes and security monitoring',
      blocks: [
        {
          kind: 'definitions',
          items: [
            {
              term: 'Sign-in and account-deletion codes',
              detail:
                'When we email you a one-time code to confirm a sign-in or an account deletion, the code is removed from our email records once sending has finished. To check the code you enter, we keep only a keyed check value of it — never the code itself — on a short-lived record, together with the IP address of the request for sign-in codes. These records are deleted after 24 hours.',
            },
            {
              term: 'Security events',
              detail:
                'To protect sign-in and account deletion, we record security events — such as a code being sent, verified, entered incorrectly, expiring or being locked, and sign-in attempts being rate-limited — with the time, the account and academy involved where known, and keyed hashes (HMAC) of the email address and IP address instead of the address itself. The key used for IP addresses changes every month, so activity from one network cannot be linked across months. Codes, passwords and tokens are never recorded. Only Atlas platform administrators can view these events, and they are deleted after 90 days.',
            },
            {
              term: 'Email delivery records',
              detail:
                'For each email Atlas sends, we keep a record of the type of message, who it was sent to, and its delivery status. Atlas platform administrators can review the delivery status of emails sent for each academy; recipient addresses are partly hidden in that view (for example, a•••@example.com) and no email subject or content is shown. These records are deleted after 90 days.',
            },
            {
              term: 'Delivery status from our email provider',
              detail:
                'Our email delivery provider tells us when a message is delivered, deferred, bounced, or reported as spam, and we update its delivery record. If an address bounces permanently or a recipient reports a message as spam, we add a one-way hash of the address — not the address itself — to a do-not-email list and stop sending email to it. Notices about opens or clicks, if the provider sends them, are only counted in aggregate.',
            },
            {
              term: 'Messages from academies',
              detail:
                'Owners and administrators of an academy can email the academy’s learners and staff, up to a monthly limit set by the academy’s plan. Atlas stores each message and its list of recipients in order to deliver it.',
            },
            {
              term: 'Choosing what you receive',
              detail:
                'Messages sent by an academy, and announcements sent by Atlas, include a signed unsubscribe link that works without signing in. It turns off email for that message’s category — engagement email for academy messages, operational email for Atlas announcements. You can also change these choices in your profile preferences. Transactional and security emails, such as sign-in codes and account, payment and enrolment notices, continue to be sent.',
            },
          ],
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '8. How we use personal data',
      blocks: [
        {
          kind: 'list',
          items: [
            'To provide the platform: creating and running your account, organizations, academies, courses, and enrolments.',
            'To authenticate you and keep your account secure, including showing you your active sessions and letting you end them.',
            'To confirm your email address is real and reachable.',
            'To operate subscriptions and billing, including free trials and gifted subscription days.',
            'To prevent abuse — in particular, to stop the same customer repeatedly obtaining a free trial or gifted subscription days, and to refuse signups from disposable or undeliverable email addresses.',
            'To send emails, including messages academies send to their learners and staff, and to know whether they were delivered.',
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
      heading: '9. Legal bases for processing',
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
                'Security, fraud and abuse prevention, and keeping the platform reliable and fast (including the sampled page-speed measurement in section 3) — balanced against your rights, which is why our eligibility and security records store keyed hashes rather than your email address or IP address.',
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
      heading: '10. Service providers and sharing',
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
                'Transactional email, such as verification and password-reset messages, and messages academies send to their learners and staff, are sent through an email delivery provider, which reports back whether each message was delivered.',
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
      heading: '11. International transfers',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Some of the providers described above operate outside the country where you are located, which means your personal data may be transferred across borders. Where the law that applies to you restricts such transfers — including under Egyptian and Saudi data protection law — we take the steps that law requires before transferring, such as relying on your consent, an adequacy assessment, or appropriate contractual safeguards.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '12. How long we keep data',
      blocks: [
        {
          kind: 'definitions',
          items: [
            {
              term: 'Account and content',
              detail:
                'Kept while your account exists. If you delete your account, your personal details are removed or replaced as described in section 13, except where a record must be retained (below).',
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
              term: 'Sign-in and account-deletion code records',
              detail: 'Deleted after 24 hours.',
            },
            {
              term: 'Free trial and gifted days eligibility records',
              detail:
                'The hashes and dates are kept even after an account or organization is deleted, for as long as Atlas offers these once-per-customer benefits (see section 6). The IP address and user agent recorded with a free trial are cleared after 180 days.',
            },
            {
              term: 'Security events',
              detail: 'Deleted after 90 days.',
            },
            {
              term: 'Email records',
              detail:
                'Email delivery records, and the queue records used to send emails, are deleted after 90 days. In-app notifications are deleted after 180 days, or after 365 days for billing, security and account notifications.',
            },
            {
              term: 'Page performance measurements',
              detail:
                'Aggregate counts only, deleted automatically after 15 days.',
            },
            {
              term: 'Billing and audit records',
              detail:
                'Retained as long as needed for accounting, legal, and security purposes.',
            },
          ],
        },
      ],
    },
    {
      id: 'deletion',
      heading: '13. Deleting your account or academy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You can delete your own Atlas account from your profile settings, confirming the request with a one-time code we email to you. Deleting your account signs you out everywhere, ends your active sessions immediately, and prevents further sign-in.',
        },
        {
          kind: 'paragraph',
          text: 'What is removed: your name, email address, profile picture and preferences are replaced so they no longer identify you; your password can no longer be used; your two-factor, password-reset and email-verification credentials are destroyed; and your memberships are removed. Certificates issued to you are anonymised. If you own an organization, its academies are archived and their public websites taken offline.',
        },
        {
          kind: 'paragraph',
          text: 'If you own an organization, you can also delete an academy you created. Deleting an academy takes its public website offline and frees the academy allowance on your plan.',
        },
        {
          kind: 'paragraph',
          text: 'What is kept, and why: billing and audit records, and learning records held by an academy — such as quiz attempts, submissions and progress — are kept, linked to the anonymised account rather than to you, because the academy and Atlas need an accurate history. An organization’s own record is also kept, because its billing and audit history depend on it. The free trial and gifted days eligibility records described in section 6 are kept as hashes and dates only — never your email address — so that these benefits cannot be claimed again by deleting an account and signing up again. Retention periods are listed in section 12.',
        },
        {
          kind: 'paragraph',
          text: 'Account deletion cannot be undone, and we cannot restore a deleted account.',
        },
      ],
    },
    {
      id: 'security',
      heading: '14. Security',
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
      heading: '15. Your rights',
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
      heading: '16. Children',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas is provided to education providers, and an academy may teach students who are minors under the law that applies to them. Where that is the case, the academy is responsible for obtaining any consent its own law requires from a parent or guardian. Atlas does not knowingly create accounts directly for children without an academy acting in that role.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '17. Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update this policy as Atlas changes. When we do, we will update the "last updated" date above, and where the change is significant we will tell you in the product before it takes effect.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '18. Contact us',
      blocks: [
        {
          kind: 'paragraph',
          text: 'For any privacy question, or to make a request about your personal data, contact us through the support option in your Atlas dashboard. If you do not have an account, you can reach us using the contact details published on the Atlas website.',
        },
      ],
    },
  ],
};
