---
id: DOC-SEC-002
title: How your academy's data is kept separate
description: Each organization's data is kept apart by rules in the database. How this works for learners in several academies, for sign-ins and for Atlas staff.
summary: >
  Every request in Atlas belongs to one organization and academy, and the
  database itself refuses to return or change another organization's data. A
  learner who studies at two academies has one account, but each academy sees
  only its own learners, courses and payments. Sign-ins are tied to the place
  you signed in.
type: security-privacy
audience: [owner]
order: 2
priority: P1
related: [DOC-SEC-001, DOC-SEC-003, DOC-ORG-011, DOC-ROLE-005, DOC-IAM-002]
keywords: [data separation, other academies, multi-academy, can other academies see my students, فصل البيانات, هل أكاديمية تانية تشوف طلابي, خصوصية الأكاديمية, بيانات منفصلة]
updated: 2026-10-20
---

Many academies run on Atlas. This page explains how each one's data stays
its own.

## Between organizations

Each organization's academies, learners, courses, orders and payments are kept
separate by rules in the database itself. Every request carries the
organization and academy it belongs to, and the database refuses to return or
change rows that belong to anyone else. The separation is enforced by the
database, not only by what the screens choose to show.

## Learners who study at more than one academy

A learner has one Atlas account and can join several academies with it. Each
academy has its own membership for that learner: "Your courses, progress and
certificates in each academy stay separate."

- Your academy sees only its own learners, and only what they do in your
  academy.
- Your team doesn't see which other academies a learner belongs to. Only the
  learner is shown that.
- If a learner's own name clashes with another learner's name in your academy,
  the learner is asked to choose a different display name. Nothing is shared
  with other academies.

See [Team](category:team) for how learner accounts work across academies.

## Sign-in is tied to where you signed in

A session started on one academy's website works only on that academy's
website. It can't be used on another academy's website or on the Atlas
dashboard, and the reverse is true too. See
[Where to sign in](doc:DOC-IAM-002).

## Inside your academy

What each person on your team can do depends on their role (owner, manager or
instructor). See [Guides by role](category:roles).

> [!WARNING]
> Everyone you add to your team can see part of your academy's data, such as
> learner lists. Add only people you trust, and remove people who leave.

## Who at Atlas can access data

A small number of Atlas platform administrators can see organizations,
academies and users, including students' phone numbers, through
administration tools. They use them to run the service: support, subscription
payment reviews, privacy requests, and tracing a leaked video through its
watermark. Every watermark lookup is logged. Atlas has no feature that lets
staff sign in as you.

## Limits

> [!LIMITATION]
> Keeping academies apart doesn't stop someone you gave access to from copying
> what they can see, and it doesn't make lesson videos impossible to record.
> Atlas holds no security certification for this separation.

More on privacy: the [privacy policy](site:/privacy-policy) and
[Security and privacy](site:/security) on our website.
