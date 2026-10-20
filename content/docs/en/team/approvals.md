---
id: DOC-ORG-007
title: Approve pending learners
description: When registration needs approval, new learners wait as Pending approval on the Students tab. Approve them, or reject and approve them later if you change your mind.
summary: >
  When your registration policy is Approval required, every new sign-up waits
  as Pending approval on the Members page, Students tab. Open the learner and
  select Approve to let them in, or Reject to refuse. A rejection isn't final:
  you can approve the learner later, and they can register again. The owner
  and managers can do this, and the learner is told.
type: step-by-step
audience: [owner, manager]
order: 7
priority: P1
related: [DOC-ORG-005, DOC-ORG-009, DOC-ORG-008, DOC-MSG-001, DOC-TRB-014]
keywords: [approve student, pending approval, registration request, reject, undo reject, register again, الموافقة على طالب, طلب انضمام, طالب مستني موافقة, رفض, أرجع طالب رفضته]
updated: 2026-10-20
---

If your [registration policy](doc:DOC-ORG-005) is **Approval required**, nobody gets into the academy until you approve them. The owner and managers can approve or reject. After signing up, the learner sees that their request to join was sent and that they can sign in once the academy approves it.

## Approve a learner

1. In the academy sidebar, open **Members**, then the **Students** tab.

   ![The Students tab on the Members page](shot:team/students-tab)

2. Open **Filter by status** and choose **Pending approval**.

   ![The status filter set to Pending approval](shot:team/students-filter-pending)

3. Select the learner to open their details, then select **Approve**.

   ![The learner's details with the Approve button](shot:team/approve-drawer)

The message **Student approved** confirms it. The learner's status becomes **Active** and they can open their courses. Until then, a pending learner who signs in only sees that their membership is awaiting approval.

## Reject a registration

1. In the learner's details, select **Reject**, then confirm with **Reject** in **Reject this registration**.

   ![The Reject this registration confirmation](shot:team/reject-confirm)

The message **Registration rejected** confirms it. The learner isn't admitted, and their status becomes **Inactive**. They stay on your list, so you can still change your mind.

## Approve a learner you rejected

A rejection isn't final. On the **Students** tab, set **Filter by status** to **Inactive**, select the learner, then select **Approve**. Their status becomes **Active** and Atlas tells them they were approved. You can't approve a learner who is also **Blocked**: [unblock them](doc:DOC-ORG-008) first.

## If the learner registers again

A rejected learner can sign up again on your academy website with the same account (they enter the password they already use). Their new request follows your registration policy at that moment:

- **Approval required**: they wait as **Pending approval** again, and your team gets a new notification.
- **Open**: they are admitted straight away.
- **Invite only**: they need a valid invite link, like anyone else.

A learner you blocked can't come back this way. See [Block or unblock a learner](doc:DOC-ORG-008).

## What the learner is told

Atlas tells the learner when you approve or reject their registration. Staff also get a notification when someone is waiting for approval. See [Notifications](doc:DOC-MSG-001).

> [!NOTE]
> An invite link doesn't skip approval. With **Approval required**, learners who sign up through a link wait too.

## Related articles

- [Student list and student details](doc:DOC-ORG-009)
- [A learner can't join the academy](doc:DOC-TRB-014)
