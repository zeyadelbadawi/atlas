---
id: DOC-LRN-014
title: Create a quiz
description: Build a quiz with single choice, multiple choice, true/false, short answer and essay questions, start from a preset and place it in a unit.
summary: >
  Open the course's Quizzes tab and choose Add Quiz. Give it a title and
  status, pick the Practice or Exam preset, set the passing score, attempts
  and time limit, then add questions of five types with their points and
  correct answers. Choose Save Quiz, then place the quiz in a unit from the
  Course Builder so learners meet it in the right spot.
type: step-by-step
audience: [owner, manager, instructor]
order: 11
priority: P0
related: [DOC-LRN-015, DOC-LRN-016, DOC-LRN-017, DOC-TASK-003, DOC-FAQ-006]
keywords: [create quiz, online exam, question types, multiple choice, essay question, امتحان اونلاين, اختبار, عمل امتحان, اسئلة اختيار من متعدد, سؤال مقالي, صح وخطأ]
updated: 2026-10-20
---

Owners, managers and the course's assigned instructors can create quizzes. Instructors reach a course from the **Teaching Dashboard** with **Edit curriculum**, then use the **Quizzes** tab.

## Create the quiz

1. Open the course and choose the **Quizzes** tab, then **Add Quiz**.

   ![The Quizzes page of a course with the Add Quiz button](shot:courses/quizzes-list)

2. In **Quiz Details**, enter the **Title** and an optional **Description**, and choose the **Status**. A **Draft** quiz is visible only to staff; learners can see and take it once it is **Published**.

   ![The Quiz Details card with title, description and status](shot:courses/quiz-details)

3. Under **Settings**, pick a preset to start from: **Practice** or **Exam**. You can change any setting afterwards.

   ![The Practice and Exam preset buttons](shot:courses/quiz-presets)

4. In **Scoring and attempts**, set the **Passing score (%)**, the **Max attempts** and the **Time limit (minutes)**. Leave a field empty for no limit. Without a passing score, every submitted attempt counts as passed.

   ![The Scoring and attempts card with passing score, max attempts and time limit](shot:courses/quiz-essentials)

5. In **Questions**, choose **Add Question**. Write the **Prompt**, choose the **Type**, add the options with **Add Option** and tick **Correct** for the right ones, then set the **Points**. Repeat for each question.

   ![The Questions section with the Add Question button](shot:courses/quiz-questions)

6. Choose **Save Quiz**.

   ![The Save Quiz button at the bottom of the quiz editor](shot:courses/quiz-save)

7. Place the quiz in the course: in the **Course Builder**, choose **Add content** in a unit, then **Add existing quiz**, and choose **Add**. A quiz that isn't in a unit doesn't appear in the course for learners.

   ![The Add an existing quiz dialog](shot:courses/attach-quiz)

> [!TIP]
> Quizzes created in the wizard's **Assessments** step are placed in the unit you pick in **Place in unit**, and start as **Published**.

## The five question types

| Type | How it's answered | How it's graded |
|---|---|---|
| **Single choice** | Pick one option | Automatically; exactly one option is correct |
| **Multiple choice** | Pick every option that applies | Automatically; at least one option is correct |
| **True / False** | Pick True or False | Automatically |
| **Short answer** | Type a short answer | Automatically against your **Accepted answers** (up to 20, 200 characters each), ignoring capital letters and spaces around the answer |
| **Essay** | Write a free answer | By a reviewer. The attempt stays **Awaiting grading** until every essay in it is graded; see [Review attempts and grade essay answers](doc:DOC-LRN-017) |

Choice questions need at least two options and can have up to 10.

## Points and score

- Each question is worth 0 to 100 points.
- The score is the points earned divided by the points available, as a percentage.
- A quiz has between 1 and 100 questions.

## Extras for each question

Under **More options** you can add:

- **Related lesson**: shown in the review, so a learner who missed the question knows where to go back to.
- **Explanation** (up to 2,000 characters): shown in the review when **Show explanations** is on and the results policy allows answers.

Before you save, choose **Preview as student** to see the quiz the way a learner will: no correct answers and every control read-only.

## The two presets

| Preset | What it sets |
|---|---|
| **Practice** | No time limit, results and answers shown immediately, nothing recorded. Good for self-checks. |
| **Exam** | 30-minute limit, one question per page, score after the due date, answers never shown, and learners warned about recorded events. |

Every setting is explained in [Quiz settings](doc:DOC-LRN-015).

## Related

- [Exam integrity and full-screen exams](doc:DOC-LRN-016)
- [Give a learner a quiz exception](doc:DOC-LRN-018)
- [Completion rules and learner progress](doc:DOC-LRN-013)
