---
doc_id: DOC-ORG-003
b0_record: B0-ORG-07
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "Remove a staff member"
url_en: /docs/team/remove-staff
url_ar: /ar/docs/team/remove-staff
audience: Owner
feature_ids: [ORG-2.6]
security_review: pending (SR)
screenshots: pending (SS-079)
---

# Remove a staff member

On the **Members** page, the organization owner selects **Remove** next to a
manager or instructor and confirms. From their next action they can no longer
open anything in this academy, the courses they taught here are taken off
them, and their Atlas account is kept. You can add them back later.

## Remove someone

1. Open **Members** and stay on the **Team** tab. The **Remove** button is
   shown only to the organization owner.
2. Select **Remove** next to the person. **Remove this team member?** opens.
3. Select **Remove from academy**. "{{name}} was removed from the academy."
   confirms it.

## What happens

- **Their access to this academy stops at their next action.** Atlas checks
  team membership on every request, so the first thing they do after you
  remove them (opening a page, saving, loading data) is refused.
- **They are not signed out.** Removing someone does not end their sessions,
  because the same sign-in may also be their access to other organizations.
  A page they already had open can keep showing what it had loaded until
  they do something; nothing new loads and nothing can be saved.
- **Their course assignments in this academy are removed.** Assignments in
  your other academies are not touched.
- **If this was the last academy they worked in for your organization**, their
  access to the organization ends too. If they still work in another of your
  academies, they keep that.
- **Their account is not deleted.** Their history in the activity log stays.
  On the Team tab they show as inactive.

## Adding them back

Add them again from the **Members** page. Atlas reuses their earlier team
membership instead of creating a new one.

## What you can't do

- Remove the organization owner. Nobody can, including the owner.
- Remove yourself.
- Change someone's role. To give a person a different role, remove them and
  add them again with the new role.
- Managers cannot remove anyone. Only the organization owner can.
- Students are not removed here. Use the learner actions on the **Students**
  tab (for example, block or revoke access).

## Related pages

- Add a manager or instructor (DOC-ORG-002)
- Assign instructors to a course (DOC-LRN-012)
- Team roles (DOC-ROLE-005)

---

## Arabic (for native review, RV-14)

- Title direction: «أزِل عضوًا من الفريق»
- UI labels to quote on the AR page: «إزالة» (`academy:members.remove.action`),
  «إزالة عضو الفريق هذا؟» (`academy:members.remove.title`), «إزالة من
  الأكاديمية» (`academy:members.remove.confirm`), «الفريق»
  (`academy:members.tabs.team`).
- Draft sentence for the session behaviour (needs native review): «لا تُنهي
  الإزالة جلسات تسجيل الدخول، لكن أي إجراء يقوم به بعد الإزالة يُرفض فورًا.
  قد تبقى صفحة مفتوحة لديه تعرض ما حُمِّل سابقًا إلى أن يقوم بأي إجراء.»

## Reviewer notes (not for publication)

Verified behaviour (file:line):

- Removal: `atlas-backend/src/academy/services/academies.service.ts`
  L1478–L1599 (`removeStaffMember`): organization owner only (L1519); the
  owner cannot be removed (L1527–L1531, `errors.academy.cannotRemoveOrganizationOwner`);
  academy row set to inactive, not deleted (L1546); this academy's
  `course_instructors` rows deleted (L1553); organization membership
  deleted only when no other active staff row remains (L1556–L1570); one
  `academy.member.removed` audit row (L1576–L1592); usage recompute (L1598).
- Adding back: an inactive row is reactivated with the role chosen in the
  add dialog, same file L1388–L1425.
- Sessions are deliberately not revoked, and authorization is re-read on
  every request: comment at L1501–L1507.
- Test: `atlas-backend/test/academy-owner-only-administration.e2e-spec.ts`
  L267 (same access token, next request refused with 403/404), L341
  (manager loses access at once), L356 onward (staff of a second academy
  keep it), L413 (re-adding reactivates the same row).
- Frontend: Remove shown only to the organization owner and never for the
  owner row, inactive rows or yourself, `atlas/src/features/academy/pages/AcademyMembersPage.tsx`
  L79, L192–L204. Cached data: queries are not refetched on window focus,
  `atlas/src/services/query/query-client.ts` L67.

Not verified here: the exact screen a removed member sees on their next
action (an access error; the wording depends on the page). The "remove and
add again to change a role" advice follows from the absence of a role-change
action plus the reactivation path above; confirm it is the advice the owner
wants (CF-13).
