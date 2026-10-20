---
id: DOC-LRN-015
title: "Quiz settings: time, attempts, grading and results"
description: Every quiz setting explained, from time limits and opening dates to which attempt counts, when learners see answers and what blocks progress.
summary: >
  A quiz's settings sit under Settings in the quiz editor: Scoring and attempts
  is always shown, and Advanced options holds Timing and availability, Attempts
  and grading, Results and review, Integrity and Progression. The server keeps
  the time, so a time limit keeps running even if the learner closes the page,
  and correct answers are never sent before your results policy allows.
type: setup-config
audience: [owner, manager, instructor]
order: 12
priority: P1
related: [DOC-LRN-014, DOC-LRN-016, DOC-LRN-018, DOC-LRN-033, DOC-TRB-011]
keywords: [quiz settings, time limit, attempts, show answers, shuffle questions, وقت الامتحان, عدد المحاولات, اظهار النتيجة, خلط الاسئلة, امتحان بوقت, timer]
updated: 2026-10-20
---

Owners, managers and the course's assigned instructors can change a quiz's settings. A preset (**Practice** or **Exam**) fills them all in; you can then change each one. Changed advanced settings show a "customised" count next to **Advanced options**.

## Change a quiz's settings

1. Open the course's **Quizzes** tab, open the quiz's menu and choose **Edit**.

   ![The quiz menu on the Quizzes page with Edit highlighted](shot:courses/quiz-edit-menu)

2. Under **Settings**, check **Scoring and attempts**, then open **Advanced options**.

   ![The quiz settings with the Advanced options toggle](shot:courses/quiz-advanced-toggle)

3. In **Timing and availability**, set when the quiz opens and closes, its due date and late policy.

   ![The Timing and availability card](shot:courses/quiz-timing)

4. In **Attempts and grading**, choose the **Score to keep** and how questions are drawn and ordered.

   ![The Attempts and grading card with the Score to keep field](shot:courses/quiz-attempts)

5. In **Results and review**, choose the layout and when learners see their score, the correct answers and explanations.

   ![The Results and review card with the Show the score field](shot:courses/quiz-results-settings)

6. In **Integrity**, choose what is recorded during an attempt. See [Exam integrity and full-screen exams](doc:DOC-LRN-016).

   ![The Integrity card with the Integrity mode field](shot:courses/quiz-integrity-settings)

7. In **Progression**, decide whether the quiz must be passed before learners can continue.

   ![The Progression card with the Required to continue switch](shot:courses/quiz-progression)

8. Choose **Save Quiz**.

   ![The Save Quiz button at the bottom of the quiz editor](shot:courses/quiz-save)

## Scoring and attempts

| Setting | What it does |
|---|---|
| **Passing score (%)** | The percentage needed to pass. Empty means no pass mark: every submitted attempt counts as passed. |
| **Max attempts** | How many attempts a learner may start. Empty means unlimited. |
| **Time limit (minutes)** | When time runs out, the saved answers are submitted automatically and graded as they are. Empty means no limit. |
| **Required for course completion** | Counts towards the course completion rule when **Required quizzes** is on in Course Settings. |

## Timing and availability

| Setting | What it does |
|---|---|
| **Mode** | **Practice** or **Exam**. The presets set it together with the other values. |
| **Opens** | Attempts can't start before this time. Empty opens the quiz as soon as it is published. |
| **Closes** | Attempts can't start after this time, and open attempts end here at the latest. |
| **Due** | Attempts submitted after this time are marked late. |
| **Late policy** | **Do not allow late attempts**, or **Allow late attempts and flag them**. |
| **Hide the countdown** | Hides the timer digits. The limit still applies, and the learner is still told when time is nearly up and when it has run out. |

The server is the clock: limits follow its time, not the learner's device. The timer starts when the learner chooses **Start Quiz** and keeps running if they close the page.

## Attempts and grading

| Setting | What it does |
|---|---|
| **Score to keep** | Which attempt becomes the learner's score for completion and certificates: **Highest attempt**, **Latest attempt**, **First attempt** or **Average of all attempts**. |
| **Questions per attempt** | Each attempt draws this many questions from the quiz. Empty asks every question. |
| **Shuffle questions** | Each attempt gets its own question order. |
| **Shuffle options** | Each attempt gets its own option order. True/False questions are never shuffled. |

## Results and review

| Setting | What it does |
|---|---|
| **Layout** | **All questions on one page** or **One question per page**. Small screens always use one question per page. |
| **Show the score** | When the learner sees their score and pass or fail result. |
| **Show the correct answers** | When the learner sees which answers were correct. They are never sent before this moment. |
| **Show explanations** | Shows your explanations with the correct answers, so it follows the answers setting. |

For the score and answers you choose: **Immediately after submitting**, **After the due date**, **After the last attempt is used** or **Never**.

## Progression

**Required to continue** keeps the activities after this quiz locked until the learner passes it. Without it, the quiz never holds learners back.

## Check it worked

Open the quiz as a learner. Its start page lists the time limit, attempts, passing score, opening and due dates, and which attempt counts.

## Related

- [Create a quiz](doc:DOC-LRN-014)
- [Give a learner a quiz exception](doc:DOC-LRN-018)
- [Completion rules and learner progress](doc:DOC-LRN-013)
