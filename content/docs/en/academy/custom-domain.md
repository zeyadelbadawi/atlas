---
id: DOC-ACD-006
title: Connect your own domain
description: Enter your domain, add the DNS records Atlas shows, then wait for verification and HTTPS. When it says Live, your domain is the main address.
summary: >
  In your website settings, open the Domain tab, connect your domain and add
  the DNS records Atlas shows at the company that manages your domain. Atlas
  checks the records, verifies the domain and sets up HTTPS. When the status
  says Live, your own domain becomes your academy's main address.
type: setup-config
audience: [owner, manager]
order: 5
priority: P0
related: [DOC-REF-003, DOC-ACD-005, DOC-TRB-006, DOC-WEB-012]
keywords: [custom domain, own domain, cname, dns, https, ssl, دومين خاص, ربط دومين, نطاق مخصص, سجلات dns]
updated: 2026-10-20
---

The academy owner and managers can connect a custom domain. Your Atlas address keeps working the whole time, so your site never goes offline while you set this up.

## Before you start

- You need a domain you own, and access to the company that manages its DNS (where you bought the domain, or your DNS provider).
- Decide on the exact address. A subdomain such as `learn.your-academy.com` is recommended.
- One domain can be connected to one academy only.

## Connect your domain

1. In the sidebar, open **Website**, then **Settings**, then the **Domain** tab.

   ![The website settings with the Domain tab highlighted](shot:academy/domain-tab)

2. Under **Custom domain**, choose **Connect a domain** and type the exact address you want visitors to use, without `https://`. Confirm with **Connect a domain** (the button says **Use this domain** when you are replacing a domain).

   ![The Domain field with its help text](shot:academy/domain-hostname-form)

3. Atlas shows **DNS records to add**, with a **Type**, **Name** and **Value** for each one. Copy each record exactly as shown and add it at the company that manages your domain's DNS.

   ![The custom domain progress steps](shot:academy/domain-progress)

4. Choose **Check now** to check straight away. Atlas also re-checks automatically every few minutes, so you can close the page.

   ![The Check now button highlighted](shot:academy/domain-check-now)

## What the steps mean

| Step | What it means | What you do |
|---|---|---|
| **Connect** | No domain entered yet | Enter your domain |
| **Configure DNS** | Atlas is waiting for your DNS records | Add the records, then check |
| **Verification** | Your DNS is being validated. This usually takes minutes, sometimes up to a day | Wait, or check again later |
| **Securing HTTPS** | Verified; the HTTPS certificate is being issued | Keep the DNS records in place |
| **Live** | Verified, the certificate is active and Atlas confirmed your site answers over HTTPS | Nothing: your domain is the main address |
| **Needs attention** | Something stopped the domain from working | Read the message, fix the records, check again |
| **HTTPS failing** | Verified, but visitors can't load it over HTTPS yet | Read the reason shown; Atlas keeps re-checking |
| **Atlas not ready** | Atlas could not register the domain on its side | Nothing to change at your DNS provider. If it lasts, open a support ticket |

## When it's live

Your domain becomes the primary address, and the **Website address** card says so. Visitors who open your Atlas address are sent to your own domain. Both addresses keep working.

## Change or disconnect a domain

- **Change domain** lets you enter a different address. The old domain is released and its progress is discarded. If the old domain is live, Atlas asks you to confirm first, because replacing it disconnects it straight away.
- **Disconnect** removes the domain. Your website goes back to its Atlas address, and you can connect a domain again later.

> [!NOTE]
> The exact DNS values come from the Domain tab. Always copy them from there. For what each record does, see [Custom domain DNS records](doc:DOC-REF-003).

> [!WARNING]
> Keep the DNS records in place after your domain is live. Removing them can stop your domain from working, or stop its certificate from renewing.

> [!TIP]
> The academy owner can also ask the Atlas team for help with a domain from the **Request a domain** card on the same tab. See [Request a service from the Atlas team](doc:DOC-SUP-002).

## If it's stuck

See [Custom domain not verifying or no HTTPS](doc:DOC-TRB-006), or [open a support ticket](doc:DOC-SUP-001).
