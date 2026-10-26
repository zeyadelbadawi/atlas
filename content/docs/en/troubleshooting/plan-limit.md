---
id: DOC-TRB-010
title: You've reached a plan limit
description: Seeing "You've reached your plan's limit for this"? Find which limit, check Usage, free up capacity safely or upgrade. Nothing is deleted.
summary: >
  Each plan allows a set number of academies, courses, instructors and
  students, and an amount of storage. When an action would go over one of them,
  Atlas refuses it with "You've reached your plan's limit for this." Open Usage
  to see which limit is full, then free up space or upgrade your plan. Nothing
  you already have is deleted.
type: troubleshooting
audience: [owner]
order: 9
priority: P1
related: [DOC-BIL-006, DOC-BIL-005, DOC-REF-001, DOC-START-006, DOC-TRB-007]
keywords: [plan limit, limit reached, upgrade, too many students, can't add course, can't add instructor, storage full, حد الخطة, وصلت للحد, ترقية الخطة, مش قادر أضيف طلاب, مش قادر أضيف كورس, المساحة خلصت]
updated: 2026-10-20
---

## Symptom

An action fails with **"You've reached your plan's limit for this. Upgrade your plan to continue."** Or, when you start a new academy, you see **"Academy limit reached"**. Learners trying to buy a course may see "This academy isn’t accepting new enrollments right now. Please contact the academy."

## Why it happens

Your plan sets limits, and Atlas checks them at the moment you add something:

| Limit | When it is checked |
|---|---|
| Academies | When you create a new academy |
| Courses | When you create a course |
| Instructors | When you add an instructor to an academy |
| Students | When a learner who isn't enrolled in any of your courses yet gets enrolled: a free enrolment, a manual enrolment, or a paid order |
| Storage | When you upload a file |

What counts:

- **Students** are learners with a current enrolment in at least one course. A learner enrolled in a second course doesn't count twice.
- **Instructors** are people with the instructor role. Owners and managers don't count towards it.

The limits for each plan are on the [pricing page](site:/pricing).

> [!NOTE]
> A limit only stops new additions. Nothing you already have is deleted, hidden or switched off because you reached a limit.

## Fix

1. Open **Usage** in the sidebar. It shows your current usage against each of your plan's limits, and marks the ones you have reached with "You've reached this limit. Upgrading your plan will raise it."

   ![The Usage page showing current usage against plan limits](shot:troubleshooting/usage-page)

2. Decide whether to free up space or upgrade.
   - **Free up space:** remove an instructor who no longer teaches with you, remove files you no longer need from **Media library**, or **Revoke** the access of learners who should no longer be enrolled.
   - **Upgrade:** open **Subscription** and choose **Compare plans** to see what each plan allows.

   ![The Subscription page with the Compare plans button highlighted](shot:troubleshooting/compare-plans)

3. Try the action again.

> [!WARNING]
> Deleting an academy frees its slot, but "This cannot be undone": its website goes offline and its managers, instructors and students lose access. Don't delete an academy just to make room; upgrade instead.

## Still stuck?

If Usage shows room but Atlas still refuses the action, open a ticket from **Support** ([open Support](app:/dashboard/support)) with what you tried and the exact message. See [Getting help](category:support).

Related: [Your Atlas subscription](category:billing).
