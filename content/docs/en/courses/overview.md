---
id: DOC-LRN-001
title: Courses overview
description: How an Atlas course is built, which lesson types work, how learners move through it, and who can create, build and grade courses.
summary: >
  An Atlas course is made of units (sections). Each unit holds lessons, quizzes
  and assignments in the order you set. Lessons are YouTube videos, files or
  links. Learners open items in order, the course completes by the rule you
  choose, and a certificate can be issued automatically. Owners and managers
  create courses; assigned instructors build and grade them.
type: feature-explanation
audience: [owner, manager, instructor]
order: 1
priority: P0
related: [DOC-LRN-002, DOC-LRN-005, DOC-LRN-014, DOC-ROLE-005, DOC-FAQ-001]
keywords: [course, curriculum, lessons, كورس, كورسات, منهج, دروس, اعمل كورس, quiz, assignment, certificate]
updated: 2026-10-20
---

Courses are where you teach. You build each course once, decide who can see it and whether it is free or paid, then publish it so learners can enroll from your academy site.

## The parts of a course

A course has:

- **Course details**: title, web address, short and full description, image, level, languages, what learners will achieve, requirements, visibility and price.
- **Units**: groups of content. The Course Builder calls them **sections**; the course wizard calls them **units**. They are the same thing.
- **Items inside each unit**: lessons, quizzes and assignments, in one order that you control.
- **A completion rule and an optional certificate**, set on **Course Settings**.

All your courses are listed on **Courses** in the academy sidebar, with their status (**Draft** or **Published**), visibility and price.

![The Courses page listing the academy's courses with status, visibility and pricing](shot:courses/course-list)

## What a lesson can contain

When you add a lesson you choose a **Content Type**:

| Content Type | What you add | What learners get |
|---|---|---|
| **Video** | A YouTube link to a Public or Unlisted video that allows embedding | The video plays inside the lesson, with the learner's personal watermark over it |
| **File** | A PDF or image you upload (owners and managers) | A personal link that only enrolled learners can open, and that expires shortly after it is issued |
| **Video** or **File** with any other link | A Vimeo, Google Drive or other web address | A card that opens the link in a new tab, outside the academy |

Video lessons use YouTube links: Atlas doesn't store your video files, so the video itself stays on YouTube. See [Add a YouTube video lesson](doc:DOC-LRN-006) and [Add a link lesson](doc:DOC-LRN-007).

> [!LIMITATION]
> Someone who gets a lesson's YouTube link can watch it on YouTube, where there is no watermark. A link to another website opens outside the academy, and none of the academy's protections apply to it.

## Quizzes and assignments

- **Quizzes** have five question types (single choice, multiple choice, true/false, short answer and essay). Atlas grades them automatically, except essays, which a reviewer grades. You can start from the **Practice** or **Exam** preset and set time limits, attempts, results and integrity. See [Create a quiz](doc:DOC-LRN-014).
- **Assignments** let learners write an answer and attach a file. You grade each submission out of 100 and can leave feedback. See [Assignments](doc:DOC-LRN-019).

A course can also be made of quizzes only, with no lessons at all.

## How learners move through a course

- Learners only see items whose status is **Published**.
- Items open in order. The next item unlocks when the one before it is finished: a lesson marked complete or an assignment submitted. A quiz only holds learners back when it is set as **Required to continue**; then it must be passed.
- Learners finish a lesson themselves with **Mark complete**. Watching on YouTube is not tracked.
- The progress percentage counts finished items out of all published lessons, quizzes and assignments.

## When a course counts as complete

By default a learner completes a course when every published lesson is complete, and every quiz and assignment marked as required is passed or graded. In a course with no lessons, where nothing is marked as required, every published quiz must be passed and every published assignment graded. You can change the rule and switch on automatic certificates in [Completion rules and learner progress](doc:DOC-LRN-013) and [Certificates](doc:DOC-LRN-020).

## Who can do what

| Task | Owner | Manager | Assigned instructor |
|---|---|---|---|
| Create a course, edit its details and price | Yes | Yes | No |
| Publish or unpublish, set completion and certificates | Yes | Yes | No |
| Assign instructors to a course | Yes | Yes | No |
| Build the curriculum (sections and lessons) | Yes | Yes | Yes, for their courses |
| Create quizzes and assignments, grade, give quiz exceptions | Yes | Yes | Yes, for their courses |
| Moderate course reviews | Yes | Yes | Yes, for their courses |
| Upload a lesson file, design the certificate template | Yes | Yes | No |

An instructor sees only the courses they are assigned to, in the **Teaching Dashboard**. See [Assign instructors](doc:DOC-LRN-012) and [Your teaching dashboard](doc:DOC-LRN-024).

## Free and paid courses

Each course is **Free** or **Paid**, priced in Egyptian pounds (EGP). Learners enroll in a free course directly from its page. For a paid course they pay with the academy's payment methods and upload a proof, and the academy owner approves it. Owners and managers can also give a learner access to any course without a purchase. See [Set a course price](doc:DOC-LRN-003), [Selling and payments](category:selling) and [Team and learners](category:team).

## Where to go next

- [Create a course with the guided wizard](doc:DOC-LRN-002)
- [Build your curriculum](doc:DOC-LRN-005)
- [Publish your course](doc:DOC-LRN-011)
