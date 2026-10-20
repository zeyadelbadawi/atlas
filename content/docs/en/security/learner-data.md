---
id: DOC-SEC-004
title: What data Atlas keeps about learners
description: Which learner data Atlas keeps, why, who can see it and for how long, including lesson access records, quiz activity signals and watermark records.
summary: >
  Atlas keeps a learner's account details, their learning activity in each
  academy, records of lesson access and quiz activity for limited periods, and
  watermark records that link video codes to accounts. Atlas doesn't use your
  camera or microphone. Learners can ask for a copy of their data, or for
  deletion, from Your data.
type: security-privacy
audience: [owner, learner]
order: 4
priority: P0
related: [DOC-SEC-001, DOC-SEC-005, DOC-MED-002, DOC-IAM-009, DOC-LRN-016]
keywords: [learner data, student privacy, what data is collected, data retention, بيانات الطالب, خصوصية الطلاب, إيه البيانات اللي بتتحفظ, مدة الاحتفاظ بالبيانات]
updated: 2026-10-20
---

Academy owners can use this page to answer learners' and parents' questions.
Learners can use it to see what is kept about them.

## The data, in one table

| Data | Examples | Who can see it | How long |
|---|---|---|---|
| Account details | Name, email, mobile number, language | You. The team of each academy where you study; only its owners and managers see your mobile number. Atlas platform administrators. | Until the account is deleted; then your name and email are removed. |
| Learning activity | Enrolments, progress, quiz answers and scores, assignments, certificates, orders and payments | You. The academy's team, according to their role. Atlas platform administrators. | While your account exists. |
| Lesson access records | Each time a lesson is opened or refused, with the device and session | Atlas, to protect lessons (for example device limits). | 90 days |
| Quiz activity signals | Leaving the page or full screen, copy, cut and paste, right-click, printing | The academy staff who review quiz attempts. Atlas platform administrators. | 180 days |
| Forensic watermark records | The code shown on a video, linked to your name, email, phone number and session, stored encrypted | Atlas platform administrators only, and every lookup is logged. | Until 730 days after the code was last shown, even if the account is deleted. |
| Sign-in security events | Records of sign-in checks and security changes | Atlas | 90 days |
| Email delivery records | Which emails Atlas sent you and whether they were delivered | Atlas | 90 days |
| Active sessions | Device, country and IP address of each signed-in device | You, in **Active Sessions** | While the session is active |

## When you watch a lesson

A visible watermark linked to your account appears on lesson videos. If a
recording leaks, the code on it helps Atlas trace the account it came from. That is why the
watermark records are kept for a long time, even after an account is deleted.
See [Content protection](category:protection).

## During quizzes

Atlas records the browser events in the table above so the academy can review
an attempt. Atlas doesn't use your camera or microphone, and doesn't record
your keystrokes.

## Your phone number

Each number belongs to one account and isn't verified yet. It is visible to the
owners and managers of the academies where you study, never to instructors or
other learners. See [Your phone number](doc:DOC-IAM-009).

## What learners can do with their data

In **My Learn**, open **Profile**, then the **Account** tab. Under **Your
data**:

- **Request a copy**: "A file with your profile, academies, enrolments,
  progress, certificates, orders and payments." When it is ready, Atlas emails
  you and **Download your data** appears on the same card, until the date it
  shows.
- **Request deletion**: the Atlas team deletes your account and emails you.

![The Your data card on the learner's Account tab](shot:security/learner-your-data)

Both are confirmed with a code sent to your verified email address. See
[Data retention and account deletion](doc:DOC-SEC-005).

> [!LIMITATION]
> Learners can't delete or download their data instantly: each request is
> handled by the Atlas team, and no handling time is promised. Watermark
> records stay for their full period after deletion.

Questions about your data: read the [privacy policy](site:/privacy-policy) or
write to the Atlas team from the [contact page](site:/contact?topic=support).
