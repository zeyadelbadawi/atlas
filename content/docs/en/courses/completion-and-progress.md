---
id: DOC-LRN-013
title: Completion rules and learner progress
description: How progress is counted, why an item is locked, when a learner completes a course, and how to set the completion rule.
summary: >
  A learner's progress is the share of published lessons, quizzes and
  assignments they have finished. Items open in order. By default a course is
  complete when every published lesson is done and the required quizzes and
  assignments are passed or graded. Owners and managers change the rule, add a
  minimum score and switch on certificates in Course Settings.
type: feature-explanation
audience: [owner, manager, instructor]
order: 10
priority: P1
related: [DOC-LRN-014, DOC-LRN-019, DOC-LRN-020, DOC-LRN-031, DOC-ANL-002]
keywords: [course completion, progress, locked lesson, completion rule, اكمال الكورس, نسبة التقدم, الدرس مقفول, شروط الاكمال, quiz only course]
updated: 2026-10-20
---

Atlas works out progress and completion on the server from what learners have actually done. Nothing is counted from a learner's own claim.

## How progress is counted

The progress percentage is the number of finished items out of all published lessons, quizzes and assignments in the course. An item counts as finished when:

- a lesson is marked complete,
- a quiz is passed, or submitted and waiting for grading,
- an assignment is submitted or graded.

Learners finish a lesson with **Mark complete**. For YouTube and link lessons, Atlas can't see how much someone watched or read, so marking complete is the learner's own action.

## Why an item is locked

Items open in order, unit by unit. A learner sees one of these reasons on a locked item:

| What the learner sees | Why |
|---|---|
| **Finish the activity before this one first** | The previous lesson isn't complete, or the previous assignment isn't submitted yet. |
| **Pass the required quiz before this one first** | An earlier quiz is set as **Required to continue** and hasn't been passed. |
| **Your access to this course has ended** | The learner's access expired or was removed. |

A quiz that isn't set as **Required to continue** never holds learners back, even if they haven't taken it. See [Quiz settings](doc:DOC-LRN-015).

## When a course counts as complete

The course completion rule has four parts:

- **Lessons**: **All published lessons**, **No lesson requirement**, or **At least this many lessons**.
- **Required quizzes**: the learner must pass each quiz you tick.
- **Required assignments**: each assignment you tick must be graded.
- **Minimum overall score (%)**: the average of the kept quiz scores and assignment grades must reach this. Leave it empty for no minimum.

By default, every published lesson must be complete and nothing else is required. In a course with no lessons, where nothing is marked as required, every published quiz must be passed and every published assignment graded, so a quizzes-only course can still be completed.

## Set the completion rule

Only owners and managers can change the rule.

1. Open **Courses**, open the course's **Actions** menu and choose **Settings**.
2. In **Completion and certificate**, choose the **Lessons** option.
3. Switch on **Required quizzes** and **Required assignments** and tick the items that count.
4. Optionally enter a **Minimum overall score (%)**.
5. Choose **Save completion settings**.

![The Completion and certificate card on Course Settings](shot:courses/completion-card)

You can also mark a quiz or assignment as **Required for course completion** from its own settings. It counts when the matching switch is on here.

## What happens when a learner completes the course

The learner sees a **Course complete** page with links to rate the course and, if one was issued, **View certificate**. A certificate is issued automatically when certificates are switched on for the course and the learner meets the certificate's minimum score. See [Certificates](doc:DOC-LRN-020).

## Where staff see progress

Instructors and staff see each learner's progress and completion state in the course's **Students** list in the **Teaching Dashboard**. See [Your teaching dashboard](doc:DOC-LRN-024).

## Related

- [Create a quiz](doc:DOC-LRN-014)
- [Assignments: create, collect and grade](doc:DOC-LRN-019)
- [Courses overview](doc:DOC-LRN-001)
