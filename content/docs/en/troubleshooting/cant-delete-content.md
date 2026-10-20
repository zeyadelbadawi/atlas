---
id: DOC-TRB-012
title: Can't delete a lesson, quiz or section
description: Atlas blocks deleting course items that learners have already used, to protect their records. Here is why, and what to do instead.
summary: >
  When learners already have progress, quiz attempts or submissions on a
  lesson, quiz, assignment or section, Atlas won't delete it, because that
  would erase their records. Set the item to Draft instead: learners no longer
  see it, and their records stay. Items nobody has used yet can still be
  deleted.
type: troubleshooting
audience: [owner, manager, instructor]
order: 11
priority: P2
related: [DOC-LRN-005, DOC-LRN-014, DOC-LRN-019, DOC-ROLE-005]
keywords: [can't delete lesson, delete quiz, delete section, learners already have progress, unpublish, draft, مش قادر أحذف الدرس, حذف اختبار, حذف قسم, مسودة, إلغاء النشر]
updated: 2026-10-20
---

## Symptom

You choose **Delete lesson**, **Delete section** or delete a quiz or assignment, confirm, and Atlas refuses with:

"Learners already have progress, attempts or submissions for this item, so it can't be deleted — that would erase their records. Unpublish it (set it to draft) to hide it from learners instead."

## Why it happens

Deleting a course item also deletes everything learners did in it: lesson progress, quiz attempts and results, assignment submissions and grades. To protect those records, Atlas only deletes items no learner has touched. This applies to sections, lessons, quizzes and assignments.

Owners and managers can edit every course in their academy. Instructors can edit only the courses they are assigned to.

## Fix

Set the item to **Draft**. A draft item is hidden from learners, and their records stay in place.

### A lesson

1. In the **Course Builder**, open the lesson's actions menu (the three dots on its row) and choose **Edit lesson**.

   ![The Course Builder with a lesson's actions menu open and Edit lesson highlighted](shot:troubleshooting/builder-lesson-menu)

2. Set **Availability** to **Draft**, then choose **Save Lesson**.

   ![The Edit Lesson dialog with the Availability field highlighted](shot:troubleshooting/lesson-dialog-availability)

### A quiz or an assignment

1. Open the course's quizzes (or assignments) and open the item.

   ![The quiz editor with its details](shot:troubleshooting/quiz-editor)

2. Set **Status** to **Draft** and save.

### A section

A section can't be deleted while any of its lessons has learner progress. Set each lesson, quiz and assignment in it to **Draft**. Learners only see published items, so the section has nothing to show them.

### Items nobody has used

If no learner has opened or attempted the item, delete it as usual. The confirmation warns you that it "cannot be undone".

> [!TIP]
> Want to replace a lesson with a better version? Add the new lesson, publish it, then set the old one to **Draft**. Learners' records for the old one stay.

## Still stuck?

If Atlas refuses to delete an item you are sure no learner has used, open a ticket from **Support** ([open Support](app:/dashboard/support)) with the course and item name. See [Getting help](category:support).

Related: [Courses, quizzes and certificates](category:courses).
