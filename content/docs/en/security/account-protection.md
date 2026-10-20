---
id: DOC-SEC-003
title: Account protection
description: How Atlas protects your account with emailed sign-in codes, authenticator apps, active sessions and security emails, and what to do after a suspicious sign-in.
summary: >
  Atlas checks your password, then may email a 6-digit code when you sign in
  from a new browser. You can add an authenticator app, see and sign out your
  active sessions, and you get an email whenever your password or two-factor
  settings change. If something looks wrong, sign the device out and change
  your password.
type: security-privacy
audience: [everyone]
order: 3
priority: P1
related: [DOC-IAM-005, DOC-IAM-006, DOC-IAM-007, DOC-IAM-003, DOC-TRB-002]
keywords: [account security, suspicious sign-in, hacked account, 2FA, security email, حماية الحساب, حسابي اتسرق, حد دخل على حسابي, رسالة أمان, تسجيل دخول مشبوه]
updated: 2026-10-20
---

Everything below applies to every Atlas account: owners, managers, instructors
and learners. Team members find these settings in the account menu under
**Profile**, on the **Security** tab. Learners find them in **My Learn**, under
**Security**.

![The Security tab with Change Password, Two-Factor Authentication, Active Sessions and Remembered Devices](shot:security/security-tab-overview)

## Passwords

- At least 8 characters. Very common passwords are refused.
- Atlas never stores your password itself, only a one-way form of it that
  can't be turned back into the password.
- Changing or resetting your password signs out every device and forgets
  every remembered browser. See
  [Reset or change your password](doc:DOC-IAM-003).

## Emailed sign-in codes

After a correct password, Atlas may email a 6-digit code. Organization owners
always get one when they sign in to the dashboard from a new browser. For
everyone else it depends on the platform's setting. Ticking **Remember this
device** lets that browser skip the code for a while, for that place only.
See [Sign-in codes by email](doc:DOC-IAM-005).

## Authenticator app and recovery codes

An authenticator app gives a stronger second step than email, and replaces
the emailed code. Recovery codes, shown once, get you in if you lose your
phone. See [Set up an authenticator app](doc:DOC-IAM-006).

## Active sessions

You can see every device signed in to your account, sign out any of them, or
sign out all other devices at once. See
[See and end your active sessions](doc:DOC-IAM-007).

## Security emails you always receive

You can't turn these off:

- your password was changed, or reset;
- two-factor authentication was turned on or off;
- someone tried to create an account with your email address;
- your account joined a new academy by signing up there with your password.

Each one tells you what to do if it wasn't you.

## Repeated failed sign-ins

After several wrong passwords, Atlas pauses further attempts for a while and
shows "Too many attempts. Please wait a few minutes and try again." A browser
that has signed in to your account before keeps its own allowance, so someone
guessing your password elsewhere doesn't lock you out of your own browser.

## If you notice a suspicious sign-in

If you get a security email you didn't expect, or see a session you don't
recognise:

- Sign out that device from **Active Sessions**.
- Change your password, or reset it if you can't sign in.
- Turn on an authenticator app.
- If you still can't get in, contact the Atlas team: team members from
  **Support** in the dashboard, learners through their academy.

## What isn't available

> [!LIMITATION]
> - You can't change the email address of your account yet.
> - An organization can't require its whole team to use an authenticator app.
> - Atlas doesn't sign you out automatically after a period of inactivity.
> - Sign-in codes come by email only, not by SMS or WhatsApp.

More: [Security at Atlas](doc:DOC-SEC-001).
