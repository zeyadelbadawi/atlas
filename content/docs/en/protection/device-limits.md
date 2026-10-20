---
id: DOC-MED-003
title: Device limits and one-screen-at-a-time viewing
description: How many browsers a learner can use, what happens on a new device or a second screen, who sets the limit, and what these rules can't prevent.
summary: >
  Two rules make sharing one learner account inconvenient. Each learner can
  use a limited number of devices at your academy, and their lessons play on
  one device at a time. A device is a browser Atlas recognises by its own
  cookie, not a fingerprint. Only the learner can remove a device, and these
  rules don't stop screen recording.
type: feature-explanation
audience: [owner, learner]
order: 3
priority: P0
related: [DOC-MED-001, DOC-MED-004, DOC-MED-010, DOC-MED-006, DOC-TRB-003]
keywords: [device limit, account sharing, concurrent sessions, one screen, devices per learner, منع مشاركة الحساب, عدد الأجهزة المسموح بها, جهازين, طالبين على حساب واحد]
updated: 2026-10-20
---

## The two rules

1. **Device limit.** Each learner can learn on a limited number of devices at
   your academy. When they open a lesson on one device too many, the lesson
   is refused until they remove an old device.
2. **One screen at a time.** A learner's lessons play on one device at a
   time. Opening a lesson on a second device asks to move playback there.

## What counts as a device

A device is a **browser** where the learner has signed in or learned at your academy:
Chrome on a laptop and Safari on a phone are two devices. Atlas recognises a
browser by a random value it stores in that browser (a cookie). It does not
fingerprint the device. So a new browser, a private window, or a browser
where the learner cleared the site's data counts as a new device and takes a
slot. Devices are counted per academy.

Learners see their devices in My Learn, labelled like "Chrome on Android".

![A learner's Devices page in My Learn](shot:for-learners/devices-page)

## When a learner reaches the limit

Signing in still works, and the learner can still see their courses,
progress, purchases and profile. Only lessons are refused, with
"You have reached your device limit". The learner removes a device they no
longer use, from that message or from **Devices**
([Manage your devices](doc:DOC-MED-010)). They also get an in-app
notification.

## Watching on a second screen

If a learner opens a lesson while another of their devices is learning, they
see "You are already learning on another device" with **Continue here** and
**Keep learning there**. Choosing **Continue here** ends the other session;
that device pauses with "Paused — you started learning on another device".
Nothing is lost. If a device simply stops (a closed laptop, a dropped
connection), its hold expires on its own after a short while.

## Who sets the limit

The academy owner sets **Devices per learner** in
[Content protection settings](doc:DOC-MED-004), from 1 up to the platform
maximum shown on that page. Until the owner sets it, the academy uses the
platform's default, and the page says so. The
**Concurrent sessions** number is shown to learners, but lessons always play
on one device at a time.

Lowering the limit also applies to devices learners already registered:
a learner over the new limit is refused on their most recently added
devices until they remove one.

![The Learner devices card in Content protection settings](shot:protection/settings-devices)

> [!LIMITATION]
> What device limits do **not** do:
>
> - Academy staff **can't see, reset or remove** a learner's devices. Only the
>   learner can, from their **Devices** page. Point learners to
>   [Manage your devices](doc:DOC-MED-010).
> - They don't stop two people from taking turns on the same devices, and they
>   don't stop screen recording or filming.
> - If Atlas's session service is briefly unavailable, lessons keep playing and
>   the one-screen rule isn't enforced during that time.
> - Clearing browser data or using a new browser uses up a slot; it is not a
>   sign of cheating on its own.

## FAQ

**Can the academy reset my devices?** No. Remove a device yourself on the
**Devices** page in My Learn.

**Can I watch on my phone and laptop at the same time?** You can be signed in
on both (within your device limit), but lessons play on one of them at a
time.

**How do I spot shared accounts?** Repeated "device limit" and "another
session" refusals for one learner appear in the
[Sharing signals report](doc:DOC-MED-006).
