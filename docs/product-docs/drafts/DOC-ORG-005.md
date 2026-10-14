---
doc_id: DOC-ORG-005
b0_record: B0-ORG-06
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "Choose who can join: open, approval or invite-only"
url_en: /docs/team/registration-policy
url_ar: /ar/docs/team/registration-policy
audience: Owner
feature_ids: [ORG-3.2, ORG-3.3, ORG-3.4]
security_review: pending (SR)
screenshots: pending (SS-081, DG-011)
---

# Choose who can join: open, approval or invite-only

In **Academy Settings → Registration**, the academy owner chooses how new
learners get onto the academy website: **Open** (anyone can sign up and start
learning), **Approval required** (each new sign-up waits until you approve it)
or **Invite only** (only someone with a valid invite link can register). You
can change it at any time; learners who are already waiting stay in your
approval list.

## The three options

| Option | What a new learner gets | What you do |
|---|---|---|
| **Open** | They create an account on your academy website and can start learning straight away. Someone who already has an Atlas account and signs in on your website is added too. | Nothing. |
| **Approval required** | They can sign up, but their membership shows as waiting: "Your membership is awaiting approval". They cannot open courses until you approve them. | Approve or reject each one on the **Students** tab. |
| **Invite only** | They can register only with a valid invite link. A link made for one email address works only for that address. | Create invite links and send them (see "Invite learners with invite links"). |

## Change the policy

1. Open **Academy Settings** and scroll to **Registration**.
2. Under **Registration policy**, choose **Open**, **Approval required** or
   **Invite only**.
3. Select **Save policy**. "Registration policy updated" confirms it.
4. To check it, open your academy website's sign-up page in a private window
   and try to register.

## How invite links behave under each policy

Invite links are needed only when the policy is **Invite only**. With **Open**
or **Approval required**, learners register without a link, and with
**Approval required** an invite link does not skip approval: the new learner
still waits for you.

## What happens to learners who are already waiting

Changing the policy does not admit, remove or reject anyone automatically.

- Learners who were waiting under **Approval required** keep waiting after you
  switch to **Open** or **Invite only**. They stay on the **Students** tab
  as "Pending approval".
- Signing in again does not let them in. Under **Open**, only people who are
  not yet in your academy are added when they sign in; someone already
  waiting stays waiting.
- You can still approve or reject them after the change. **Approve** gives
  them access ("You've been approved"); **Reject** turns them away.

So after you switch away from **Approval required**, go to **Members**, open the
**Students** tab, look for "Pending approval", and approve or reject each
learner who is still waiting.

Learners who were already active are not affected by any policy change.

## Who can change it

Only the account owner can change the registration policy. Anyone else sees
"Only the account owner can change the registration policy."

## Related pages

- Invite learners with invite links (DOC-ORG-006)
- Approve or reject learners (DOC-ORG-007)
- Block a learner (DOC-ORG-008)
- Sign up and join an academy, for learners (DOC-LRN-030)
- A learner can't join the academy (DOC-TRB-014)

---

## Arabic (for native review, RV-14)

- Title direction: «حدّد من يمكنه الانضمام: مفتوح أو بموافقة أو بدعوة»
- UI labels to quote on the AR page (from the AR UI):
  «التسجيل» (`academy:registration.sectionTitle`), «سياسة التسجيل»
  (`academy:registration.policy.title`), «مفتوح» / «يتطلب موافقة» /
  «بدعوة فقط» (`academy:registration.policy.options.*.label`), «حفظ السياسة»
  (`academy:registration.policy.save`), «بانتظار الموافقة»
  (`academy:students.status.pending`), «الموافقة» / «الرفض»
  (`academy:students.actions.approve` / `.reject`).
- Draft sentence for the new section (needs native review): «تغيير سياسة
  التسجيل لا يقبل أحدًا ولا يرفضه تلقائيًا. المتعلمون الذين ينتظرون الموافقة
  يبقون في تبويب «الطلاب» بحالة «بانتظار الموافقة» حتى توافق عليهم أو
  ترفضهم، حتى بعد التحويل إلى «مفتوح» أو «بدعوة فقط».»
- AR UI inconsistency for the reviewer: `academy:registration.invites.description`
  writes «بالدعوة فقط» and «يتطلب الموافقة», while the option labels are
  «بدعوة فقط» and «يتطلب موافقة». The AR page should use the option labels.

## Reviewer notes (not for publication)

Verified behaviour (file:line):

- Admission by policy: `atlas-backend/src/identity/services/academy-surface.service.ts`
  L185–L212 (`open` → active, `approval` → pending, `invite` → token
  required and claimed).
- Policy change only updates the academy row and writes one audit row:
  `atlas-backend/src/learning/services/academy-students.service.ts`
  L902–L944 (`updateRegistrationPolicy`). No change to `academy_students`.
- Approve and reject depend only on the row being pending, not on the policy:
  same file L384–L432 (`errors.academy.studentNotPending` otherwise).
- Sign-in on an Open academy admits only people with no membership row; a
  pending learner already has one and signs in as they are:
  `atlas-backend/src/identity/services/auth.service.ts` L1645–L1660.
- Owner-only change: `assertCanManageSecurityPolicy` call at
  `academy-students.service.ts` L913.
- Test that pins it: `atlas-backend/test/registration-policy-pending-learners.e2e-spec.ts`
  (approval → open and approval → invite: waiting learners stay pending,
  then approve → active and reject → inactive).
- Learner-side wording: `atlas` `learning:myLearning.pendingApproval.title`.

Open items before publication: staging reproduction by a non-author (AT-1),
screenshots, SR, and the RV-14 Arabic review. The brief's V-03 conflict is
already resolved in the UI: `academy:registration.invites.description` now
states the real invite behaviour.
