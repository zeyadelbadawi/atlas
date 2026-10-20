---
id: DOC-TRB-007
title: Academy creation is stuck or failed
description: What to do when creating your academy stalls or fails, from retrying the last finished stage to choosing another address or checking your plan.
summary: >
  If setup stalls or fails, choose Retry: it continues from the last stage
  that finished. If the address is taken or reserved, choose another one. If
  you've reached your plan's academy limit or your subscription isn't active,
  setup can't start. After repeated failures, Atlas opens a support ticket for
  you.
type: troubleshooting
audience: [owner]
order: 6
priority: P1
related: [DOC-ACD-011, DOC-START-004, DOC-TRB-010, DOC-TRB-015, DOC-SUP-001]
keywords: [create academy, academy setup stuck, provisioning failed, address taken, subdomain, إنشاء أكاديمية, الأكاديمية مش بتتعمل, التهيئة فشلت, العنوان مستخدم, السب دومين]
updated: 2026-10-20
---

## Symptom

You started a new academy and one of these appears:

- "Setup hasn't made progress for a while. Retrying continues from the last finished stage."
- "Provisioning could not be completed" with "Something went wrong while setting up your Academy."
- "Your Academy is ready, but your branding could not be applied."
- Next to **Atlas address**: "Already taken", "This address is reserved" or "Already assigned", or "This address is already taken. Please choose another one."
- "Academy limit reached".

## Why it happens

| What you see | Cause |
|---|---|
| Setup hasn't made progress | One stage is taking longer than expected. |
| Provisioning could not be completed | A stage failed. The stages that finished stay finished. |
| Branding could not be applied | The academy was created, but your logo or colours weren't applied. |
| Address taken, reserved or assigned | Each Atlas address belongs to one academy, and some words are reserved by Atlas. An address an academy used before it changed its address stays reserved for that academy too. |
| "This address is already being set up from another tab or an earlier attempt." | You already started a setup with this address. |
| Academy limit reached | Your plan allows a limited number of academies and you are using them all. |
| Setup refused with a subscription message | Creating an academy needs an active trial or subscription. |

Only the organization owner can create academies.

## Fix

### Retry a stalled or failed setup

1. In the sidebar, open **New Academy** to see **Academy Provisioning**, the list of your setup requests and their status. Open the request that stopped.

   ![The Academy Provisioning list with the Status column highlighted](shot:troubleshooting/provisioning-history)

2. Choose **Retry**. Atlas continues from the last stage that finished, so nothing is created twice.
3. If only the branding failed, choose **Retry branding**. Your academy already works; you can also set the logo and colours later in its settings.

If you don't want this academy any more, choose **Cancel provisioning**. "This request will stop where it stands. Any steps already completed are not undone."

### Choose another address

1. On the new academy form, look at the status next to **Atlas address**.

   ![The new academy form with the Atlas address field highlighted](shot:troubleshooting/provisioning-new-address)

2. If it says "Already taken" or "This address is reserved", change the address until it says "Available".
3. If it says the address is already being set up, choose **Follow that setup** instead of starting again.

The Atlas address doesn't need to be perfect: the organization owner can change it later, once every 60 days (the old address then sends visitors to the new one), and you can connect your own domain. See [Your academy web address](doc:DOC-ACD-005).

### Academy limit or subscription

- **Academy limit reached:** choose **View plans** to compare plans, or see [You've reached a plan limit](doc:DOC-TRB-010). See prices and limits on the [pricing page](site:/pricing).
- **Subscription not active:** see [The dashboard is read-only or asks for a subscription](doc:DOC-TRB-015).

> [!NOTE]
> If setup keeps failing, Atlas opens a support ticket for you automatically, and the Atlas team is told. You'll find it in **Support**.

## Still stuck?

Open **Support** ([open Support](app:/dashboard/support)) to follow the automatic ticket, or open a new one with the academy name and the message you see. See [Getting help](category:support).

Related: [Academy settings](category:academy).
