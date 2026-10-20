---
id: DOC-LRN-018
title: Give a learner a quiz exception
description: Give one learner extra time, extra attempts or their own opening window on a quiz, without changing it for anyone else.
summary: >
  On a quiz's Quiz Results page, choose Overrides to open Student overrides.
  Pick the learner, set a time multiplier between 1 and 5, extra attempts or a
  personal window, write a reason and choose Save override. The server applies
  it when that learner starts an attempt. Remove it to return the learner to
  the quiz's own settings.
type: step-by-step
audience: [instructor, manager, owner]
order: 15
priority: P2
related: [DOC-LRN-015, DOC-LRN-017, DOC-LRN-033, DOC-FAQ-006]
keywords: [extra time, extra attempt, quiz override, exception, وقت اضافي, محاولة اضافية, استثناء طالب, اعادة الامتحان]
updated: 2026-10-20
---

An exception (override) changes a quiz for one learner only, for example extra time for a learner who needs it, or another attempt after a technical problem. The course's assigned instructors, the owner and managers can add one.

## Add an exception

1. Open the quiz's **Quiz Results** page: in the **Teaching Dashboard**, open the course, choose **Assessments**, then the quiz.

   ![The Quiz Results page with the Overrides button](shot:courses/quiz-results-overrides)

2. Choose **Overrides**. **Student overrides** opens with the current exceptions and a form to add one.

   ![The Student overrides panel with the add or update form](shot:courses/overrides-sheet)

3. Choose the **Student**, then set what they need:
   - **Time multiplier**: 1 keeps the normal time limit, 1.5 gives 50% more time. It must be between 1 and 5.
   - **Extra attempts**: added to the quiz's maximum.
   - **Available from** and **Available until**: a personal window. Leave both empty to keep the quiz's window.
   - **Reason**: why the learner gets the exception, under 500 characters.

   Then choose **Save override**.

   ![The override form with the Save override button](shot:courses/overrides-save)

## What happens next

**Override saved** confirms it, and the exception appears under **Current overrides**. The server applies it the next time that learner starts an attempt. Other learners are not affected.

To remove an exception, choose **Remove** next to it and confirm with **Remove override**. The learner goes back to the quiz's own time limit, attempts and window.

> [!NOTE]
> Extra time only matters when the quiz has a time limit. See [Quiz settings](doc:DOC-LRN-015).

## Related

- [Review attempts and grade essay answers](doc:DOC-LRN-017)
- [Create a quiz](doc:DOC-LRN-014)
