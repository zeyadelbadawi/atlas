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
 *   - payments                -> `payments`, `payment_proofs` (manual-transfer proof
 *                                uploads; no card data — see §5)
 *   - trusted devices         -> `trusted_devices` (cookie hash, label, UA; 90/180 d
 *                                expiry; rows not pruned)
 *   - learner devices         -> `student_devices` (cookie hash, label, UA; revoked,
 *                                never deleted)
 *   - lesson access records   -> `content_access_log` (no IP/UA, 90 d)
 *   - quiz/exam activity      -> `quiz_attempt_events` (no IP/UA, 180 d)
 *   - page performance (RUM)  -> `atlas_rum_*` Prometheus histograms: page
 *                                template + phone/desktop only, aggregate,
 *                                15-day retention (Reports/REAL_USER_MONITORING.md)
 *   - phone number            -> `user_phones` (optional, owner-only)
 *   - forensic video watermark -> `forensic_watermarks` (no FKs, encrypted
 *                                identity snapshot, Platform Owner only, 730 d
 *                                after last shown, survives account deletion;
 *                                atlas-backend docs/FORENSIC_WATERMARK.md)
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
  lastUpdated: '9 October 2026',
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
                'Your name, email address, and a securely hashed form of your password. Atlas never stores your password itself. Optionally, a mobile phone number, a profile picture and interface preferences such as language and theme.',
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
              term: 'Trusted devices',
              detail:
                'When you confirm a sign-in with a code we email you, Atlas can remember that browser so you are not asked for a code there every time. It does this with a random value stored in a cookie on that browser. We keep a one-way hash of that value (never the value itself), a short label such as “Chrome on macOS”, the browser user agent, and when it was last used. You can see and remove your trusted devices in your security settings. A trusted device stops working after 90 days for the dashboard or 180 days for an academy, or earlier if you remove it, change or reset your password, sign out everywhere, or delete your account. Expired and removed entries are not currently deleted automatically.',
            },
            {
              term: 'Learning devices',
              detail:
                'Where an academy limits how many devices a learner can use, each browser a learner studies on is identified by a random value stored in a cookie. We keep a one-way hash of that value, a short label such as “Chrome on Android”, the browser user agent, and when the device was first and last used. No IP address and no device fingerprint is collected. Learners can see and remove their own devices. A removed device stops counting towards the limit, but its entry is kept and is not currently deleted automatically.',
            },
            {
              term: 'Lesson access records',
              detail:
                'Each time a learner opens protected lesson content, we record whether access was given or refused and why, the course and lesson, the learning device and session involved, and the time. No IP address or user agent is stored with them. They help academies spot accounts being shared and help us investigate problems. The learner, the academy’s owners, administrators and managers, and Atlas platform administrators can access them; academy staff see them as a sharing report that names learners. They are deleted after 90 days.',
            },
            {
              term: 'Quiz and exam activity',
              detail:
                'Where an academy turns on integrity monitoring for a quiz or exam, we record certain events during an attempt — such as leaving the page or window, leaving full screen, copying, pasting, printing, or the same attempt being opened in a second session — with their time. The number of such events and whether the attempt was flagged are kept with the attempt, and, depending on the academy’s settings, an attempt may be submitted automatically. No IP address or user agent is recorded. The learner, the course’s instructors, the academy’s owners, administrators and managers, the organization owner, and Atlas platform administrators can access this activity. The individual events are deleted after 180 days; the count and the flag stay with the attempt.',
            },
            {
              term: 'Forensic video watermark records',
              detail:
                'Each video you watch in an Atlas player, including free course previews and live classes, shows a personal watermark code. We keep a record that links that code to your account, sign-in session and device. Section 8 explains what these records contain, who can see them and how long we keep them.',
            },
            {
              term: 'Email verification',
              detail:
                'A short-lived, single-use token sent to your email address to confirm you can receive mail there, and the date verification succeeded.',
            },
            {
              term: 'Eligibility records',
              detail:
                'To apply our one-free-trial-per-customer rule and our once-per-customer gifted subscription days, we keep records that contain a cryptographic hash of the organization owner’s email address, not the address itself. Section 6 explains what these records contain and how long we keep them.',
            },
            {
              term: 'Support information',
              detail:
                'The content of support tickets you submit and the messages exchanged on them, together with your name and email so we can reply.',
            },
            {
              term: 'Payment and subscription information',
              detail:
                'Your plan, subscription status, billing cycle, invoices, the record of payments made, and any proof of payment you upload. See section 5 for what we specifically do not hold.',
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
          text: 'Atlas does not collect or store full payment card numbers, card security codes, or bank account credentials. Subscriptions are currently paid by manual transfer — bank transfer, mobile wallet or InstaPay. When you pay this way, you upload proof of the transfer, such as a screenshot or receipt, and an Atlas platform administrator reviews it. Atlas keeps that proof with the payment record, together with the amount, status, date and a reference, to show your billing history, keep your subscription accurate and resolve any dispute. Whatever account details appear on the proof you upload are stored as part of it.',
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
                'Created when a free trial starts. It contains the hash, when the trial started and when it was due to end, the organization and account that used it, and the IP address and browser user agent at that moment. The IP address and user agent are kept only as evidence for investigating abuse, are never used to decide eligibility, and are cleared automatically after 180 days. Cancelling a trial does not make the customer eligible again.',
            },
            {
              term: 'Older free trial records',
              detail:
                'Free trial records created before we introduced the keyed hash used an earlier method: a hash with a fixed label but no secret key. That method is weaker — someone who obtained such a record and already knew or guessed an email address could check whether it matches. These older records are still checked, so a trial used before the change still counts, but no new records are created this way.',
            },
            {
              term: 'Gifted subscription days record',
              detail:
                'Created when gifted setup days are granted on a first paid subscription. Whether a subscription qualifies depends on the plan and billing cycle chosen. The record contains the hash, the organization and account, a payment reference, the plan, the billing cycle, the number of gifted days and their dates. It contains no IP address or user agent. These records are only ever added, never edited, and a refund does not restore eligibility.',
            },
            {
              term: 'Customers from before these records existed',
              detail:
                'Customers who had already used a free trial, or had already paid for a subscription, before these records were introduced have also been recorded in them where our existing account, subscription and payment records show it, so that the once-per-customer rules apply to them too. These entries contain the same kind of keyed hash, but no IP address or user agent, and they do not grant any gifted days.',
            },
            {
              term: 'What this means if you delete your account',
              detail:
                'When an account is deleted, the account these records point to is anonymised; the hash and the dates remain. Signing up again with the same mailbox — including a variation of it such as the same Gmail address with dots or a “+” tag — does not create a new free trial or new gifted days.',
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
      id: 'forensic-watermark',
      heading: '8. Forensic video watermark',
      blocks: [
        {
          kind: 'paragraph',
          text: 'To protect the work of course creators, every video shown in an Atlas player — lesson videos hosted by Atlas, YouTube videos played inside the Atlas player, free course previews and live classes — carries a forensic watermark. It is a short code unique to the viewer and their current sign-in session (for example, 7K3QM-X9TR2), shown with a partly hidden form of the account’s email address (for example, l•••@gmail.com). The code moves around the picture, and a faint copy of it is repeated across the whole frame. The watermark is applied in every academy, and academies cannot turn it off.',
        },
        {
          kind: 'paragraph',
          text: 'The watermark discourages people from recording and sharing course videos, and it lets a leaked recording be traced back to the account and session it came from. It does not prevent screen recording. Atlas does not offer course videos for offline playback.',
        },
        {
          kind: 'definitions',
          items: [
            {
              term: 'What we record for each code',
              detail:
                'Your account identifier, name, email address and, if you have saved one, your phone number; your sign-in session identifier and when that session started; the IP address, country and device from which you signed in; the IP address, country, browser user agent and device of the request to watch; what was watched (the organization, academy, course, lesson or live class); when the code was issued and when it was last shown; and tamper reports — how many times, and when last, the player detected the watermark being hidden, removed or covered.',
            },
            {
              term: 'Visitors who are not signed in',
              detail:
                'When someone watches a free course preview without signing in, the record contains no name, email address or account: only the IP address, country and browser user agent, a one-way hash of a random identifier stored in a cookie on that browser, and what was watched and when.',
            },
            {
              term: 'Why we keep it',
              detail:
                'To protect course creators’ and academies’ content, and to investigate leaked recordings and unauthorised redistribution of course videos. These records are not used for advertising or profiling.',
            },
            {
              term: 'Who can see it',
              detail:
                'Only Atlas platform administrators — members of the Atlas team who hold the platform owner role — can look up a code, in order to investigate a leaked recording, and every lookup is recorded in an audit log. Academies, including their owners, staff and instructors, cannot read these records. When an academy reports a leaked recording of its content, Atlas may tell that academy which account the recording was traced to, and may take action under our Terms of Service.',
            },
            {
              term: 'How it is protected',
              detail:
                'The identity details in each record — name, email address, phone number, sign-in details and the titles of what was watched — are stored encrypted.',
            },
            {
              term: 'How long we keep it',
              detail:
                'Each record is deleted automatically 730 days after its code was last shown.',
            },
            {
              term: 'What this means if you delete your account',
              detail:
                'Watermark records are not deleted when you delete your account. They keep the identity details recorded when each code was issued until their retention period ends, so that a recording leaked before the deletion can still be traced.',
            },
          ],
        },
      ],
    },
    {
      id: 'how-we-use',
      heading: '9. How we use personal data',
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
            'To protect course creators’ content: showing a personal forensic watermark on course videos and investigating leaked or redistributed recordings.',
            'To keep an audit trail of significant actions, so account owners can see what happened in their organization and we can investigate security incidents.',
            'To diagnose faults and keep the service running.',
            'To comply with legal obligations.',
          ],
        },
      ],
    },
    {
      id: 'legal-bases',
      heading: '10. Legal bases for processing',
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
                'Security, fraud and abuse prevention, protecting course creators’ content against unauthorised recording and redistribution (the forensic video watermark in section 8), and keeping the platform reliable and fast (including the sampled page-speed measurement in section 3) — balanced against your rights, which is why our eligibility and security records store hashes rather than your email address or IP address.',
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
      heading: '11. Service providers and sharing',
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
              term: 'Sign in with Google',
              detail:
                'If you choose to sign in with Google, Google confirms your identity to Atlas and shares your name and email address with us. Google handles that sign-in under its own terms and privacy policy.',
            },
            {
              term: 'Live video sessions',
              detail:
                'Where an academy runs live sessions, they are hosted by a video-meeting provider, which receives the display name of each participant who joins.',
            },
            {
              term: 'Error monitoring',
              detail:
                'Where it is enabled, application errors are reported to an error-monitoring provider so we can fix faults. Credentials, tokens, cookies, and authorization headers are removed before an error report leaves Atlas.',
            },
            {
              term: 'Payments',
              detail:
                'Subscriptions are currently paid by manual transfer, which you make through your own bank, wallet or InstaPay provider under their terms. Atlas does not currently use a card-payment provider.',
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
      heading: '12. International transfers',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Some of the providers described above may store or process personal data in countries other than the one where you are located, so your personal data may be transferred across borders. Some laws — including the data protection laws of Egypt and Saudi Arabia — set conditions for such transfers. If you would like to know more about where your data is processed, contact us using the details in section 19.',
        },
      ],
    },
    {
      id: 'retention',
      heading: '13. How long we keep data',
      blocks: [
        {
          kind: 'definitions',
          items: [
            {
              term: 'Account and content',
              detail:
                'Kept while your account exists. If you delete your account, your personal details are removed or replaced as described in section 14, except where a record must be retained (below).',
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
              term: 'Do-not-email list',
              detail:
                'A hashed address stays on the list until an Atlas platform administrator removes it. It is not deleted automatically, and it is not removed when an account is deleted.',
            },
            {
              term: 'Messages from academies',
              detail:
                'Each message and its recipient list are kept in the academy’s message history. They are not currently deleted automatically, and they remain after an academy is archived; if a recipient deletes their account, their entry stays linked to the anonymised account. The individual email records created to deliver a message are deleted after 90 days, as described above.',
            },
            {
              term: 'Trusted devices and learning devices',
              detail:
                'Trusted devices stop working after 90 days (dashboard) or 180 days (academy), or when removed; learning devices stop counting when removed. Neither kind of entry is currently deleted automatically.',
            },
            {
              term: 'Lesson access records',
              detail: 'Deleted after 90 days.',
            },
            {
              term: 'Quiz and exam activity',
              detail:
                'The individual events are deleted after 180 days. The number of events and whether an attempt was flagged stay with the attempt, as part of the academy’s learning records.',
            },
            {
              term: 'Forensic video watermark records',
              detail:
                'Deleted 730 days after the code was last shown. They are kept for that period even if the account is deleted (see section 8).',
            },
            {
              term: 'Archived academies',
              detail:
                'When an academy is deleted, or archived because its owner deleted their account, its public website goes offline and its content is kept. Atlas does not currently delete an archived academy’s content automatically, and an archived academy cannot currently be restored — by its owner or by Atlas.',
            },
            {
              term: 'Page performance measurements',
              detail:
                'Aggregate counts only, deleted automatically after 15 days.',
            },
            {
              term: 'Billing and audit records',
              detail:
                'Retained as long as needed for accounting, legal, and security purposes. This includes proof of payment you upload.',
            },
          ],
        },
      ],
    },
    {
      id: 'deletion',
      heading: '14. Deleting your account or academy',
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
          text: 'If you own an organization, you can also delete an academy you created. Deleting an academy takes its public website offline and frees the academy allowance on your plan. A deleted academy is archived rather than erased, and it cannot currently be restored.',
        },
        {
          kind: 'paragraph',
          text: 'What is kept, and why: billing and audit records, and learning records held by an academy — such as quiz attempts, submissions and progress — are kept, linked to the anonymised account rather than to you, because the academy and Atlas need an accurate history. An organization’s own record is also kept, because its billing and audit history depend on it. The free trial and gifted days eligibility records described in section 6 are kept as hashes and dates only — never your email address — so that these benefits cannot be claimed again by deleting an account and signing up again. Forensic video watermark records described in section 8 are kept, with the name, email address and other identity details recorded when each code was issued, until 730 days after the code was last shown, so that a leaked recording can still be traced. Retention periods are listed in section 13.',
        },
        {
          kind: 'paragraph',
          text: 'Account deletion cannot be undone, and we cannot restore a deleted account.',
        },
      ],
    },
    {
      id: 'security',
      heading: '15. Security',
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
      heading: '16. Your rights',
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
      heading: '17. Children',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Atlas is provided to education providers, and an academy may teach students who are minors under the law that applies to them. Where that is the case, the academy is responsible for obtaining any consent its own law requires from a parent or guardian. Atlas does not knowingly create accounts directly for children without an academy acting in that role.',
        },
      ],
    },
    {
      id: 'changes',
      heading: '18. Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update this policy as Atlas changes. When we do, we will update the "last updated" date above, and where the change is significant we will tell you in the product before it takes effect.',
        },
      ],
    },
    {
      id: 'contact',
      heading: '19. Contact us',
      blocks: [
        {
          kind: 'paragraph',
          text: 'For any privacy question, or to make a request about your personal data, contact us through the support option in your Atlas dashboard. If you do not have an account, you can reach us using the contact details published on the Atlas website.',
        },
      ],
    },
  ],
};
