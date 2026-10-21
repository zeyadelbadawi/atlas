---
id: DOC-IAM-004
title: Verify your email address
description: When Atlas asks you to verify your email, how to use or resend the link, why it asks you to sign in, and what verification changes.
summary: >
  Atlas confirms that your email address is really yours. Often this happens
  on its own, the first time you enter an emailed sign-in code. Otherwise Atlas
  emails you a verification link: open it while signed in to the same account.
  Links work for a limited time and only the newest one works.
type: step-by-step
audience: [everyone]
order: 3
priority: P1
related: [DOC-IAM-005, DOC-IAM-010, DOC-IAM-002, DOC-TRB-009]
keywords: [verify email, confirm email, verification link, link expired, تأكيد البريد, تفعيل الإيميل, رابط التأكيد منتهي, تأكيد الايميل]
updated: 2026-10-21
---

Atlas verifies your email address in one of two ways, depending on how sign-in
is set up where you created your account:

- **With your first sign-in code.** If Atlas asks for an emailed code when you
  sign in, entering the code also verifies your address. You get no separate
  link.
- **With a verification link.** If no code is asked for, Atlas emails you a
  link after you sign up. Opening it confirms your address.

Learners who signed up on an academy's website get an email with that
academy's name, and the link opens the academy's own verification page.

## Why it matters

You need a verified email address to:

- delete your own team account ([Delete your account](doc:DOC-IAM-010));
- ask for a copy of your data or for your account to be deleted, as a learner
  ([Data retention and account deletion](doc:DOC-SEC-005)).

Both send a confirmation code to your address. If it isn't verified yet, Atlas
says "Verify your email address first — the confirmation code is sent there."

## Use the verification link

Open the link from the most recent verification email. You must be signed in
to the account the email was sent to:

- If you are signed out, the page says "Sign in to confirm your email". Sign
  in, and Atlas finishes confirming. Your link is not used up.
- If you are signed in to a different account, the page says "This link
  belongs to a different account". Choose **Sign out and switch account**, then
  sign in with the right account.

When it works, you see "Your email is verified".

## Get a new link

1. Sign in. Team members use the [Atlas sign-in page](app:/auth/sign-in) on
   `dashboard.atlass.dpdns.org`; learners sign in on their academy's website.

   ![The Atlas sign-in page with the Sign In button highlighted](shot:account/sign-in-submit)

2. Open the [verification page](app:/auth/verify-email) and choose
   **Send a new link**.

   ![The Verify your email page with the Send a new link button highlighted](shot:account/verify-email-request)

Open the newest email and select its button. Any earlier link stops working as
soon as a new one is sent. Learners do the same on their academy's website, on
its **Verify your email** page.

## What the messages mean

| Message | What to do |
|---|---|
| "Your email is verified" | Nothing more. |
| "This link has already been used" | Your address is already verified. |
| "This verification link has expired" | Links work for a limited time, and only the newest one works. Sign in and choose **Send a new link**. |
| "This verification link can't be used" | The link is incomplete. Open the full link from the most recent email. |
| "Too many attempts" | Wait a minute and try again. |
| "You've asked for several links already." | Wait a while before asking for another link. |

> [!TIP]
> No email? Check your spam folder, and make sure you are looking in the inbox
> of the address you signed up with. More help:
> [Troubleshooting](category:troubleshooting).
