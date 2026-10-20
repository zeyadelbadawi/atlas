---
id: DOC-ACD-011
title: Academy creation status, retries and failures
description: Follow your academy's setup stages, retry a stalled or failed setup without repeating finished steps, cancel it, and what Atlas does after failures.
summary: >
  The setup status page shows each stage while Atlas builds your academy. If
  setup stops making progress or fails, select Retry: stages that already
  finished are not repeated. After repeated failures, Atlas opens a support
  ticket for you automatically. Past setups are listed on the Academy
  Provisioning page.
type: step-by-step
audience: [owner]
order: 10
priority: P1
related: [DOC-START-004, DOC-TRB-007, DOC-SUP-001, DOC-ACD-007]
keywords: [academy setup, provisioning, setup failed, stuck, retry, انشاء الاكاديمية, الاعداد واقف, فشل, اعادة المحاولة]
updated: 2026-10-20
---

When you create an academy, Atlas builds it in stages: it creates the academy and reserves its address, builds the website, then applies your logo and colours. The status page follows this as it happens and updates by itself.

## Open a setup

1. In the sidebar, open **New Academy**. The **Academy Provisioning** page lists every setup with its **Status** and number of **Attempts**.

   ![The Academy Provisioning list with the Status column highlighted](shot:academy/provisioning-history)

2. Select a setup to open its status page.

   ![A setup's status page](shot:academy/provisioning-status)

## Read the stages

Each stage is marked **waiting**, **in progress**, **done**, **failed**, **not needed** or **needs your attention**. When all stages are done, the page says **Your Academy is ready**: choose **Continue setup** to finish setting up your academy.

You can close the page at any time. Setup keeps running on Atlas's side, and you get a notification and an email when it finishes or fails.

## If setup stops making progress

If nothing changes for a while, the page says "Setup hasn't made progress for a while. Retrying continues from the last finished stage." Select **Retry**.

## If setup fails

The page shows **Provisioning could not be completed**. Select **Retry**. Atlas continues from the last finished stage: stages that are already done are never repeated.

A common reason is your plan's academy limit. If that's the cause, see [You've reached a plan limit](doc:DOC-TRB-010).

**Branding only:** if the academy is ready but your logo or colours could not be applied, the page says so and offers **Retry branding**. You can also add them later from [Visual identity](doc:DOC-ACD-004).

## Cancel a setup

Select **Cancel provisioning** and confirm. The setup stops where it stands. Steps that already finished are not undone: if the academy was already created, delete it separately ([Delete an academy](doc:DOC-ACD-010)). A finished setup can't be cancelled, and a cancelled one can't be retried. Start a new one instead.

## Automatic support ticket

If the same setup fails repeatedly, Atlas opens a support ticket about it in your name. You'll find it under **Support** with your other tickets, and you can add details there. See [Get help: open a support ticket](doc:DOC-SUP-001).

> [!NOTE]
> The Atlas team reviews tickets manually, so Atlas doesn't promise a reply time.

## Related

- [Academy creation is stuck or failed](doc:DOC-TRB-007)
- [Create your academy](doc:DOC-START-004)
- [Create another academy](doc:DOC-ACD-007)
