---
id: DOC-REF-003
title: Custom domain DNS records
description: What the DNS records on your Domain tab mean and how to add them at your DNS provider to connect your own domain to your academy site.
summary: >
  To connect your own domain, copy the records from the DNS records to add
  table on the Domain tab of your website settings and create them, exactly as
  shown, at the company that manages your domain's DNS. There is one CNAME
  record that sends visitors to Atlas, plus any verification records Atlas
  lists. Atlas checks them automatically every few minutes.
type: reference
audience: [owner, manager]
order: 4
priority: P0
related: [DOC-ACD-006, DOC-TRB-006, DOC-ACD-005, DOC-REF-004, DOC-SUP-002]
keywords: [dns, cname, txt record, domain verification, custom domain, godaddy, namecheap, subdomain, دومين]
updated: 2026-10-20
---

The organization owner and managers can connect a domain. The values you need are different for every domain, so always copy them from your dashboard, never from another page.

## Where to find your records

Open your academy's **Website**, choose **Settings**, then the **Domain** tab. After you enter your domain and choose **Connect a domain**, the table **DNS records to add** appears under **Custom domain**.

![The Domain tab of the website settings, with the Custom domain section](shot:reference/domain-tab)

## The record table

| Column | What it means | What you type at your DNS provider |
|---|---|---|
| **Type** | The kind of record: `CNAME` for the record that sends visitors to Atlas; verification records are usually `TXT`. | Choose the same type. |
| **Name** | The host the record belongs to. For the CNAME, it is the domain you connected, such as `learn.your-academy.com`. | Many providers want only the part before your main domain (`learn`). Some accept the full name. |
| **Value** | Where the record points, or the verification text. | Paste it exactly. Use **Copy** next to each value to avoid typing mistakes. |

The CNAME record is the one you must always keep: it is what sends visitors to your Atlas site. Verification records prove the domain is yours and let Atlas issue the HTTPS certificate. Once Atlas has verified the domain and issued the certificate, the verification records may disappear from the table, and only the CNAME remains.

## Use a subdomain

The app recommends a subdomain such as `learn.your-academy.com`. Your main domain, and whatever already runs on it, stays where it is.

## How long it takes

Atlas re-checks automatically every few minutes, and you can choose **Check now** at any time. Verification usually takes minutes, sometimes up to a day while DNS changes spread.

## Common mistakes

- **The name is doubled.** Typing `learn.your-academy.com` where the provider adds your domain itself gives `learn.your-academy.com.your-academy.com`. Type only `learn`.
- **An old record is still there.** Remove any other `A`, `AAAA` or `CNAME` record for the same name before you add the new one.
- **A value was retyped.** Use **Copy**. One wrong character stops verification.

> [!NOTE]
> If the table says verification records will appear once the domain is registered, wait and check again later. If it says Atlas is not ready to route custom domains yet, nothing at your DNS provider can fix it: your Atlas subdomain keeps working, and you can contact support.

If your domain stays stuck, see [Custom domain not verifying or no HTTPS](doc:DOC-TRB-006). For the full steps, see [Connect your own domain](doc:DOC-ACD-006).
