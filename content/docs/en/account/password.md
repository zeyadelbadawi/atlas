---
id: DOC-IAM-003
title: Reset or change your password
description: Forgot your password? Get a reset link by email. Signed in? Change it under Profile, Security. Either way you are signed out everywhere.
summary: >
  If you forgot your password, choose "Forgot password?" on the sign-in page
  and follow the link Atlas emails you. If you are signed in, change it from
  the Security tab of your profile. After a reset or a change, every device is
  signed out, including the one you are using, and you sign in again.
type: step-by-step
audience: [everyone]
order: 2
priority: P0
related: [DOC-IAM-002, DOC-IAM-005, DOC-IAM-007, DOC-TRB-002, DOC-TRB-009]
keywords: [forgot password, reset password, change password, reset link expired, نسيت كلمة المرور, نسيت الباسورد, تغيير الباسورد, تغيير كلمة السر, رابط إعادة التعيين]
updated: 2026-10-21
---

Anyone with an Atlas account can do this. To reset, you need access to the
email inbox of your account. To change your password while signed in, you need
your current password.

## If you forgot your password

**Owners, managers and instructors** start on the Atlas sign-in page, on `dashboard.atlass.dpdns.org`:

1. On the [Atlas sign-in page](app:/auth/sign-in), choose **Forgot password?**

   ![The Atlas sign-in page with the Forgot password? link highlighted](shot:account/sign-in-forgot-link)

2. Enter your email address and choose **Send Reset Link**.

   ![The Forgot Password page with an email entered and the Send Reset Link button highlighted](shot:account/forgot-password-form)

3. Check your inbox. The page says "If an account exists with that email, you
   will receive a password reset link shortly."

   ![The confirmation shown after asking for a reset link](shot:account/forgot-password-sent)

Open the link in the email. On the **Reset Password** page, type your new
password in **New Password** and **Confirm Password** (at least 8 characters),
then choose **Reset Password**. Sign in again with the new password.

**Learners** start on their academy's website instead:

1. On your academy's sign-in page, choose **Forgot password?**, then enter the
   email you use at that academy.

   ![An academy website's sign-in page with the Forgot password? link highlighted](shot:account/academy-sign-in-forgot-link)

The email comes with your academy's name, and its link opens your academy's
own **Choose a new password** page. When you are done, you sign in again on
the academy's website.

> [!NOTE]
> The page never says whether an account exists for the email you typed. If no
> email arrives, check that you typed the address you signed up with, then look
> in your spam folder.

## Change your password while signed in

1. Open the account menu (your name at the top of the dashboard) and choose
   **Profile**.

   ![The account menu open with Profile highlighted](shot:account/profile-menu)

2. Open the **Security** tab.

   ![The Profile page with the Security tab highlighted](shot:account/security-tab)

3. Under **Change Password**, enter your **Current password**, then your
   **New password** twice, and choose **Change password**.

   ![The Change Password card with the Change password button highlighted](shot:account/change-password-form)

Learners find the same card in **My Learn**, under **Security**.

![The learner Security page with the Change password button highlighted](shot:account/learner-security-page)

> [!WARNING]
> Changing your password signs you out on every device straight away,
> including the one you are using. There is no extra warning before it
> happens, so finish anything you are doing first.

## What happens after a reset or a change

- Every session on every device ends. You sign in again with the new password.
- Every browser you marked "Remember this device" is forgotten, so the next
  sign-in may ask for an emailed code
  ([Sign-in codes by email](doc:DOC-IAM-005)).
- Any other reset link you asked for stops working.
- Atlas emails you to confirm the change. If you did not make it, reset your
  password right away.
- If your email address is verified and you use an authenticator app, the app
  stays on.

## Password rules

- At least 8 characters.
- Very common passwords are refused with "This password is too common and
  easy to guess. Choose a different one."
- Use a long password you don't use anywhere else.

## If the reset link doesn't work

A reset link works once and only for a short time. If it has expired or was
already used, the page says "This reset link is invalid or has expired". Choose
**Request a new reset link** and use the newest email.

![The message for an invalid or expired reset link, with Request a new reset link highlighted](shot:account/reset-link-invalid)

If you ask for many links in a short time, Atlas makes you wait before you can
ask again.

## Related

- Signed in on a phone you lost? [See and end your active sessions](doc:DOC-IAM-007).
- Added to an academy and never chose a password?
  [Accept an invitation and set up your account](doc:DOC-IAM-012).
- No email arriving? See [Troubleshooting](category:troubleshooting).
