---
id: DOC-ACD-005
title: Your academy web address (subdomain)
description: Every academy gets an Atlas address with HTTPS. Find and share it, see the naming rules, and how it works with your own domain.
summary: >
  Every academy gets its own Atlas address, made from the Atlas address you
  chose when you created the academy, with HTTPS managed by Atlas. You find it
  on the Domain tab of your website settings. It keeps working even after you
  connect your own domain, and some names are reserved and can't be used.
type: feature-explanation
audience: [owner]
order: 4
priority: P0
related: [DOC-ACD-006, DOC-REF-004, DOC-START-004, DOC-ACD-010]
keywords: [academy link, url, subdomain, web address, academy address, لينك الاكاديمية, عنوان الموقع, رابط الموقع, سب دومين]
updated: 2026-10-20
---

Your academy's website lives at an Atlas address: a name of your choice in front of the Atlas domain. Atlas creates it when the academy is set up, manages its HTTPS certificate, and keeps it working for as long as the academy exists.

## Find the address to share

Open **Website**, then **Settings**, then the **Domain** tab. The **Website address** card shows the address to share with your learners. The **Atlas subdomain** card shows your Atlas address.

![The Domain tab with the Website address and Atlas subdomain cards](shot:academy/domain-address)

Always copy the address from this tab. It is the address Atlas really serves your website on.

## Choosing the address

You choose the address in the **Atlas address** field when you create an academy. Atlas suggests one from the academy name, and you can edit it. The rules are simple:

- Use lowercase English letters, numbers and hyphens only, for example `al-nour-math`.
- Use 3 to 50 characters.
- The address must be free. If someone already uses it, you see "Already taken".
- Some names are **reserved** for Atlas itself, such as `www`, `admin`, `support`, `help`, `login` or `docs`, and names that look like them. If you pick one, you see "This address is reserved". Choose a name that describes your academy instead.

![The Atlas address field on the New Academy form](shot:academy/new-academy-reserved)

## Your Atlas address and your own domain

You can connect a domain you own, such as `learn.your-academy.com`. When it is verified and working over HTTPS, it becomes your main address. Visitors who open your Atlas address are sent to your own domain, and both addresses keep working. If you disconnect your domain, your site goes back to the Atlas address. See [Connect your own domain](doc:DOC-ACD-006).

## Can I change it?

No. Treat the address you chose at setup as permanent, so plan it carefully.

The organization owner can edit the **Academy Slug** field in **Academy Settings** or on the **Academy Profile** page, but saving a new value there does **not** move your website. Today:

- Your website keeps working on the address you chose at setup, the one shown on the **Domain** tab.
- The new name does not become a web address: nothing opens at it.
- Links in emails and invitations keep using the address on the **Domain** tab.

If you want a different address for your learners, [connect your own domain](doc:DOC-ACD-006).

> [!LIMITATION]
> Deleting an academy does not free its address. The address stays reserved and can't be used again, even by you.

## Related

- [Academy site URLs](doc:DOC-REF-004)
- [Create your academy](doc:DOC-START-004)
- [Delete an academy](doc:DOC-ACD-010)
