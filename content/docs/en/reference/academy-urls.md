---
id: DOC-REF-004
title: Academy site URLs (English, Arabic, learner portal, verification)
description: The web addresses of your academy site, its pages in each language, sign-up and sign-in links, the learner area and certificate verification links.
summary: >
  Your academy site lives on its Atlas subdomain, or on your own domain once it
  is live. Its main language opens at the plain address and the other language
  sits under /ar or /en. Learners sign up at /sign-up, sign in at /sign-in and
  learn under /my, all on your academy's address. Certificates are checked at
  /verify followed by the code.
type: reference
audience: [owner, manager]
order: 5
priority: P1
related: [DOC-ACD-005, DOC-ACD-006, DOC-WEB-006, DOC-IAM-002, DOC-LRN-022]
keywords: [academy link, url, sign up link, register link, arabic url, /ar, my learn, certificate verification, subdomain]
updated: 2026-10-20
---

Every path below goes after your academy's address. For example, if your address is `learn.your-academy.com`, the sign-up page is `learn.your-academy.com/sign-up`.

## Your site's address

- **Atlas subdomain.** Atlas gives every academy a subdomain and manages its HTTPS certificate. You'll find it on the **Domain** tab of your website settings, under **Atlas subdomain**. It keeps working even if you later disconnect your own domain.
- **Your own domain.** Once your domain is live, it becomes the primary address. Visitors who open the Atlas subdomain are sent to your domain, and both addresses keep working. See [Connect your own domain](doc:DOC-ACD-006).

## English and Arabic pages

You choose your site's **Main language** on the **Language** tab of your website settings:

| Main language | At your plain address | Other language |
|---|---|---|
| English | English pages | Arabic pages under `/ar`, for example `/ar/courses` |
| Arabic | Arabic pages | English pages under `/en`, for example `/en/courses` |

![The Language tab, where you choose the site's main language](shot:reference/website-language-tab)

The change takes effect when you publish your website. Old links keep working: they forward to the new address. Visitors can switch language from the site header at any time.

## Links to share with learners

| Page | Path |
|---|---|
| Home | `/` |
| Course catalogue | `/courses` |
| One course | `/courses/` followed by the course ID (open the course on your site and copy the address) |
| About, FAQs, Contact | `/about`, `/faqs`, `/contact` |
| A custom page | `/` followed by the page's slug |
| Sign up | `/sign-up` |
| Sign in | `/sign-in` |
| Forgot password | `/forgot-password` |
| Learner area (**My Learn**) | `/my` |
| A learner's courses, certificates, purchases and devices | `/my/courses`, `/my/certificates`, `/my/purchases`, `/my/devices` |
| Certificate check | `/verify/` followed by the certificate code |

Add `/ar` (or `/en`) in front of any path for the other language. A page you hid in your website builder does not open for visitors.

## Invite links

Invite links have their own format. Copy them from the invite links screen instead of building them by hand. See [Invite learners with invite links](doc:DOC-ORG-006).

## Certificate verification links

Anyone can open `/verify/` followed by a certificate code to see whether the certificate is real, with no sign-in. The link works on your academy's address. See [How certificate verification works](doc:DOC-LRN-022).

## The Atlas dashboard is a different address

You and your team manage the academy in the [Atlas dashboard](app:/dashboard). Learners never use it: they sign in on your academy's site. A learner who tries to sign in to the dashboard sees "You are a student. Please sign in through your academy's website." See [Where to sign in](doc:DOC-IAM-002).

Related: [Your academy web address](doc:DOC-ACD-005) · [Build your site in Arabic and English](doc:DOC-WEB-006)
