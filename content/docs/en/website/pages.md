---
id: DOC-WEB-003
title: Manage your website pages
description: Add custom pages, choose a valid page address, hide or show core pages, and delete custom pages in the Atlas website builder.
summary: >
  Open Website, then Pages. Choose New page, give it a title and a URL slug,
  and Atlas opens it in the page editor. Use the Visible switch to hide or show
  a page. Core pages can't be deleted; custom pages can. New pages and
  visibility changes reach visitors when you publish.
type: step-by-step
audience: [owner, manager]
order: 3
priority: P0
related: [DOC-WEB-004, DOC-WEB-008, DOC-WEB-009, DOC-WEB-012, DOC-REF-004]
keywords: [add page, new page, hide page, delete page, slug, صفحة جديدة, اضافة صفحة للموقع, اخفاء صفحة, رابط الصفحة]
updated: 2026-10-20
---

The academy owner and managers can manage pages. The **Pages** tab lists every page of your site with its address.

## Core pages and custom pages

- **Core pages** carry the **Core** badge: Home, About, Courses, FAQs, Contact and Course Details. They can't be deleted. You can hide any of them except Course Details, which shows each of your courses and is marked with a lock.
- **Sign In** and **Sign Up** are listed too. They are fixed pages: you can change only their heading text. See [Navigation, header, footer and social links](doc:DOC-WEB-009).
- **Custom pages** are the ones you add. They live at `/<slug>` on your site, and at the same address under the other language's prefix (for example `/ar/<slug>`).

## Create a custom page

1. In the sidebar, open **Website**, then the **Pages** tab.

   ![The Pages tab listing the core pages with their addresses](shot:website/pages-list)

2. Choose **New page**.

   ![The New page button at the top of the Pages tab](shot:website/pages-new)

3. Fill in **Page title** and **URL slug**, then choose **New page** in the dialog. Atlas creates the page and opens it in the page editor, where you add sections.

   ![The Create a custom page dialog with a page title and a URL slug filled in](shot:website/pages-create-dialog)

4. To hide or show a page, use its **Visible** switch.

   ![The Visible switch on a page row](shot:website/pages-visibility)

5. Publish your site so new pages and visibility changes reach visitors: on the **Website** overview, choose **Publish changes** and confirm.

   ![The publish bar on the Website overview with Publish changes highlighted](shot:website/overview-publish)

## Choose a page address

The URL slug becomes the page's address. It must:

- use lowercase English letters, digits and single hyphens (for example `summer-revision`);
- be 2 to 60 characters long, and the title up to 100 characters;
- be different from every other page in the academy;
- not be one of the reserved words: `home`, `about`, `courses`, `faqs`, `contact`, `sign-in`, `sign-up`, `ar` and `en`.

Choose the title and slug carefully: the dashboard doesn't offer a way to change them after the page is created. The text visitors see on the page and in the menu comes from the page's sections and menu labels, which you can edit any time.

## Hide or show a page

The **Visible** switch saves to your draft right away. A hidden page isn't reachable on your live site after you publish, even if someone types its address. Hiding a page never deletes its content.

## Edit a page's search and sharing details

Open the page, then choose **Edit SEO** in the page editor. See [SEO settings for your academy site](doc:DOC-WEB-012).

## Delete a custom page

Custom pages have a delete button (a bin icon labelled **Delete page**) on their row. Atlas asks you to confirm in **Delete this page?**.

> [!WARNING]
> Deleting a page is permanent and can't be undone. The page disappears from your live site at once, without publishing. Menu items, footer links and the header button that pointed to it are removed. Buttons in sections on other pages that linked to it stop showing on your live site, so check those pages afterwards.

## If publishing one page is refused

If you publish a single page whose address another live page still uses, Atlas refuses and names that page. Publish the other page first, or publish the whole site.

## Related

- [Edit a page with sections](doc:DOC-WEB-004)
- [Preview, publish and unpublish your site](doc:DOC-WEB-008)
- [Academy site URLs](doc:DOC-REF-004)
- [Website save conflict](doc:DOC-TRB-013)
