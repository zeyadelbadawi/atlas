---
id: DOC-WEB-012
title: SEO settings for your academy site
description: Set your site's title, description and share image, set details for one page, keep pages out of search results, and control the sitemap.
summary: >
  In Website, then Settings, the SEO tab holds your site title, meta title,
  meta description and social share image, plus switches for search engine
  indexing and the sitemap. Each page can override these from Edit SEO in the
  visual editor's Site panel. Empty page fields fall back to the site settings. Changes go
  live when you publish.
type: setup-config
audience: [owner, manager]
order: 19
priority: P1
related: [DOC-WEB-003, DOC-WEB-006, DOC-WEB-008, DOC-ACD-006, DOC-WEB-014]
keywords: [seo, google, meta description, share image, sitemap, noindex, الظهور في جوجل, صورة المشاركة على واتساب, سيو, وصف الموقع]
updated: 2026-10-23
---

The academy owner and managers can edit SEO settings. They control how your site appears in search results and in link previews when someone shares it, for example on WhatsApp or Facebook.

## Set your site's search and sharing details

1. Open **Website**, then **Settings**, then the **SEO** tab.

   ![The website settings with the SEO tab selected](shot:website/seo-tab)

2. Fill **Site title**, **Meta title** and **Meta description** in both languages.

   ![The SEO tab with the title and description fields](shot:website/settings-seo)

3. Under **Social share image**, choose an image from your media library or upload one. It's the picture shown in link previews.

   ![The Social share image field on the SEO tab](shot:website/seo-share-image)

4. Leave **Allow search engines to index this website** and **Include this website in the sitemap** ticked so search engines can find your site. Untick them to keep the whole site out of search results.

   ![The two indexing checkboxes on the SEO tab](shot:website/seo-indexing)

5. Choose **Save changes**.

   ![The Save changes button at the bottom of the SEO tab](shot:website/seo-save)

6. For one page, open it in the visual editor, choose **Site**, then **Edit SEO** under **Search engines** (in the classic editor, **Edit SEO** is at the top). In **Page SEO**, fill **Meta title**, **Meta description**, **Social share title**, **Social share description** and **Social share image**. To keep this page out of search results, untick **Allow search engines to index this page**. Then choose **Save changes**.

   ![The Page SEO dialog with the page indexing checkbox](shot:website/page-seo-dialog)

7. Publish your site: in the publish bar, choose **Publish changes** and confirm.

   ![The publish bar on the Settings page with Publish changes highlighted](shot:website/settings-publish)

## Length limits

| Field | Limit |
|---|---|
| Site title, meta title, social share title | 70 characters per language |
| Meta description | 160 characters per language |
| Social share description | 200 characters per language |

Search results often cut long titles and descriptions, so aim for a title of about 60 characters and a description of about 155.

## What happens when a field is empty

Atlas uses the first value it finds: the page's own field, then the site's field on the SEO tab, then an automatic default based on your academy. The **Page SEO** dialog shows the fallback it would use now. Where the other language is empty, the main-language text is used.

## What search engines receive

- Every page is sent as complete HTML with its title, description, share details and a canonical link.
- Each page links to its version in the other language.
- Your academy, and each course page, carry structured data that search engines can read. The **Structured data preview** card on the SEO tab shows your academy's.
- With indexing and the sitemap switched on, your site serves a sitemap at `/sitemap.xml` that lists your published, visible pages that allow indexing, and your published public courses. The **Sitemap preview** card on the Website overview lists its pages from what you have saved; publish to update the live sitemap.

> [!NOTE]
> These settings help search engines read your site, but Atlas can't promise when or where your site appears in search results.

## Canonical settings

- **Canonical base URL** on the SEO tab is used only to build canonical links. It doesn't connect a domain: that's done on the **Domain** tab. See [Connect your own domain](doc:DOC-ACD-006).
- **Canonical path** in **Page SEO** sets a different canonical address for one page. Most pages don't need it.

## Related

- [Manage your website pages](doc:DOC-WEB-003)
- [Build your site in Arabic and English](doc:DOC-WEB-006)
- [Course catalogue and course pages on your site](doc:DOC-WEB-014)
