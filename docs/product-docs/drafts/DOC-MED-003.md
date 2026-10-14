---
doc_id: DOC-MED-003
b0_record: B0-MED-10
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "Device limits and one screen at a time"
url_en: /docs/protection/device-limits
url_ar: /ar/docs/protection/device-limits
audience: Owner, Learner
feature_ids: [MED-6.1, MED-6.2, MED-6.4, MED-6.5, IAM-8]
security_review: pending (SR)
screenshots: pending (SS-062, SS-NEW-08, DG-NEW-02)
---

# Device limits and one screen at a time

Two rules make sharing one learner account inconvenient. First, each learner
can learn on a limited number of browsers, set by the academy. Second,
lessons play on one device at a time: opening a lesson on a second device
asks the learner to move playback there. Neither rule ever stops a learner
signing in or removes their progress.

## The two rules in one paragraph

**Device slots** limit how many browsers a learner can keep for learning at
one academy. **One screen at a time** means only one of those browsers plays
lessons at any moment. A learner with two slots can keep a phone and a
laptop, but watches on one of them at a time.

## What counts as a device

A device is a browser in which the learner signed in to the academy. Atlas
stores a small cookie of its own in that browser and recognises it by that
cookie. It does not fingerprint the phone or computer.

| The learner… | Counts as |
|---|---|
| Signs out and back in on the same browser | The same device |
| Opens the course in several tabs | The same device |
| Uses another browser on the same phone or computer | A new device |
| Clears the browser's cookies or site data | A new device; the old entry stays listed until removed |
| Uses a private or incognito window | A new device each time the window is opened fresh |
| Learns at a second academy | Counted separately at each academy |

Old devices are not removed automatically. The learner removes them on their
**Devices** page.

## When a learner reaches the device limit

Signing in still works. Lessons do not open in the new browser, and the
learner sees "You have reached your device limit" with **Manage your
devices**. They remove a browser they no longer use and reopen the lesson
(see "You have reached your device limit", DOC-TRB-003).

## Watching on a second screen: "Continue here"

Opening a lesson while another device is in a learning session shows "You are
already learning on another device". **Continue here** moves playback to the
new device and pauses the other one ("Paused — you started learning on
another device"); **Keep learning there** leaves it where it is. Nothing is
lost either way.

## Who sets the limit

The academy owner sets **Devices per learner** in **Academy Settings →
Content protection → Learner devices**, up to the maximum the platform allows
(shown on that page). Lowering it also applies to devices learners have
already registered.

## What the academy cannot do

Academy staff cannot remove or reset a learner's devices. Only the learner
can, from **Devices** in My Learning.

## What these rules cannot prevent

They make account sharing inconvenient, not impossible. They do not stop two
people taking turns on the same browser, or someone recording the screen.

## FAQ

**Can the academy reset my devices?** No. Remove a device yourself on your
**Devices** page.

**Can I watch on my phone and laptop at the same time?** You can keep both
as devices, but lessons play on one of them at a time.

## Related pages

- You have reached your device limit (DOC-TRB-003)
- Content protection settings (DOC-MED-004)
- Manage your devices (DOC-MED-010)

---

## Arabic (for native review, RV-14)

- Title direction: «حدود الأجهزة والمشاهدة على شاشة واحدة في كل مرة»
- UI labels to quote: «أجهزة المتعلمين» (`academy:protection.devices.title`),
  «وصلت إلى الحد الأقصى لأجهزتك» (`learning:player.deviceLimit.title`),
  «تابع من هنا» / «أكمل هناك» (`learning:player.takeover.confirm` /
  `.cancel`), «الأجهزة» (`learning:learnerDashboard.nav.devices`).
- The "What counts as a device" table needs an AR version reviewed by a
  native editor; reuse the wording reviewed for DOC-TRB-003.

## Reviewer notes (not for publication)

Same evidence as DOC-TRB-003 (B0-MED-10): `atlas-backend/src/tenancy/services/student-device.service.ts`
L1–L40; `atlas-backend/test/device-identity-lifecycle.e2e-spec.ts` DV-01
(L222), DV-02 (L247), DV-03 (L261), DV-04 (L282), DV-05 (L296),
DV-06 (L315), DV-10 (L448); `atlas-backend/src/tenancy/services/access-policy.service.ts`
L1–L80; setting card `atlas/src/features/academy/components/DevicePolicyCard.tsx`
(rendered in `AcademySettingsPage.tsx` L574).

Only the "What counts as a device" section and the related lines are new
B0-MED-10 content; the other sections follow the brief and still need the
usual PV staging pass (one-screen takeover, MED-6.4). The brief's "if the
session service is down, the one-screen rule is skipped" point was not
re-verified here and is left out of the draft.
