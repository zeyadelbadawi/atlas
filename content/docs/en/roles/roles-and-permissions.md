---
id: DOC-ROLE-005
title: "Roles and permissions: who can do what"
description: Compare what owners, managers, instructors and learners can do in Atlas, which pages each sees, and how to give someone a role.
summary: >
  Atlas has three team roles and learners. The owner signed the organization up and
  controls money, billing, the team and security settings. A manager runs courses, the
  website and the learner list. An instructor teaches only the courses they are
  assigned to. Learners study on the academy website. Pick Manager for someone who runs
  the academy with you, and Instructor for someone who teaches.
type: reference
audience: [owner, manager, instructor]
order: 5
priority: P0
related: [DOC-ROLE-001, DOC-ROLE-002, DOC-ROLE-003, DOC-ORG-002, DOC-ORG-003]
keywords: [roles, permissions, manager vs instructor, who can do what, الأدوار, الصلاحيات, الفرق بين المدير والمدرب, مين يقدر يعمل إيه]
updated: 2026-10-20
---

## The roles at a glance

- **Owner**: the person who signed the organization up. Owns every academy in it.
  There is one owner per organization. See [Guide for academy owners](doc:DOC-ROLE-001).
- **Manager**: runs one or more academies day to day. See
  [Guide for academy managers](doc:DOC-ROLE-002).
- **Instructor**: teaches the courses they are assigned to. See
  [Guide for instructors](doc:DOC-ROLE-003).
- **Learner**: studies on the academy's website and never sees the Atlas dashboard. See
  [Guide for learners](doc:DOC-ROLE-004).

## Permission table

"Assigned" means only on the courses the instructor is assigned to.

### Academy and website

| Action | Owner | Manager | Instructor |
|---|---|---|---|
| Create a new academy | Yes | No | No |
| Change an academy's Atlas address, or delete the academy | Yes | No | No |
| Edit the academy profile, settings and visual identity | Yes | Yes | No |
| Connect your own domain | Yes | Yes | No |
| Edit and publish the website, read website messages | Yes | Yes | No |
| Use the media library | Yes | Yes | No |

### Courses

| Action | Owner | Manager | Instructor |
|---|---|---|---|
| Create, edit, publish and archive courses; set prices | Yes | Yes | No |
| Assign instructors to a course | Yes | Yes | No |
| Build the curriculum, quizzes and assignments | Yes | Yes | Assigned |
| Review attempts and submissions, grade, give quiz exceptions | Yes | Yes | Assigned |
| Certificate templates; issue or revoke certificates | Yes | Yes | No |

### Learners

| Action | Owner | Manager | Instructor |
|---|---|---|---|
| See the student list and student details | Yes | Yes | Assigned, read-only |
| Approve or reject, block or unblock, enrol, end course access, create invite links | Yes | Yes | No |
| Add a student account yourself | Yes | No | No |
| Change the registration policy | Yes | No | No |
| Change content protection and learner device limits | Yes | No | No |

### Money and billing

| Action | Owner | Manager | Instructor |
|---|---|---|---|
| Payment methods, payment review, course orders | Yes | No | No |
| Atlas plan, trial, billing and usage | Yes | No | No |

### Team, communication and records

| Action | Owner | Manager | Instructor |
|---|---|---|---|
| Add managers and instructors; remove staff | Yes | No | No |
| Post announcements | Yes | Yes | No |
| Send Academy Messages to learners | Yes | No | No |
| Academy reports, including sharing signals | Yes | Yes | No |
| Academy activity log | Yes | No | No |
| Open a support ticket with Atlas | Yes | Yes | Yes |

## How to give someone a role

Only the owner adds people. Open **Members** in the academy sidebar and choose **Add
Manager** or **Add Instructor**. See [Add a manager or instructor](doc:DOC-ORG-002).
Each instructor counts toward your plan's instructor limit; managers don't.

![The Members page with the Add Manager and Add Instructor buttons](shot:roles/owner-members)

## Changing someone's role

There is no "change role" button. Remove the person
([Remove a staff member](doc:DOC-ORG-003)) and add them again with the new role.

## Older role names you might see

Some older accounts may show **Administrator** or **Staff** on the Members page. These
roles can't be given to anyone any more. Use Manager or Instructor instead.

## Learners

Learners have their own area, **My Learn**, on the academy website. They can join,
enrol in or buy courses, study, take quizzes, submit assignments and download
certificates. They can't sign in to the Atlas dashboard.
