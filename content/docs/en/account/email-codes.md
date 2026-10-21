---
id: DOC-IAM-005
title: Sign-in codes by email and remembered browsers
description: Why Atlas emails you a 6-digit sign-in code, how "Remember this device" works, and how to forget remembered browsers.
summary: >
  After your password, Atlas may email you a 6-digit code to check that it is
  really you. Tick "Remember this device" and that browser can skip the code
  for a while. Organization owners always get a code on a new browser for the
  dashboard. You can forget remembered browsers from the Security tab.
type: feature-explanation
audience: [everyone]
order: 4
priority: P0
related: [DOC-IAM-006, DOC-IAM-003, DOC-IAM-007, DOC-TRB-009, DOC-ACD-001]
keywords: [verification code, sign-in code, OTP, 6-digit code, remember this device, code not arriving, كود التحقق, رمز الدخول, الكود مش بيوصل, ليه بيبعتلي كود, تذكر هذا الجهاز]
updated: 2026-10-21
---

An emailed sign-in code is a second check after your password. Someone who
learns your password still can't get in without access to your email inbox.

## When you are asked for a code

After you enter the right password, the page may change to **Check your
email**: "We sent a 6-digit code to" followed by your address, partly hidden.

- **Organization owners** always get a code when they sign in to the dashboard
  (`dashboard.atlass.dpdns.org`) from a browser Atlas doesn't remember yet.
- **Everyone else**, on the dashboard and on academy websites, gets a code when
  the platform's sign-in code setting asks for one. Depending on that setting,
  a code is asked for on new browsers, at every sign-in, or not at all.
- **If you use an authenticator app**, Atlas asks for the app's code instead.
  You are never asked for both. See
  [Set up an authenticator app](doc:DOC-IAM-006).

Academy owners can see which setting applies to their learners in **Academy
Settings**, under **Communication**, on the **Email & sign-in codes** card. The
card is for information only: "These settings follow the platform's
configuration and can't be changed per academy yet."

![The Email & sign-in codes card in Academy Settings with its read-only notice highlighted](shot:account/academy-code-setting)

## Enter the code

Type the 6 digits from the email. The page shows how long the code stays
valid ("Code expires in…").

- **Send a new code** becomes available after a short wait, a limited number
  of times.
- After too many wrong codes, Atlas asks you to sign in again to get a new
  code.
- An old code stops working once it has expired. Use the newest email.

## Remember this device

Tick **Remember this device** before you enter the code: "You won't be asked
for a code again on this device for a while."

A remembered browser counts only for the place you signed in: the dashboard,
or one specific academy website. If the setting asks for a code at every
sign-in, a remembered browser is still asked.

## See and forget remembered browsers

Open the account menu, choose **Profile**, then the **Security** tab. The
**Remembered Devices** card lists the browsers that can skip the code, and how
long each one stays remembered. Learners find the same card in **My Learn**,
under **Security**.

![The Remembered Devices card on the Security tab](shot:account/remembered-devices)

- **Forget** removes one browser.
- **Forget other devices** removes every browser except the one you are using.

Forgetting a browser doesn't sign it out: "it will simply be asked for a code
next time." To sign a device out, use
[Active Sessions](doc:DOC-IAM-007).

Atlas also forgets every remembered browser when you reset or change your
password ([Reset or change your password](doc:DOC-IAM-003)).

## If the code doesn't arrive

- Wait a minute and check your spam or junk folder.
- Choose **Send a new code** when it becomes available.
- If Atlas says "We can't deliver email to this address right now, so a code
  can't be sent", choose **Reset your password**, or contact your academy or
  the Atlas team.

More help: [Troubleshooting](category:troubleshooting).

> [!LIMITATION]
> Sign-in codes depend on email reaching your inbox. Atlas can't send a code
> by text message or WhatsApp. An academy owner can see the sign-in code
> setting for their academy but can't turn codes on or off for it.
