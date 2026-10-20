---
id: DOC-ACD-005
title: Your academy web address (subdomain)
description: Every academy gets an Atlas address with HTTPS. Find and share it, see the naming rules, change it, and how it works with your own domain.
summary: >
  Every academy gets its own Atlas address with HTTPS managed by Atlas. You
  find it on the Domain tab of your website settings. The organization owner
  can change it, once every 60 days, by saving a new Academy Slug: the
  website moves to the new address, and the old address keeps working, sends
  visitors to the new one and stays reserved for your academy.
type: feature-explanation
audience: [owner]
order: 4
priority: P0
related: [DOC-ACD-006, DOC-REF-004, DOC-START-004, DOC-ACD-010]
keywords: [academy link, url, subdomain, web address, academy address, academy slug, change address, rename link, لينك الاكاديمية, عنوان الموقع, رابط الموقع, سب دومين, تغيير اللينك]
updated: 2026-10-20
---

Your academy's website lives at an Atlas address: a name of your choice in front of the Atlas domain. Atlas creates it when the academy is set up, manages its HTTPS certificate, and keeps it working for as long as the academy exists. The organization owner can change it later.

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

## Change the address

Only the organization owner can change the address, and only **once every 60 days**. Everyone else sees the **Academy Slug** field read-only, with "Only the organization owner can change the web address."

Your first change after creating the academy is always allowed. After a change, the field stays read-only for 60 days and tells you the date you can change it again, for example "You changed the address recently. You can change it again on 19 December 2026." Changing back to one of your old addresses counts as a change too.

1. In the sidebar, open **Academy Settings**. Under **General**, type the new address in **Academy Slug**. The same naming rules apply as when you created the academy. Under the field, Atlas tells you what will happen when you save.

   ![The Academy Slug field with a new address typed in and the note about what happens when you save](shot:academy/settings-slug)

2. Select **Save Settings**. You see "Settings updated successfully". If the address is used by another academy or reserved, the field tells you, and nothing changes.

   ![The Save Settings button after typing a new Academy Slug](shot:academy/settings-slug-save)

You can also change the **Academy Slug** on the **Academy Profile** page and select **Save Changes**. It works the same way.

## What happens when you change it

- **Your website moves to the new address straight away.** The **Domain** tab shows the new address.
- **The old address keeps working.** Anyone who opens it, or an old link or bookmark, is sent to the same page on your new address. Links in emails you sent earlier keep working too.
- **New emails and invite links use the new address.** Invite links you copied earlier keep working, through the old address.
- **The old address stays reserved for your academy.** No other academy can take it. You can change back to it later (the 60-day rule applies), and it becomes your address again.
- **Your own domain stays your main address.** If you connected one, it stays the address your website uses, and the old Atlas address sends visitors to it.

> [!NOTE]
> Visitors who are signed in on the old address are signed out when they arrive at the new one, because each address has its own sign-in. They sign in again on the new address.

> [!LIMITATION]
> Deleting an academy does not free its address, or the old addresses it kept. They stay reserved and can't be used again, even by you.

## Related

- [Academy site URLs](doc:DOC-REF-004)
- [Create your academy](doc:DOC-START-004)
- [Delete an academy](doc:DOC-ACD-010)
