---
id: DOC-TRB-004
title: A lesson won't open or play
description: Why an Atlas lesson won't open or play, by the message you see, from no content or an unavailable YouTube video to a locked lesson or ended access.
summary: >
  The message in the player tells you the cause. Some you fix yourself (try
  again, finish the earlier lesson, free a device). Some only the academy can
  fix: a lesson with nothing added yet, a YouTube video that isn't public or
  doesn't allow embedding, or a course or lesson that isn't published.
type: troubleshooting
audience: [learner, owner]
order: 3
priority: P0
related: [DOC-TRB-003, DOC-COM-011, DOC-LRN-006, DOC-LRN-005, DOC-LRN-011]
keywords: [lesson not opening, video not playing, youtube, locked lesson, no content, course not showing, الفيديو مش شغال, الدرس مش بيفتح, الدرس مقفول, يوتيوب, الكورس مش ظاهر]
updated: 2026-10-20
---

## Symptom

You open a lesson and, instead of the video or link, the player shows a message. Or the course or lesson you expect isn't in the list at all.

## Why it happens

Find the message you see:

| Message | What it means | Who fixes it |
|---|---|---|
| "This lesson has no content yet" | The academy hasn't added a video, link or file to this lesson. It isn't a fault on your side. | The academy |
| "This YouTube video can’t be played here. It may have been removed, made private, or its owner doesn’t allow it to be embedded." | The YouTube video's own settings block playing it inside Atlas. | The academy |
| "The video couldn’t be loaded. Check your connection and try again." | The video didn't arrive, usually a weak connection. | You: **Try again** |
| "This video could not be played on this device. Try another browser, and tell the academy if it keeps happening." | This browser can't play the video. | You: another browser |
| "This lesson’s link has expired" | Lesson links are short-lived on purpose. | You: **Try again** |
| "This video couldn’t be prepared securely right now. Please try again in a moment." | The video plays only with its watermark, and it couldn't be prepared this time. | You: try again in a moment |
| "Too many requests" | You opened content very quickly, one after the other. | You: wait a moment |
| "We could not reach the academy" | No connection to the server. Nothing you did is lost. | You: check the connection |
| "Please sign in again" | Your session ended. | You: sign in to the academy again |
| "This activity is locked" | The course is set to go in order: finish the item before it first. | You |
| "Your access to this course has ended" | Your enrolment ended or was removed. | The academy |
| "This activity cannot be opened" | It may have been unpublished, or it isn't part of your enrolment. | The academy |
| "This activity has not opened yet" | The academy scheduled it for a later date. | Wait for the date |
| "You have reached your device limit" or "You are already learning on another device" | See ["Device limit reached"](doc:DOC-TRB-003). | You |

If the course itself is missing, or says "You are not enrolled in this course", either your payment is still being reviewed (see [Payment proof pending or rejected](doc:DOC-TRB-008)) or the course isn't published yet. Learners only see published courses and published lessons.

## Fix

### For learners

1. Open the course outline from **My Courses**. Each lesson shows its state and, when something is locked, why.

   ![A learner's course outline with lessons and their states](shot:troubleshooting/learner-course-outline)

2. If the message has **Try again**, choose it once. If it says the item is locked, finish the item before it.
3. If the message says the academy must act (no content, YouTube video unavailable, access ended), contact your academy and tell them the lesson name and the exact message.

### For owners and managers: a lesson with no content or a YouTube video that won't play

Owners, managers and instructors assigned to the course can edit lessons.

1. Open the course's **Course Builder**, then open the lesson's actions menu (the three dots on its row) and choose **Edit lesson**.

   ![The Course Builder with a lesson's actions menu open and Edit lesson highlighted](shot:troubleshooting/builder-lesson-menu)

2. Under **Content Type**, choose **Video** and paste the YouTube link in **Content URL**. The video must be Public or Unlisted on YouTube and allow embedding: private and members-only videos won't play for learners.

   ![The Edit Lesson dialog with the Content Type field highlighted](shot:troubleshooting/lesson-dialog-content)

3. Make sure **Availability** is **Published**, then choose **Save Lesson**.
4. Open the lesson as a learner would to check it plays.

> [!NOTE]
> If a YouTube video stopped playing after it worked, check it on YouTube first: it may have been deleted, made private, or had embedding turned off.

### For owners and managers: the course isn't visible

A course in **Draft** isn't visible to learners. Owners and managers publish it.

1. Open the course's settings and, under **Publishing**, choose **Publish Course**.

   ![Course settings with the Publish Course button highlighted](shot:troubleshooting/course-settings-publish)

2. If Atlas lists items under "Before you can publish:", fix those first. "Learners only see published items", so publish at least one lesson, quiz or assignment.

## Still stuck?

- **Learners:** contact your academy (in My Learn, choose **Contact your academy**) with the course, the lesson and the exact message.
- **Academy staff:** open a ticket from **Support** ([open Support](app:/dashboard/support)). See [Getting help](category:support).

Related: [Courses, quizzes and certificates](category:courses).
