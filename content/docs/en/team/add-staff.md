---
id: DOC-ORG-002
title: Add a manager or instructor
description: Give someone manager or instructor access by email. New people get a link to set a password; existing Atlas users are added straight away.
summary: >
  On the Members page, the organization owner chooses Add Manager or Add
  Instructor and types the person's email and full name. Someone new to Atlas
  gets an email with a link to set their password (valid for 72 hours).
  Someone who already uses Atlas is added straight away and told by email.
type: step-by-step
audience: [owner, manager]
order: 2
priority: P0
related: [DOC-ORG-001, DOC-ORG-003, DOC-IAM-012, DOC-LRN-012, DOC-ROLE-005]
keywords: [add instructor, add manager, invite teacher, staff, team, إضافة مدرس, إضافة مدرب, مساعد, صلاحية, دعوة]
updated: 2026-10-20
---

Only the **organization owner** can add managers and instructors. Managers see the Members page but not the add buttons. You need the person's email address and their full name.

## Manager or instructor?

- A **manager** runs the academy with you: courses, content, the website, most settings and learners. Managers can't add staff or see your billing.
- An **instructor** teaches the courses you assign them to: they see those courses' students, quiz results and submissions, and grade assignments.

Instructors count toward your plan's instructor limit; managers don't. See [Roles and permissions](doc:DOC-ROLE-005).

## Add someone

1. In the academy sidebar, open **Members**. The **Team** tab is open.

   ![The Members page with the Team tab selected](shot:team/members-team-tab)

2. Select **Add Instructor** or **Add Manager**.

   ![The Add Instructor and Add Manager buttons](shot:team/add-staff-buttons)

3. Type their **Email address**. Atlas checks it and tells you if the person is already in this academy.

   ![The Add an Academy Instructor dialog with an email typed in](shot:team/add-instructor-email)

4. Type their **Full name**. It is used only if they don't have an Atlas account yet; people who already use Atlas keep their own name.

   ![The Full name field filled in](shot:team/add-instructor-name)

5. Select **Add Instructor** (or **Add Manager**) to finish.

   ![The Add Instructor button at the bottom of the dialog](shot:team/add-instructor-submit)

## What happens next

A message tells you what Atlas did:

- **Invitation sent. They'll get an email to set up their account.** The email had no Atlas account. We created one and emailed a link to set a password. The link works for 72 hours.
- **Added. We sent them a fresh link to finish setting up their account.** They had an account but never finished setting it up.
- **Added. We've emailed them to let them know.** They already use Atlas. They sign in with their usual email and password and find your academy there.

The person appears in the Team list straight away. To learn what the invited person does, see [Accept an invitation](doc:DOC-IAM-012).

An instructor sees no course until you assign them to one. Open the course and use its **Instructors** card. See [Assign instructors to a course](doc:DOC-LRN-012).

> [!NOTE]
> If the 72-hour link runs out, the person can select **Forgot password?** on the sign-in page and use the same email to get a new link.

## If the person can't be added

- **This person is already a manager in this academy.** (or instructor, or student) They are already here, so the add button stays off.
- **This Atlas account can't be added right now.** The account is suspended or deleted.
- **You've reached your plan's instructor limit. Upgrade your plan to add more.** Remove an instructor you no longer need, or move to a bigger plan. See [Plan limits](site:/pricing).
![The dialog saying the person is already in this academy](shot:team/add-staff-already-member)

> [!LIMITATION]
> There is no list of pending invitations and no resend button. There is also no way to change a role: to turn an instructor into a manager, [remove them](doc:DOC-ORG-003) and add them again as a manager.

## Related articles

- [Team and learners overview](doc:DOC-ORG-001)
- [Remove a staff member](doc:DOC-ORG-003)
