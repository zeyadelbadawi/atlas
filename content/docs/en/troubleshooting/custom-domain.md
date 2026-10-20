---
id: DOC-TRB-006
title: Custom domain not verifying or no HTTPS
description: What each custom domain status means, from missing DNS records to waiting for HTTPS, and what to do so your own domain shows your academy site.
summary: >
  Open Website, then Settings, then the Domain tab, and read the step your
  domain is on. Missing DNS records are fixed at the company that manages your
  domain. Verification and HTTPS take some time after the records are right,
  and Atlas re-checks automatically. Until the domain is live, share your
  Atlas address.
type: troubleshooting
audience: [owner, manager]
order: 5
priority: P0
related: [DOC-ACD-006, DOC-REF-003, DOC-ACD-005, DOC-SUP-002]
keywords: [custom domain, dns, cname, https, ssl, certificate, domain not working, verifying, الدومين, الدومين مش شغال, النطاق, شهادة, اتش تي تي بي اس, دي ان اس]
updated: 2026-10-20
---

## Symptom

You connected your own domain, but it doesn't open your academy site, the domain step doesn't move past verification, or the browser says the connection isn't secure.

## Why it happens

A custom domain goes through these steps: **Connect**, **Configure DNS**, **Verification**, **HTTPS**, **Live**. After you choose **Check now**, Atlas tells you where it stands:

| What Atlas shows | What it means | What to do |
|---|---|---|
| "Checked — DNS records are still missing" | The records Atlas asked for aren't found at your domain yet. | Add the records exactly as shown under "DNS records to add", at the company that manages your domain's DNS. |
| "Checked — still verifying, DNS changes can take a while to propagate" | The records are added and are being validated. This usually takes minutes, sometimes up to a day. | Wait. Don't change the records. |
| "Checked — verified; waiting for the certificate and HTTPS" | Verified. Atlas is waiting for the HTTPS certificate to be issued. | Wait, and keep the DNS records in place: the certificate validation record is required. |
| "Checked — verified, but HTTPS is not working yet" | Visitors can't load the domain over HTTPS yet. | Read the reason shown on the page and fix the DNS if it asks you to. Atlas re-checks every few minutes. |
| "Checked — this domain needs attention" | Something stopped a domain that was working. | Review the details, check that the DNS records are still there, then check again. |
| "Checked — Atlas still can't register this domain with its provider" | The problem is on Atlas's side. There is nothing for you to configure. | Atlas retries automatically. You can choose **Try again**, or open a support ticket. |
| "Checked — your domain is live" | Done. | Nothing. |

## Fix

Owners and managers can manage the domain.

1. In the academy sidebar, open **Website**, then **Settings** and the **Domain** tab. The progress bar shows which step your domain is on.

   ![The Domain tab with the custom domain progress steps highlighted](shot:troubleshooting/domain-stepper)

2. If the records are missing, copy each record from "DNS records to add" into your domain's DNS settings, exactly as shown. Use **Copy** next to each value to avoid typing mistakes. The record types are explained in [Reference](category:reference).
3. Choose **Check now**. Read the result line and follow the table above.
4. While you wait, check **Website address**. Until your custom domain is live, your Atlas subdomain is the address to share.

   ![The Domain tab with the Website address card highlighted](shot:troubleshooting/domain-address)

> [!WARNING]
> Changing a live domain to a new one replaces it ("Replace your live domain?"): the old domain stops showing your site. Change it only when the new one is ready.

## Still stuck?

If the step hasn't changed for more than a day with the records in place, or Atlas says it can't register the domain, open a ticket from **Support** ([open Support](app:/dashboard/support)). Include the domain and the exact result line. You can also ask the Atlas team to set up the domain for you as a service request. See [Getting help](category:support).

Related: [Academy settings](category:academy).
