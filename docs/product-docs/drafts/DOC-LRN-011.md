---
doc_id: DOC-LRN-011
b0_record: B0-LRN-09 (part a, unpublished courses)
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "Publish or unpublish a course"
url_en: /docs/courses/publish
url_ar: /ar/docs/courses/publish
audience: Owner, Manager
feature_ids: [LRN-1.7]
security_review: n/a
screenshots: pending (SS-039; the brief's SS-NEW-02 is obsolete, see reviewer notes)
---

# Publish or unpublish a course

A course can be published once it has a title and web address, at least one
published activity (a lesson, quiz, assignment or live session), and a price
if it is paid. Publish it from the wizard's last step or from Course Settings.
Unpublishing returns it to draft: enrolled learners keep their progress, but
cannot open its lessons until you publish it again.

## What "published" means

A published course is visible according to its visibility setting. Learners
only ever see the items inside it that are themselves published.

## Check readiness

The wizard's **Review** step lists two groups:

- **Required before publishing**: the course needs a title and web address,
  at least one published activity, and, for a paid course, a price. Atlas
  refuses to publish a course that misses any of these, from any screen.
- **Recommended**: things like a short description, a thumbnail, outcomes,
  items still in draft and empty sections. They help learners but do not
  stop you publishing.

## Publish from the wizard

1. Open the course in the wizard and go to **Review**. Fix anything under
   **Required before publishing**.
2. Select **Publish course**, then confirm **Publish this course?**.
3. "This course is published" confirms it.

## Publish or unpublish from Course Settings

1. Go to **Courses**, then **Settings** on the course.
2. To publish, select **Publish Course** and confirm. The button is available
   only when nothing required is missing.
3. To unpublish, select **Unpublish Course** and confirm **Unpublish this
   course?**. The course returns to draft.

## Unpublishing: what enrolled learners experience

Unpublishing does not remove anyone from the course or touch their progress.

- **The course stays in their learning list.** It still appears under
  continue learning in My Learning, with their progress.
- **Their progress is kept.** Completed lessons stay completed, and they can
  still see their progress in the course.
- **Lessons do not open while the course is a draft.** A learner who tries
  sees "This activity cannot be opened".
- **Publishing again restores access.** Their enrolment was never changed, so
  they continue where they stopped.

If you need to change a live course, edit it while it stays published rather
than unpublishing it, so your learners can keep studying.

## Troubleshooting

- **Publish Course is not available, or you see "This course isn't ready to
  publish yet".** Open the wizard's **Review** step and fix the items under
  **Required before publishing**.
- **The course is published but a lesson is missing for learners.** Check
  that the lesson itself is published.

## Related pages

- Create a course with the guided wizard (DOC-LRN-002)
- Course details: visibility, level, language, outcomes and thumbnail
  (DOC-LRN-004)
- Build your curriculum (DOC-LRN-005)
- A lesson won't open or play (DOC-TRB-004)

---

## Arabic (for native review, RV-14)

- Title direction: «انشر دورتك أو ألغِ نشرها»
- UI labels to quote on the AR page: «المراجعة» (`course:wizard.steps.review.label`),
  «مطلوب قبل النشر» (`course:wizard.review.blockingTitle`), «موصى به»
  (`course:wizard.review.warningsTitle`), «نشر الدورة» (`course:wizard.publish.button`
  and `course:settings.publishAction`), «إلغاء نشر الدورة»
  (`course:settings.unpublishAction`), «تعذّر فتح هذا النشاط»
  (`learning:player.failure.unavailable.title`).
- Draft paragraph for the unpublishing section (needs native review):
  «إلغاء النشر لا يُخرج أحدًا من الدورة ولا يمسّ تقدّمه. تبقى الدورة في
  قائمة تعلّم المتعلّم مع تقدّمه، لكن لا يمكن فتح دروسها ما دامت مسودة،
  ويرى المتعلّم «تعذّر فتح هذا النشاط». عند إعادة النشر يتابع من حيث توقّف.»

## Reviewer notes (not for publication)

Verified behaviour (file:line):

- Readiness is enforced on the server (B0-LRN-03):
  `atlas-backend/src/course/services/course-readiness.ts` L10–L24, L33
  (`PUBLISH_READINESS_ENFORCED = true`), blocking checks L134–L158
  (`title`, `publishedActivity`, `paidPrice`), refusal L229–L239
  (`errors.course.notReady`); `atlas-backend/src/course/services/courses.service.ts`
  L514–L518. Course Settings disables Publish until ready:
  `atlas/src/features/course/pages/CourseSettingsPage.tsx` L105–L114.
- Unpublished course, enrolled learner (test
  `atlas-backend/test/learner-access-edge-states.e2e-spec.ts` L141–L172,
  draft and archived): `GET /courses/:id/progress` 200 with progress kept;
  `GET /learning/overview` still lists the course under continue learning;
  the enrolment row stays `enrolled`.
- Lessons refused while unpublished: `atlas-backend/src/learning/services/lesson-content.service.ts`
  L345–L348 (`courseUnavailable`), which reaches the player as a 404 and is
  shown as `learning:player.failure.unavailable.*`
  (`atlas/src/features/learner/utils/player-failure.utils.ts` L1–L26).
  This lesson refusal is code-read only; the e2e above does not open a
  lesson. Add a case before publication if the owner wants it pinned.

Discrepancies for the owner (not stated on the page):

1. **Quizzes and assignments are not gated on the course status.** Starting
   a quiz attempt checks only an active enrolment and that the quiz is
   published (`atlas-backend/src/learning/services/quiz-attempt-engine.service.ts`
   L180–L191); assignments use the same read gate as published courses
   (`assignments.service.ts` L139–L183). So in an unpublished course,
   lessons are refused but a learner may still be able to take a quiz or
   submit an assignment. Not tested. Decide whether that is intended before
   the page says anything about quizzes.
2. **The brief is stale on CF-06.** It asks for a callout that Course
   Settings can publish an empty course. Since B0-LRN-03 the server refuses
   it and the button is disabled, so this draft has no such callout and the
   planned SS-NEW-02 screenshot cannot be taken.
3. The course staying in My Learning after unpublishing is current
   behaviour, pinned by the test. Hiding it would be a product change.
