---
id: DOC-IAM-006
title: Set up an authenticator app
description: Turn on two-factor authentication. Scan the QR code, confirm with your password, save your recovery codes, and learn how to turn it off.
summary: >
  Open Profile, then Security, and under Two-Factor Authentication choose
  Enable. Scan the QR code with an authenticator app, enter the 6-digit code it
  shows and your password, then save the recovery codes Atlas shows once. From
  then on, every sign-in asks for a code from the app.
type: step-by-step
audience: [everyone]
order: 5
priority: P1
related: [DOC-IAM-005, DOC-IAM-003, DOC-IAM-007, DOC-SEC-003, DOC-TRB-002]
keywords: [two-factor authentication, 2FA, authenticator app, recovery codes, lost phone, المصادقة الثنائية, تطبيق المصادقة, أكواد الاسترداد, ضاع موبايلي, تفعيل 2FA]
updated: 2026-10-20
---

Anyone can turn this on for their own account: owners, managers, instructors
and learners. We recommend it for organization owners.

## Before you start

- An authenticator app on your phone. Any app that reads a QR code and shows
  6-digit codes works.
- Your current password.

## Turn it on

1. Open the account menu, choose **Profile**, then open the **Security** tab.
   Learners open **My Learn** and choose **Security**.

   ![The Profile page with the Security tab highlighted](shot:account/security-tab)

2. Under **Two-Factor Authentication**, choose **Enable**.

   ![The Two-Factor Authentication card with the Enable button highlighted](shot:account/two-factor-card)

3. In **Set up two-factor authentication**, scan the QR code with your
   authenticator app. If you can't scan it, type the key shown under
   **Can't scan? Enter this key instead** into the app.

   ![The setup dialog showing the QR code](shot:account/two-factor-setup)

4. Enter the **6-digit code from your app** and your **Current password**,
   then choose **Verify and enable**.

   ![The setup dialog with the code and password fields highlighted](shot:account/two-factor-confirm)

## Save your recovery codes

Atlas then shows **Save your recovery codes**: 10 codes, each working once.
"If you lose your phone, these are the only way back into your account — we
cannot show them again."

Copy them somewhere safe that is not your phone, tick **I've saved these codes
somewhere safe.**, and choose **Done**. Atlas emails you that two-factor
authentication was turned on.

## Signing in with the app

After your password, the **Two-factor authentication** page asks you to "Enter
the 6-digit code from your authenticator app." Type it and choose **Verify**.
Without your phone, choose **Use a recovery code instead** and enter one of
your saved codes.

The app's code replaces the emailed sign-in code: you are never asked for both
([Sign-in codes by email](doc:DOC-IAM-005)). It applies wherever you sign in,
on the dashboard and on academy websites.

## Get new recovery codes

On the **Two-Factor Authentication** card, the status shows how many recovery
codes you have left. Choose **New recovery codes** and enter your password.
"Your existing recovery codes will stop working immediately." Save the new
ones.

## Turn it off

Choose **Turn off** on the card and enter your password. Your account is then
protected by your password alone. Atlas signs out your other sessions and
emails you about the change.

## If you lose your phone and your recovery codes

Contact the Atlas team: team members from **Support** in the dashboard,
learners through their academy. The Atlas team can remove two-factor
authentication from your account. When they do, every session ends and you
get an email.

> [!LIMITATION]
> Each person turns two-factor authentication on for their own account. An
> organization can't require its whole team to use it yet.

> [!NOTE]
> Atlas asks for your password to turn the app on or off, or to make new
> codes: "a signed-in session alone shouldn't be able to weaken your
> account's security."
