---
id: DOC-TRB-002
title: I can't sign in
description: Fix Atlas sign-in problems by the message you see, from a wrong password or student sign-in to emailed codes, a lost authenticator or too many attempts.
summary: >
  Read the message under the sign-in form and match it below. Most problems
  are a forgotten password (use Forgot password?), a learner signing in on the
  Atlas dashboard instead of the academy's own website, or an emailed code that
  expired. Each academy site has its own sign-in page.
type: troubleshooting
audience: [everyone]
order: 1
priority: P0
related: [DOC-IAM-002, DOC-IAM-003, DOC-TRB-009, DOC-TRB-014, DOC-IAM-006]
keywords: [sign in, login, log in, password, forgot password, invalid email or password, code, مش عارف أدخل, تسجيل الدخول, الباسورد, نسيت كلمة السر, كود, لوجين]
updated: 2026-10-21
---

## Symptom

You press **Sign In** and stay on the sign-in page, usually with one of these messages:

- "Invalid email or password."
- "You are a student. Please sign in through your academy’s website."
- "You are not a member of this academy yet."
- "Your access to this academy has been blocked. Please contact the academy."
- "Too many attempts. Please wait a few minutes and try again."
- "That code didn't work. Check the latest email and try again." or "That code has expired. Request a new one."
- "Your session has expired" (after you were already signed in).
- You were signed out after the Atlas dashboard moved to its new address.

## Why it happens

| Message | Most likely cause |
|---|---|
| "Invalid email or password." | The password is wrong, or you used a different email than the one on your account. If you were invited and never set a password, signing in also fails this way. |
| "You are a student. Please sign in through your academy’s website." | You are a learner and you signed in on the Atlas dashboard address. Learners sign in on their academy's own website. Your password was correct. |
| "You are not a member of this academy yet." | You have an Atlas account, but not in this academy, and the academy doesn't accept people who simply sign in (it uses approval or invitations). |
| "Your access to this academy has been blocked. Please contact the academy." | The academy blocked your account. Only the academy can unblock it. |
| "Too many attempts. Please wait a few minutes and try again." | Several failed attempts in a short time. Atlas pauses sign-in for a while to protect the account. |
| Code messages | You typed an old code, the code expired, or too many wrong codes were entered. |
| "Your session has expired" | You were signed out after a while, or your sign-in was ended from another device. |
| Signed out after the move | The Atlas dashboard moved to `dashboard.atlass.dpdns.org`. Everyone who uses the dashboard signs in once again on the new address. |

> [!NOTE]
> Each website has its own sign-in. Signing in to one academy's site does not sign you in to another academy's site, and it does not sign you in to the Atlas dashboard. Academy staff manage their academy from the Atlas dashboard at `dashboard.atlass.dpdns.org`.

## Fix

### Reset a forgotten password

1. On the sign-in page, choose **Forgot password?**.

   ![The Atlas sign-in page with the Forgot password link highlighted](shot:troubleshooting/platform-forgot-password-link)

2. Enter the email address of your account and choose **Send Reset Link**.

   ![The Forgot Password page with the Send Reset Link button highlighted](shot:troubleshooting/platform-forgot-password-form)

3. Open the email and follow the link to choose a new password, then sign in with it. If the page says "This reset link is invalid or has expired", request a new link and use the newest email only.

Learners do the same on their academy's website: the academy's sign-in page has its own **Forgot password?** link.

![An academy's sign-in page with its Forgot password link highlighted](shot:troubleshooting/academy-sign-in-forgot-password)

If you were invited to an academy and never chose a password, use the link in your invitation email: it opens the "Set your password" page. If that link has expired, choose **Get a new link** on the page it opens, or use **Forgot password?**.

### "You are a student": sign in on your academy's website

The Atlas dashboard sign-in page says it directly: "Students sign in on their own academy website, not here."

![The Atlas sign-in page with the note for students highlighted](shot:troubleshooting/platform-sign-in-student-hint)

When a learner signs in there anyway, Atlas shows that message and, when it knows them, lists **Your academies**. Open your academy's website and sign in on its **Sign in** page with the same email and password. If no academy is listed, ask your academy for its website address.

### Problems with the emailed code

When Atlas asks you to "Check your email", it sends a 6-digit code.

- Use the code from the **newest** email. Earlier codes stop working.
- If the code expired, choose **Send a new code**. If the button shows a countdown, wait for it to finish.
- After "Too many wrong codes. Please sign in again.", go back and sign in again to get a fresh code.
- If the code doesn't arrive, see [I didn't get an email](doc:DOC-TRB-009).

### Signed out after the dashboard moved

The Atlas dashboard is now at `dashboard.atlass.dpdns.org`, and the Atlas website keeps
`atlass.dpdns.org`. Old links to `atlass.dpdns.org/auth/...` still work: they
forward you to the same page on the dashboard. After the move, everyone who
uses the dashboard is signed out one time. Sign in again on
`dashboard.atlass.dpdns.org` with the same email and password.

Learners keep signing in on their academy's website, as before.

### Lost your authenticator app

On the two-factor step, choose **Use a recovery code instead** and enter one of the recovery codes you saved when you turned on two-factor authentication. If you no longer have your recovery codes either, contact support (academy staff) or your academy (learners). Don't create a new account: your courses and progress stay with your existing one.

### "Too many attempts"

Wait a few minutes before you try again. Trying repeatedly keeps the pause going. While you wait, check that you are using the right email, or reset your password.

### "Not a member" or "blocked" on an academy site

These come from the academy's own settings, not from your password. See [A learner can't join the academy](doc:DOC-TRB-014). A blocked learner must contact the academy.

### "Your session has expired"

Sign in again. Atlas takes you back to continue where you left off. If you see "Your session couldn't be verified for this site. Please sign in again.", sign in again on the site you are using now.

## Still stuck?

- **Academy owners, managers and instructors:** open a ticket from **Support** in the dashboard ([open Support](app:/dashboard/support)) and include the exact message you see. See [Getting help](category:support).
- **Learners:** contact your academy. Atlas support tickets are for academy staff.

Related: [Where to sign in](category:account) and [I didn't get an email](doc:DOC-TRB-009).
