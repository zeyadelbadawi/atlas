---
id: DOC-TASK-005
title: Manage learners and enrollments
description: Choose who can join, add learners, approve requests, give course access with an end date, revoke access and block learners.
summary: >
  Choose a registration policy (open, approval required or invite only), then let
  learners sign up on your website, send invite links, or add a student yourself.
  Approve pending learners, give course access without a purchase and set an end date
  if you want, revoke access when needed, and block anyone who should lose access to
  the academy.
type: workflow
audience: [owner, manager]
order: 5
priority: P0
related: [DOC-ORG-001, DOC-ORG-005, DOC-ORG-007, DOC-ORG-010, DOC-ORG-008]
keywords: [add students, approve students, enroll manually, invite link, block student, أضيف طلاب, وافق على الطلاب, تفعيل كورس لطالب, لينك دعوة, حظر طالب]
updated: 2026-10-20
---

The owner and managers manage learners together. Choosing the registration policy and
adding a student account yourself are for the owner only.

## Stages

1. **Choose who can join.** Open **Academy Settings**, choose the **Student registration** section and pick
   the **Registration policy**: **Open** (anyone can sign up and start), **Approval
   required** (each sign-up waits until you approve it) or **Invite only** (only someone
   with a valid invite link can register). Choose **Save policy**. Owner only. See
   [Choose who can join](doc:DOC-ORG-005).

   ![The Registration policy card with the three choices](shot:tasks/learners-policy)

2. **Send invite links (Invite only).** Under **Invite links**, choose **Create invite**
   and share the link with the learner. Links are required only when the policy is
   **Invite only**; with the other policies learners sign up without one. See
   [Invite learners with invite links](doc:DOC-ORG-006).

   ![The Invite links card in Academy Settings](shot:tasks/learners-invite-links)

3. **Add a student yourself (owner).** Open **Members** and choose **Add Student** to
   create a learner account or add an existing Atlas account to your academy. See
   [Add a student yourself](doc:DOC-ORG-004).

   ![The Members page with the Add Student button](shot:tasks/learners-add-student)

4. **Approve pending learners.** On **Members**, open the **Students** tab. Filter by
   status to find pending learners, open one and choose **Approve** or **Reject**. See
   [Approve pending learners](doc:DOC-ORG-007).

   ![The Students tab with the list of learners](shot:tasks/learners-students-tab)

5. **Manage one learner's access.** Open a learner on the **Students** tab. From there:
   - **Enroll in a course** gives course access without a purchase
     ([Enroll a learner manually](doc:DOC-ORG-010)).
   - **Set expiry** sets the date their access to a course ends.
   - **Revoke** ends their access to a course at once; their progress is kept.
   - **Block** keeps their account but removes their access to this academy's courses
     until you unblock them ([Block or unblock a learner](doc:DOC-ORG-008)).

   ![A learner's details opened from the Students tab](shot:tasks/learners-student-details)

## Who can do each stage

| Stage | Owner | Manager | Instructor |
|---|---|---|---|
| Registration policy | Yes | No | No |
| Create invite links | Yes | Yes | No |
| Add a student yourself | Yes | No | No |
| Approve, reject, enrol, set expiry, revoke, block | Yes | Yes | No |
| See students | Yes | Yes | Students of their courses, read-only |

## Limits and what counts

- Every learner with course access counts once toward your plan's student limit. When
  the limit is full, new learners can't get course access. See
  [Plans, limits and what counts toward them](doc:DOC-START-006).
- There is no import of a learner list from a file: add learners one by one, or let them
  sign up.

If someone can't join, see [A learner can't join the academy](doc:DOC-TRB-014).
