---
id: DOC-LRN-016
title: Exam integrity and full-screen exams
description: What Atlas records during a quiz attempt, what it never collects, how full-screen exams work, and the limits of integrity signals.
summary: >
  Integrity settings record events such as switching tabs, leaving full
  screen, copying, pasting and printing during a quiz attempt, and show them
  to reviewers as signals, not proof. Atlas never uses the camera or
  microphone, never records the screen or typing, and blocks nothing. In
  Strict mode an attempt is submitted automatically at the violation limit.
type: feature-explanation
audience: [owner, manager, instructor]
order: 13
priority: P1
related: [DOC-LRN-015, DOC-LRN-017, DOC-LRN-025, DOC-LRN-033, DOC-SEC-004]
keywords: [exam integrity, cheating, full screen exam, tab switching, الغش في الامتحان, امتحان ملء الشاشة, مراقبة الامتحان, تبديل التبويبات, proctoring]
updated: 2026-10-20
---

Integrity settings help you review an exam attempt with more context. They record what happened in the learner's browser and show it to reviewers with plain explanations. They don't prevent cheating, and they don't decide whether anyone cheated: that judgement stays with you.

## The four integrity modes

You choose the mode in the quiz's **Advanced options**, under **Integrity**. The **Exam** preset uses **Warn** with a limit of 3 and requires full screen.

| Integrity mode | What happens |
|---|---|
| **Off** | Nothing is recorded. |
| **Monitor** | Events are recorded and shown to reviewers. The learner is not warned. |
| **Warn** | Events are recorded and shown to reviewers, and the learner is warned with the count each time. |
| **Strict** | Like Warn, and the attempt is submitted automatically when the **Violation limit** is reached. |

The **Violation limit** (1 to 50) flags attempts that reach it for reviewers. Only Strict acts on it by submitting the attempt.

![The Integrity card in the quiz's advanced options](shot:courses/quiz-integrity-settings)

## What is recorded

While the quiz is open, these events are recorded with the time they happened:

- switching to another tab or window,
- leaving full screen,
- copying, pasting and printing on the quiz page,
- a connection check about once a minute, so gaps in contact show up.

## What is never collected

Atlas never uses the learner's camera or microphone, never records the screen or what they type, and sees nothing outside the quiz page. Nothing is blocked: a learner can still switch tabs or copy, and it is recorded.

## What learners are told

Before starting a monitored quiz, learners see what is recorded and how their mode works, and they tick **I understand what is recorded during this quiz.** In Warn and Strict mode they see a warning with the count each time an event is recorded.

## Full-screen exams

Turn on **Require full screen** under **Integrity**. It needs an integrity mode other than **Off**.

- **Start Quiz** opens the quiz in full screen.
- If the learner leaves full screen, the questions are hidden behind **Return to full screen to continue**. Their answers are kept and the timer keeps running. Leaving is recorded.
- If the browser refuses full screen, the learner can choose **Continue without full screen**.
- Some browsers can't use full screen at all, for example every browser on iPhone. Learners there take the quiz as usual, and the reviewer sees that full screen was unavailable.

## Reviewing the signals

On a quiz's results, each attempt shows its violations and whether it was flagged. Open an attempt to see **Worth a look**: facts from its timeline, each with possible innocent explanations such as a phone call, a notification or a dropped connection, and the full event timeline. See [Review attempts and grade essay answers](doc:DOC-LRN-017) and [Integrity report and CSV export](doc:DOC-LRN-025).

> [!LIMITATION]
> Integrity signals come from the learner's browser. A modified browser can hide or fake them, and some ways of breaking the rules, like a second phone or another person in the room, leave no trace. Treat signals as prompts for a conversation, never as proof.

## Related

- [Quiz settings: time, attempts, grading and results](doc:DOC-LRN-015)
- [Create a quiz](doc:DOC-LRN-014)
- [For learners](category:for-learners)
