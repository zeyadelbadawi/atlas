---
id: DOC-ORG-010
title: Enroll a learner manually and set access expiry
description: Give a learner a course without a purchase, set an optional end date, change it later, or revoke access while keeping their progress.
summary: >
  Open the learner on the Students tab, choose Enroll in a course, pick the
  course and, if you want, the day access ends. Leave the date empty for
  access that doesn't expire. Later you can change the date with Set expiry or
  end access with Revoke. Progress is kept. The owner and managers can do this.
type: step-by-step
audience: [owner, manager]
order: 10
priority: P0
related: [DOC-ORG-004, DOC-ORG-009, DOC-COM-001, DOC-START-006, DOC-TASK-005]
keywords: [manual enrollment, give course access, access expiry, cash payment, monthly subscription, أفعل الكورس, طالب دفع كاش, مدة الاشتراك, تاريخ انتهاء, فتح كورس لطالب]
updated: 2026-10-20
---

Use manual enrollment when a learner paid you outside Atlas (cash at the center, for example) or when you want to give them a course. The owner and managers can do this. The learner must already be on your **Students** tab: if they aren't, the owner can [add them](doc:DOC-ORG-004) first.

## Give access to a course

1. In the academy sidebar, open **Members**, then the **Students** tab.

   ![The Students tab on the Members page](shot:team/students-tab)

2. Select the learner to open their details, then select **Enroll in a course**.

   ![The learner's details with the Enroll in a course button](shot:team/manual-enroll-drawer)

3. In **Enroll in a course**, choose the **Course**. To end access on a set day, fill in **Access expires (optional)**; leave it empty for access that doesn't expire. Then select **Enroll**.

   ![The Enroll in a course dialog with a course and an expiry date](shot:team/manual-enroll-dialog)

The message **Student enrolled** confirms it. The course appears in the learner's enrollments, and Atlas tells the learner they now have it.

## Change or remove the end date

1. In the learner's enrollments, select **Set expiry** next to the course. Choose a new day under **Expires on** and select **Save expiry**, or select **Remove expiry** for access that doesn't end.

   ![The Access expiry dialog with the Expires on date](shot:team/manual-enroll-expiry)

Access ends at the end of the chosen day. The date must be in the future.

## Revoke access

1. Select **Revoke** next to the course, choose a **Reason** (**Revoked by staff**, **Membership ended** or **Suspended**), then select **Revoke access**.

   ![The Revoke access dialog with the reason menu](shot:team/manual-enroll-revoke)

The learner loses access to that course immediately. Their progress is kept: if you enroll them in the same course again, they continue where they stopped.

> [!NOTE]
> Revoking doesn't refund anything, and the dialog says so: the order stays **Paid**. If you gave a learner their money back, use **Record refund…** on their payment in **Payments** instead: it records the refund and ends access too. See [Refunds for course purchases](doc:DOC-COM-005).

## How this counts toward your plan

A learner counts once toward your plan's student limit, as soon as they hold a course enrollment in your organization. Giving a second course to someone already counted doesn't use another place. When your plan's student limit is full, enrolling a new learner is refused. See [Plans and limits](doc:DOC-START-006).

> [!LIMITATION]
> A manual enrollment records no payment. It doesn't appear in course orders or in your sales figures. Keep your own record of cash payments.

> [!NOTE]
> You can't enroll a blocked learner. Unblock them first. The course list shows only courses the learner isn't already enrolled in.
>
> A learner who is **Pending approval** (or **Inactive** after a rejection) can be enrolled, but they can't open the course until their membership is **Active**.

## Related articles

- [How selling courses works](doc:DOC-COM-001)
- [Student list and student details](doc:DOC-ORG-009)
