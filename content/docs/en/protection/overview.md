---
id: DOC-MED-001
title: "Content protection: what Atlas does and does not do"
description: Access checks, device limits and a visible watermark deter sharing and help trace leaks. Atlas has no DRM and can't stop screen recording.
summary: >
  Atlas makes sharing your lessons harder and leaks traceable. It has no DRM
  and cannot stop screen recording or a phone camera. Every lesson request is
  checked, learners are limited to a set number of devices and one screen at a
  time, and a visible personal watermark moves over every lesson video so a
  leaked recording can be traced.
type: feature-explanation
audience: [owner, everyone]
order: 1
priority: P0
related: [DOC-MED-002, DOC-MED-003, DOC-MED-004, DOC-MED-005, DOC-FAQ-003]
keywords: [content protection, piracy, leak, screen recording, watermark, drm, share account, منع تسريب الفيديوهات, حماية الكورسات, تسجيل الشاشة, العلامة المائية, مشاركة الحساب]
updated: 2026-10-20
---

## The short answer

Atlas **deters** sharing and helps you **trace** a leak. It does not make
copying impossible. There is no DRM, and nothing in Atlas can stop a learner
from recording the screen or filming it with a phone. What Atlas does is
make account sharing inconvenient, put each learner's own code on every
video they watch, and let Atlas trace a leaked recording back to the account
that watched it.

## What Atlas does

| Layer | What it does |
|---|---|
| **Access check** | Every time a lesson opens, Atlas checks that the learner is signed in, belongs to your academy and isn't blocked, is enrolled with access that hasn't ended, that the course and lesson are published, and that the lesson isn't still locked. Free preview lessons are the exception: anyone can open them. |
| **Device limit** | Each learner can use a limited number of browsers at your academy. See [Device limits](doc:DOC-MED-003). |
| **One screen at a time** | A learner's lessons play on one device at a time. Opening a lesson elsewhere asks to move playback there. |
| **Forensic watermark** | A visible label with the learner's personal code and a masked hint of their account moves over every lesson video, with a faint pattern of the code across the whole picture. It is always on. See [The forensic watermark explained](doc:DOC-MED-002). |
| **Player protections** | The player has no download button, blocks picture-in-picture and casting to another screen, keeps the watermark in full screen, and pauses playback if the watermark is hidden or removed. |

Learners see this too. Each lesson has a small panel, **What is actually
protecting this lesson**, that tells them which measures apply and that
nothing there stops screen recording.

![The Video protection card in Academy Settings, showing the watermark and player protections as always on](shot:protection/settings-video-protection)

> [!LIMITATION]
> What content protection does **not** do:
>
> - It has **no DRM**, and it **cannot stop screen recording**, screenshots or
>   a phone camera pointed at the screen. The watermark is visible on purpose
>   so that a recording carries the learner's code.
> - It can't stop a determined person who controls their own browser from
>   removing the watermark. Atlas pauses playback and is notified when that
>   happens, but it can't make it impossible.
> - **YouTube lessons:** the watermark is drawn over your academy's player, but
>   an enrolled learner can find a lesson's YouTube link and watch the video on
>   YouTube, on any device, with no watermark and outside the device limit. The
>   YouTube video itself is protected only by YouTube's own settings.
> - **Link lessons** open other websites; Atlas protects nothing behind the link.
> - In some Firefox versions the browser's own picture-in-picture button can
>   show the video in a floating window without the watermark.
> - Device limits don't stop two people taking turns on the same devices.

## Your videos today

Video lessons on Atlas are YouTube videos (or links to other sites). Atlas
draws the watermark over the YouTube player and checks access before the
lesson opens, but the video itself stays on YouTube. A lesson needs a Public
or Unlisted YouTube video. An Unlisted video doesn't appear in YouTube
search, but anyone who has its link can still watch it
([Add a YouTube video lesson](doc:DOC-LRN-006)).

## If a video leaks

Read the watermark code in the leaked copy and send it to Atlas support.
Atlas can trace the code to the account and sign-in it was issued to; your
academy can't look codes up itself. Then you decide what to do with that
learner. Full steps: [If your content leaks](doc:DOC-MED-005).

## Offline

Videos never play offline and are never saved on a learner's device.

## Who controls protection settings

Only the academy owner can open the **Content protection** settings. The
watermark and the player protections are always on and can't be switched
off; the owner can set how many devices each learner may use
([Content protection settings](doc:DOC-MED-004)).

## FAQ

**Can students record my videos?** Yes. Nothing on the web can stop screen
recording. The visible watermark puts the learner's code into any recording,
which helps trace it.

**Can students share the YouTube link?** A determined student can copy it and
watch on YouTube, where there is no watermark.

**Can two students share one account?** The device limit and one-screen rule
make it inconvenient, not impossible. Watch the
[Sharing signals report](doc:DOC-MED-006) for repeated refusals.

**Can students download videos?** The player offers no download option.
Screen recording is still possible.
