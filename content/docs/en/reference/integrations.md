---
id: DOC-INT-001
title: "Integrations: what Atlas connects to today"
description: What Atlas works with today (YouTube, your own domain, email, transfer payments) and what it does not offer, such as card gateways, SMS or an API.
summary: >
  Today Atlas plays YouTube videos inside its lesson player, links to lessons on
  other sites, connects your own domain through DNS records, sends email for
  you, and records payments learners send to your bank account, mobile wallet
  or InstaPay. Card or Fawry checkout, SMS, WhatsApp, live online sessions, a
  mobile app and a public API are not available.
type: integration
audience: [owner]
order: 1
priority: P1
related: [DOC-LRN-006, DOC-ACD-006, DOC-COM-002, DOC-FAQ-001, DOC-SUP-002]
keywords: [integration, youtube, vimeo, api, webhook, zoom, whatsapp, sms, fawry, paymob, card payment, vodafone cash, instapay]
updated: 2026-10-20
---

Atlas does a few connections well and leaves out the rest. This page lists both, so you can plan before you move your academy.

## Available today

| What | How it works | Learn more |
|---|---|---|
| YouTube videos | Paste the link of a public or unlisted YouTube video that allows embedding. It plays inside your academy, with the watermark drawn over it. Private and members-only videos won't play for learners. | [Add a YouTube video lesson](doc:DOC-LRN-006) |
| Lessons on other sites | A link lesson points to a video or page on another site, such as Vimeo or Google Drive. Learners open the link from the lesson; it does not play inside the Atlas player and the watermark does not cover it. | [Add a link lesson](doc:DOC-LRN-007) |
| Your own domain | Works with any DNS provider. You add the records shown on the **Domain** tab of your website settings. | [Connect your own domain](doc:DOC-ACD-006) |
| Email | Atlas sends account, payment, course and message emails for you. There is nothing to set up. | [Emails Atlas sends](doc:DOC-REF-005) |
| Learner payments | Bank transfer, mobile wallets (Vodafone Cash, Orange Cash and others) and InstaPay. Learners send the money straight to you and upload a proof, and the organization owner approves it. | [Set up payment methods](doc:DOC-COM-002) |
| Paying for your Atlas plan | Bank transfer, e-wallet or InstaPay. You upload the proof, and the Atlas team reviews it. | [Pay for your subscription](doc:DOC-BIL-004) |

## Not available

| What | What to do instead |
|---|---|
| Card, Fawry or other online payment gateways | Learners pay by transfer, wallet or InstaPay, and you approve each payment. |
| Payments that approve themselves | Each proof is checked by a person: the organization owner for course payments, the Atlas team for your plan. |
| SMS and WhatsApp messages | Atlas sends email and in-app notifications only. |
| Live online sessions | Not available in Atlas. |
| Video files stored on Atlas | Use YouTube or a link lesson. |
| A mobile app | Atlas works in the browser on phones, tablets and computers. See [Browsers and devices](doc:DOC-REF-006). |

> [!LIMITATION]
> YouTube lessons stay on YouTube. Atlas draws the watermark over the video inside your academy, but a learner who finds the YouTube link can still open the video on YouTube itself.

## Not offered

- A public API, API keys or webhooks for customers.
- Connecting your own email service or sending address.

## Ask for something

If your academy needs a connection that Atlas does not have, send a **Custom feature** request from **Atlas service requests** in your academy. See [Request a service from the Atlas team](doc:DOC-SUP-002).

Related: [Frequently asked questions](doc:DOC-FAQ-001) · [How selling courses works](doc:DOC-COM-001)
