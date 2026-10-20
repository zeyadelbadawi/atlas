---
id: DOC-TASK-004
title: Protect your content from sharing
description: A visible per-learner watermark, device limits and one-screen viewing deter sharing and help trace leaks. What they can't stop, and what to do.
summary: >
  Atlas puts a visible watermark with each learner's personal code on lesson videos,
  limits how many devices a learner can use and plays lessons on one device at a time.
  This makes sharing an account inconvenient and helps trace a leaked recording to the
  account it came from. It does not stop screen recording. Only the owner changes these settings.
type: workflow
audience: [owner]
order: 4
priority: P0
related: [DOC-MED-001, DOC-MED-002, DOC-MED-003, DOC-MED-005, DOC-FAQ-003]
keywords: [protect videos, watermark, sharing accounts, leak, device limit, حماية الفيديوهات, علامة مائية, تسريب الكورس, مشاركة الحساب, عدد الأجهزة]
updated: 2026-10-20
---

Only the academy owner can view or change the protection settings. See
[Content protection: what Atlas does and does not do](doc:DOC-MED-001).

## Stages

1. **Check what is on automatically.** Open **Academy Settings** and go to **Content
   protection**. Under **Video protection**, the **Forensic watermark on every video** and
   the **Player protections** are always on: each learner sees their own code on the
   video, full screen keeps the watermark, and the player offers no download. See
   [The forensic watermark explained](doc:DOC-MED-002).

   ![The Content protection section in Academy Settings](shot:tasks/protect-settings)

2. **Set device limits.** Under **Learner devices**, set **Devices per learner** and
   **Concurrent sessions**, then choose **Save**. If you lower the limit, learners above
   it are refused on their newest devices until they remove one. See
   [Device limits and one-screen-at-a-time viewing](doc:DOC-MED-003).

   ![The Learner devices settings](shot:tasks/protect-devices)

3. **Tell learners where to manage their devices.** Learners see and remove their
   devices on the **Devices** page of My Learn. See [Manage your devices](doc:DOC-MED-010).

   ![A learner's Devices page in My Learn](shot:tasks/protect-learner-devices)

4. **Check the sharing signals.** Open **Reports** in the academy sidebar and look at
   **Sharing signals**. It counts lesson-access refusals: repeated refusals for one learner
   point to a shared account or too many devices. See
   [Sharing signals report](doc:DOC-MED-006).

   ![The Sharing signals section of the academy Reports](shot:tasks/protect-sharing-signals)

5. **If a recording of your course turns up somewhere**, open **Support** and send Atlas
   the code you can see in the recording. Atlas can trace it to the account and session
   it came from. Then block that learner on the **Students** tab of **Members**
   ([Block or unblock a learner](doc:DOC-ORG-008)). See
   [If your content leaks](doc:DOC-MED-005).

   ![The Support page where you open a ticket](shot:tasks/protect-support)

## Who can do each stage

| Stage | Owner | Manager |
|---|---|---|
| Content protection and device limits | Yes | No (sees that only the owner can change them) |
| Sharing signals in Reports | Yes | Yes |
| Block a learner | Yes | Yes |

> [!LIMITATION]
> These protections deter sharing and make a leaked recording traceable. They don't stop
> screen recording or someone filming the screen with a phone; no website can. Tracing
> only works when the code is readable in the copy. Lessons today play YouTube videos:
> someone who gets a video's YouTube link can watch it on YouTube, without the watermark.

More questions: [Content protection FAQ](doc:DOC-FAQ-003).
