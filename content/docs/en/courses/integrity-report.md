---
id: DOC-LRN-025
title: Integrity report and CSV export
description: Read the academy-wide integrity summary for the last 7, 30 or 90 days, and export one quiz's integrity data as a CSV file.
summary: >
  Integrity data appears in two places. Owners and managers see the academy's
  Integrity summary on the Reports page, for the last 7, 30 or 90 days, with
  totals, event types and the courses with most events. For one quiz, staff
  choose Export integrity CSV on its Quiz Results page to download a row per
  attempt. Both only contain data from quizzes with integrity switched on.
type: step-by-step
audience: [owner, manager, instructor]
order: 22
priority: P2
related: [DOC-LRN-016, DOC-LRN-017, DOC-ANL-003, DOC-MED-006, DOC-TASK-003]
keywords: [integrity report, csv export, exam report, تقرير النزاهة, تصدير csv, تقرير الامتحانات, اكسل, excel]
updated: 2026-10-20
---

Integrity events are recorded only for quizzes whose integrity mode isn't **Off**. See [Exam integrity and full-screen exams](doc:DOC-LRN-016).

## Read the academy integrity summary

Owners and managers can open the Reports page.

1. In the academy sidebar, open **Reports**. The **Integrity summary** shows **Events recorded**, **Counted against attempts**, **Attempts with events**, a breakdown **By event type** and the **Courses with the most events**.

   ![The Reports page with the Integrity summary](shot:courses/reports-integrity)

2. Choose the period in **Window**: the last 7, 30 or 90 days.

   ![The Window list on the Reports page with the 7, 30 and 90 day options](shot:courses/reports-window)

When a period has a lot of activity, the top lists rank its most recent records only; the headline figures still cover the whole period. The Reports page has no export.

## Export one quiz's integrity CSV

The course's assigned instructors, the owner and managers can export it.

3. Open the quiz's **Quiz Results** page (in the **Teaching Dashboard**, open the course, choose **Assessments**, then the quiz) and choose **Export integrity CSV**. **Integrity report exported** confirms the download.

   ![The Quiz Results page with the Export integrity CSV button](shot:courses/quiz-results-export)

The file has one row per attempt: the learner's name and email, attempt number, status, start and submit times, score, counted violations, whether it was flagged, late or submitted automatically, and a count for each kind of event. Open it in Excel or Google Sheets.

> [!LIMITATION]
> These numbers are signals, not verdicts. Many events have innocent explanations, and some kinds of cheating leave no trace. Read them together with the attempt itself before you talk to a learner.

## Related

- [Review attempts and grade essay answers](doc:DOC-LRN-017)
- [Analytics and reports](category:analytics)
