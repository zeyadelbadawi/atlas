---
id: DOC-LRN-006
title: Add a YouTube video lesson
description: Paste a YouTube link as a lesson, check what learners see, and understand the limit that the YouTube link itself can be copied.
summary: >
  To add a video lesson, choose Add content then Add Lesson in the Course
  Builder, keep Content Type on Video and paste a YouTube link to a Public or
  Unlisted video that allows embedding. The dialog shows YouTube video
  detected. Learners watch it inside the lesson with their personal watermark,
  but the video stays on YouTube and its link can be copied out.
type: step-by-step
audience: [owner, manager, instructor]
order: 6
priority: P0
related: [DOC-LRN-005, DOC-LRN-007, DOC-MED-001, DOC-MED-002, DOC-TRB-004]
keywords: [youtube lesson, video lesson, unlisted video, يوتيوب, فيديو يوتيوب, درس فيديو, لينك يوتيوب, فيديو غير مدرج, watermark, علامة مائية]
updated: 2026-10-20
---

Video lessons in Atlas use YouTube links. Owners, managers and the course's assigned instructors can add them in the Course Builder.

## Before you start: your YouTube settings

- Upload the video to YouTube and set it to **Public** or **Unlisted**. Unlisted keeps it out of YouTube search.
- Make sure the video allows embedding.
- Private and members-only YouTube videos won't play for your learners.

## Add the lesson

1. In the Course Builder, find the unit, choose **Add content**, then **Add Lesson**.

   ![The Add content menu with Add Lesson highlighted](shot:courses/add-content-menu)

2. Enter the **Lesson Title**. **Content Type** is already **Video**: a new lesson starts as a video.

   ![The Add Lesson dialog with Video chosen as the content type](shot:courses/lesson-type-video)

3. Paste the YouTube link into **Content URL**. Links from youtube.com and youtu.be work, including Shorts and links with a start time. When the link is recognized, the dialog shows **YouTube video detected**. If the link is broken, you'll see a message asking you to check it.

   ![The Add Lesson dialog showing YouTube video detected under the content URL](shot:courses/lesson-youtube-detected)

4. Open **Availability**, choose **Published** when the lesson is ready for learners (or keep **Draft**), then choose **Save Lesson**.

   ![The Availability list with Published highlighted](shot:courses/lesson-availability)

5. Check the lesson as a learner would see it. The video plays inside the lesson, with a notice that it is hosted on YouTube.

   ![A learner's YouTube lesson with the notice that the video is hosted on YouTube](shot:courses/learner-youtube-lesson)

## What learners see

- The video plays inside the lesson page, with the learner's personal watermark shown over it.
- A notice explains that the video is hosted on YouTube, that YouTube's own player is outside the academy's control, and that watching is not tracked.
- Learners finish the lesson with **Mark complete**. Atlas can't see how much of a YouTube video someone watched.

> [!LIMITATION]
> The watermark and the academy's protections deter sharing; they don't stop it. The video itself stays on YouTube: someone who gets its link, for example from the page source or browser tools, can watch it on YouTube, where there is no watermark and no device limit. Don't rely on Unlisted as a lock.

To learn what the watermark and device limits do and don't do, see [Content protection and media](category:protection).

## If the video won't play

- Check that the video is Public or Unlisted and allows embedding.
- Open the lesson and check the link in **Content URL**. A link that isn't recognized as YouTube opens as an outside link instead of playing in the lesson.

## Related

- [Build your curriculum](doc:DOC-LRN-005)
- [Add a link lesson](doc:DOC-LRN-007)
- [Completion rules and learner progress](doc:DOC-LRN-013)
