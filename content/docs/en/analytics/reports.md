---
id: DOC-ANL-003
title: Academy reports (7, 30 and 90 days)
description: Read quiz integrity events, account-sharing signals and plan usage for the last 7, 30 or 90 days. Signals for your review, with no automatic action.
summary: >
  The Reports page sums up one academy's quiz integrity events, lesson-access
  grants and refusals that may point to account sharing, and your plan usage,
  for the last 7, 30 or 90 days. These are signals for you to review: Atlas
  doesn't block or warn anyone because of them. The owner and managers can
  open Reports.
type: step-by-step
audience: [owner, manager]
order: 3
priority: P1
related: [DOC-ANL-001, DOC-MED-006, DOC-LRN-016, DOC-LRN-025, DOC-BIL-006]
keywords: [reports, integrity, cheating, account sharing, sharing signals, device limit, التقارير, غش, مشاركة الحساب, تقرير النزاهة, حد الأجهزة]
updated: 2026-10-20
---

Reports helps you spot two things: unusual behavior during quizzes, and signs that an account is being shared. The academy owner and managers can open it; instructors can't.

## Open Reports and choose a period

1. In the academy sidebar, select **Reports**.

   ![The Reports link in the sidebar and the Reports page](shot:analytics/reports-open)

2. Under **Window**, choose **Last 7 days**, **Last 30 days** or **Last 90 days**. The page opens on the last 30 days.

   ![The Window menu at the top of the Reports page](shot:analytics/reports-window)

## Integrity summary

**Integrity summary** counts the events recorded during monitored quiz attempts, such as the tab being hidden, the window losing focus, leaving full screen, copy, paste and print attempts.

- **Events recorded**, **Counted against attempts** and **Attempts with events** are the headline figures.
- **By event type** splits the events by kind.
- **Courses with the most events** lists the top courses.

![The Integrity summary section](shot:analytics/reports-integrity)

An event isn't proof of cheating: a learner may switch tabs by accident. To look at one attempt in detail, see [Review attempts](doc:DOC-LRN-017). To set which quizzes record these events, see [Exam integrity and full-screen exams](doc:DOC-LRN-016).

## Sharing signals

**Sharing signals** counts lesson-access **Grants** and **Refusals**, with **Learners refused** and **Devices refused**.

- **Refusals by reason** shows why access was refused, for example **Device limit reached** or **Another session active**.
- **Courses with the most refusals** and **Learners with the most refusals** list the top entries.

Repeated refusals for one learner can point to a shared account or too many devices. See [Sharing signals report](doc:DOC-MED-006) and [Device limits](doc:DOC-MED-003).

![The Sharing signals section with refusals by reason](shot:analytics/reports-sharing)

## Plan usage

**Plan usage** shows your organization's usage against its plan limits. The limits themselves are applied by Atlas when you add something, not by this page. See [The Usage page](doc:DOC-BIL-006).

![The Plan usage section](shot:analytics/reports-quota)

## How to act on a signal

Look at the learner's details and their quiz attempts first. If you decide an account is being shared, you can [block the learner](doc:DOC-ORG-008). Atlas takes no action by itself.

> [!LIMITATION]
> Reports shows signals, not proof, and nothing happens automatically. The top lists show up to 10 entries. On a very busy period, the top lists rank only the most recent records; the page tells you when this happens, and the headline figures still cover the whole period. There is no custom date range or export.

## Related articles

- [Dashboards overview](doc:DOC-ANL-001)
- [Integrity report and CSV export](doc:DOC-LRN-025)
