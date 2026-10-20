---
id: DOC-SEC-001
title: Security at Atlas
description: How Atlas keeps each academy's data separate, protects accounts, lessons and payment proofs, who at Atlas can see data, and what isn't offered yet.
summary: >
  Atlas keeps each academy's data separate in the database itself. Accounts
  are protected by passwords, emailed sign-in codes and optional authenticator
  apps. Lessons carry a visible watermark to discourage and trace leaks, and
  payment proofs are stored privately. Some features, such as requiring
  two-factor authentication for a whole team, aren't available yet.
type: security-privacy
audience: [everyone]
order: 1
priority: P0
related: [DOC-SEC-002, DOC-SEC-003, DOC-SEC-004, DOC-SEC-005, DOC-MED-001]
keywords: [security, is atlas secure, privacy, data protection, الأمان, هل أطلس آمن, الخصوصية, حماية البيانات, أمان المنصة]
updated: 2026-10-20
---

This page explains, in plain words, how Atlas protects your academy and the
people in it, and what it doesn't do yet. For the same overview on our
website, see [Security and privacy](site:/security).

## Each academy's data is kept separate

Every academy's learners, courses and payments are kept apart in the database
itself, not only hidden on the screen. A request made for one organization
can't read or change another organization's data. Details:
[How your academy's data is kept separate](doc:DOC-SEC-002).

## Accounts are protected

- Passwords are at least 8 characters, very common passwords are refused, and
  Atlas stores them only in a form that can't be turned back into the
  password.
- After the password, Atlas can email a 6-digit sign-in code. Organization
  owners always get one on a new browser for the dashboard.
- Anyone can add an authenticator app for a stronger second step.
- You can see every signed-in device and sign any of them out.
- Atlas emails you when your password or two-factor settings change.

Details: [Account protection](doc:DOC-SEC-003).

## Lessons are watermarked

Lesson videos show a visible watermark linked to the viewer's account, to
discourage recording and help trace a leaked copy. It doesn't make recording
impossible. See [Content protection](category:protection).

## Payment proofs are stored privately

Receipts that learners upload as proof of payment are kept in private storage
and open only through Atlas, for the people allowed to review them. They never
get a public web address.

## Who at Atlas can see your data

A small number of Atlas platform administrators can see academy and student
details, including students' phone numbers, to run the service: for example
to answer support requests, review subscription payments, handle privacy
requests and trace a leaked video through its watermark. Each watermark
lookup is logged. Atlas has no feature that lets its staff sign in as you.

## Connections are encrypted

The dashboard and academy websites are served over HTTPS.

## What Atlas doesn't offer yet

> [!LIMITATION]
> - A setting that requires two-factor authentication for your whole team.
> - Automatic sign-out after a short period of inactivity.
> - Self-service export of your academy's data.
> - A way for learners to delete or download their own data instantly. They
>   send a request instead, which the Atlas team handles.
> - Security certifications or third-party audit reports.

## Your part

- Use a long password you don't use anywhere else, and turn on an
  [authenticator app](doc:DOC-IAM-006), especially if you own the organization.
- Add only people you trust to your team: everyone you add can see part of
  your academy's data.
- Never send a password or a sign-in code in a support message.

## Privacy and reporting

Read the [privacy policy](site:/privacy-policy) for what Atlas collects and
why. To report a suspected security problem, see
[Report a security issue](doc:DOC-SEC-006).
