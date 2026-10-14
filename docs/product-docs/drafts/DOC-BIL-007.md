---
doc_id: DOC-BIL-007
b0_record: B0-LRN-09 (part b, lapsed academies); see also B0-BIL-14
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "When a subscription lapses: read-only mode and Coming Soon"
url_en: /docs/billing/lapsed
url_ar: /ar/docs/billing/lapsed
audience: Owner
feature_ids: [BIL-4.3, BIL-4.4, BIL-4.5]
security_review: pending (SR)
publication_blockers:
  - "Owner approval of the learner section wording (brief: Q-BIL-07)"
  - "Owner decision on the learner-portal finding in the reviewer notes"
---

# When a subscription lapses: read-only mode and Coming Soon

When your trial ends, or your paid period ends and the 7-day grace period
after it runs out, your dashboard becomes read-only and your academy website
shows "Coming soon". Your learners cannot reach their courses on your website
until you renew, but nothing is deleted: courses, students and their
progress are kept. Pay for a plan and everything comes back as you left it.

## When it happens

- **A trial** ends on its last day. There is no grace period after a trial.
- **A paid period** that is not renewed is followed by a 7-day grace period.
  During the grace period everything keeps working and the dashboard shows
  "Your payment is late — your site is still online". When the grace period
  ends, the subscription lapses.

## What stops

- **Changes in the dashboard.** Editing and publishing your website, course
  authoring and grading, announcements, uploads and other changes are
  refused with "An active subscription is required to make this change." A
  banner explains why: "Your subscription has ended".
- **Your academy website.** Visitors see a "Coming soon" page. It does not
  say anything about your subscription or billing.

## What keeps working

- You can still open and read everything in your dashboard.
- Your subscription and billing pages, choosing a plan, paying, support
  cases and Atlas service requests keep working, so you can renew.

## What your learners see

- **On your academy website, learners see the "Coming soon" page too,**
  including when they go to sign in or to My Learning. They cannot open
  their courses there until you renew.
- **Their progress is safe.** Nothing a learner has completed is removed.
  Lessons they had finished, quiz results and submitted assignments are all
  still there when your subscription is active again.

## Is anything deleted?

No. A lapsed subscription does not delete your academies, courses, students
or content: "Nothing has been deleted. Your academies, courses, students and
content are all still here and will be exactly as you left them."

## Restore access

1. From the banner or your **Subscription** page, select **Choose a plan**
   (or **Reactivate subscription**).
2. Pay for the plan (see "Pay for your subscription").
3. When the payment is approved, your dashboard works again and your website,
   including your learners' My Learning, comes back.

Atlas staff cannot restore access without a payment.

## Related pages

- Billing overview (DOC-BIL-001)
- Pay for your subscription (DOC-BIL-004)
- My website shows "Coming soon" (DOC-TRB-005)
- The dashboard is read-only or asks for a subscription (DOC-TRB-015)

---

## Arabic (for native review, RV-14)

- Title direction: «عند انتهاء الاشتراك: وضع القراءة فقط وصفحة «قريبًا»»
- UI labels to quote on the AR page: «انتهى اشتراكك»
  (`tenant:subscriptionRequired.title`), «اختر خطة»
  (`tenant:subscriptionRequired.choosePlan`), «إعادة تفعيل الاشتراك»
  (`tenant:lifecycle.expired.action`), «تأخّر الدفع — موقعك لا يزال يعمل»
  (`tenant:lifecycle.gracePeriod.title`), «قريبًا»
  (`website:public.unpublished.title`), and the data-safe sentence
  `tenant:subscriptionRequired.dataSafe`.
- Draft paragraph for the learner section (needs native review and owner
  approval): «على موقع أكاديميتك يرى المتعلّمون أيضًا صفحة «قريبًا»، حتى
  عند محاولة تسجيل الدخول أو فتح «تعلّمي»، ولا يمكنهم فتح دوراتهم هناك حتى
  تجدّد اشتراكك. تقدّمهم محفوظ: لا يُحذف أي شيء أنجزوه.»

## Reviewer notes (not for publication)

Verified behaviour (file:line):

- Access states and grace: `atlas-backend/src/plans/services/subscription-access.service.ts`
  L39–L55 (statuses that end access, including `trial_expired`; grace and
  `past_due` keep it), L109–L110 (grace = period end + 7 days),
  `src/plans/queue/subscription-sweep.types.ts` L80.
- Mutations refused, reads allowed: `atlas-backend/src/plans/interceptors/subscription-access.interceptor.ts`
  L52–L58, L94 (GET/HEAD/OPTIONS pass), L102–L123 (guard-verified tenant
  or `:academyId` → `assertHasAccess`), L126–L157 (`@SubscriptionScope`
  routes). Allowed while lapsed (`@AllowInactiveSubscription`): tenant
  subscription, checkout, payment, onboarding, tenant support cases,
  academy customer requests and tenant retention controllers.
- Website and learner portal: the public site's reads return nothing when
  the organization is not serving-eligible,
  `atlas-backend/src/public-website/services/public-website.service.ts`
  L300–L345, eligibility `subscription-access.service.ts` L166–L171
  (never-subscribed tenants keep their site). On the academy host the
  frontend then classifies the site as `unpublished`
  (`atlas/src/features/public-website/hooks/usePublicWebsiteData.ts`
  L16–L35), and the sign-in, sign-up and `/my/*` routes render the
  status page when the site is not `ready`:
  `atlas/src/features/public-website/components/PublicWebsiteSignInPage.tsx`
  L152–L153, `PublicWebsiteAuthShell.tsx` L83–L85 (forgot/reset password,
  verify email), `PublicWebsiteLearningRoute.tsx` L95–L97, with copy
  `website:public.unpublished.*` ("Coming soon" / "This website hasn't
  been published yet.").
- Learner API writes still succeed while lapsed (test
  `atlas-backend/test/learner-access-edge-states.e2e-spec.ts` L174–L238):
  playback heartbeat 200, complete-lesson 201, quiz attempt start and
  submit 201, assignment submission 201; the owner's
  `PATCH registration-policy` is refused with 403
  `errors.subscription.required`. Learner routes carry no tenant context or
  `@SubscriptionScope` (`atlas-backend/src/learning/controllers/course-progress.controller.ts`
  L14–L15, L30; `lesson-content.controller.ts` L71–L72, L141–L142), so
  the interceptor skips them.
- Restore: payment approval invalidates the cached serving decision,
  `atlas-backend/src/billing/services/platform-payment.service.ts` L261.

**Discrepancy found (owner decision needed).** The B0 ledger entry for
B0-LRN-09 / B0-BIL-14 concludes that "a late renewal never costs a learner
progress", from the API test above. That is true for stored progress, but in
the product a learner of a lapsed academy cannot reach My Learning at all:
the academy host shows "Coming soon" ("This website hasn't been published
yet.") on sign-in and on every `/my/*` page. The API writes that the test
exercises are not reachable from the learner's UI during the lapse. This
draft describes the real behaviour. Options for the owner: (a) accept and
publish this wording; (b) keep the learner portal (`/sign-in`, `/my/*`)
available on a lapsed academy's host while the public pages show Coming
Soon, which is a code change; (c) change the Coming Soon wording learners
see. Not changed here (behaviour, not a copy bug).

Not described on purpose: hosted-video retention after a lapse (flag-gated,
`FLAG_VIDEO_RETENTION_MODE`, off unless set; brief says omit unless the
production flag is verified and legal approves).
