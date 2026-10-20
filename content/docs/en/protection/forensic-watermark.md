---
id: DOC-MED-002
title: The forensic watermark explained
description: A visible, personal code moves over every lesson video so a leaked recording can be traced. What it shows, what it can't do, and how long records are kept.
summary: >
  Every lesson video on Atlas shows a visible label with the viewer's
  personal code and a masked hint of their account, moving around the
  picture, plus a faint pattern of the same code over the whole video. If a
  recording leaks, Atlas can read the code and trace it to the account and
  sign-in. It deters and traces; it does not stop recording.
type: feature-explanation
audience: [owner, learner, everyone]
order: 2
priority: P0
related: [DOC-MED-001, DOC-MED-005, DOC-MED-004, DOC-SEC-004, DOC-FAQ-003]
keywords: [watermark, forensic watermark, code on video, dynamic watermark, trace leak, العلامة المائية, كود على الفيديو, علامة مائية متحركة, مين سرب الفيديو]
updated: 2026-10-20
---

## What the watermark is

The forensic watermark is a **visible** mark that Atlas's player draws over
every lesson video, including YouTube lessons and staff previews. It has two
parts:

- a readable label with the viewer's **personal code** (ten letters and
  digits in two groups of five) and a **masked hint of their account**, such
  as the first letter of their email. The label jumps to a new spot every so
  often, so a fixed crop or blur can't cover it for long;
- a very faint, slowly drifting pattern of the same code across the whole
  picture, so covering the label still leaves the code in the recording.

Each code belongs to one viewer, one sign-in and one video. Watching the same
video again in the same sign-in reuses the code; signing in again gives a new
one. The academy can't turn the watermark off: in **Content protection** it
is marked **Always on**.

![A lesson video with the About the watermark explanation open below the player](shot:protection/watermark-about)

## What it does

- **Deters sharing.** Learners see their own code on every video and know a
  recording carries it.
- **Traces a leak.** If a recording turns up somewhere, Atlas can look up the
  code and identify the account and sign-in it was issued to
  ([If your content leaks](doc:DOC-MED-005)).
- **Fails closed.** If Atlas can't issue a code, the video doesn't play.
- **Notices tampering.** If the watermark is removed, hidden, changed or
  shrunk in the browser, playback pauses with **Playback paused** and Atlas
  is notified. The learner can choose **Restore and continue**.
- **Stays in full screen.** Full screen always includes the watermark, and
  videos can't be cast to another screen or popped out into picture-in-picture.

> [!LIMITATION]
> What the watermark does **not** do:
>
> - It **doesn't stop screen recording**, screenshots or a camera filming the
>   screen. It is visible on purpose so a recording carries the code.
> - It is drawn by the browser over the video; it is **not burned into the
>   video file**. Someone who controls their own browser can still remove it.
>   Atlas pauses playback and is told, but it can't prevent it.
> - **YouTube lessons:** the watermark covers your academy's player only. A
>   copied YouTube link plays on YouTube with no watermark, and that copy
>   can't be traced.
> - Some Firefox versions show their own picture-in-picture button anyway; the
>   floating window can show the video without the watermark.
> - Tracing works only if the code can still be read in the copy. A heavily
>   cropped, blurred or low-quality recording may make it unreadable.

## Who can look up a code

Only Atlas. Your academy has no screen for it: send the code to Atlas
support. Learners are told the same thing in the player.

## Privacy: what is kept and for how long

Learners can open **About the watermark** under the video. It explains why
the code is there and says: "Atlas keeps a record of each code for up to two
years after it was last shown, as described in the privacy policy. Only Atlas
can look a code up — your academy can't."

The record links the code to the learner's name, email and phone, the
sign-in's network and device details, and the course and lesson. It is
stored encrypted, only Atlas can read it, and it is kept even if the learner
later deletes their account, so a leak can still be traced. More:
[What data Atlas keeps about learners](doc:DOC-SEC-004).

## For learners: why you see a code

The code is yours alone and appears only while you watch. It isn't an error
and you can't hide it: if it is hidden, the video pauses until it is visible
again. It exists so that a recording shared without permission can be traced
back to where it came from.

## FAQ

**Can I turn the watermark off?** No. It is always on for every academy.

**Does it identify who leaked a video?** If the code is readable in the copy,
Atlas can trace it to the account and sign-in it was issued to.

**How long is the record kept?** Up to two years after the code was last
shown.
