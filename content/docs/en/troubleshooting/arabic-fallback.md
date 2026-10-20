---
id: DOC-TRB-016
title: Arabic text appears in English on my site
description: Your Arabic site shows English wherever a section has no Arabic text. Why it happens and how to fill in the Arabic version of each section.
summary: >
  Every text on your academy site has a main-language version, which is
  required, and a version in the other language, which is optional. When the
  Arabic version of a text is empty, the Arabic site shows the English text in
  its place. Open the section in the Page Editor, fill in the Arabic box, save
  and publish.
type: troubleshooting
audience: [owner, manager]
order: 15
priority: P1
related: [DOC-WEB-006, DOC-WEB-004, DOC-REF-004, DOC-WEB-008]
keywords: [arabic site shows english, translation missing, bilingual website, /ar, الموقع العربي فيه كلام إنجليزي, الترجمة ناقصة, النسخة العربية, موقع بلغتين, عربي وإنجليزي]
updated: 2026-10-20
---

## Symptom

You open the Arabic version of your academy site and some headings, buttons or paragraphs are in English.

## Why it happens

Your site has a **main language** and a second language. In the editor, every text field has two boxes:

- the main-language box, which is required,
- the other language, marked **optional**, with "Not translated yet" until you fill it in, then "Complete".

"Text in the main language is required; the other language is optional. Where a translation is missing, visitors see the main-language text." So an empty Arabic box shows the English text on the Arabic site. Nothing is broken; the translation just hasn't been written yet.

Owners and managers can edit the website.

## Fix

1. Check which language is the main one: open **Website**, then **Settings** and the **Language** tab. With English as the main language, Arabic pages are under `/ar`; with Arabic as the main language, English pages are under `/en`.

   ![The Language tab with the main-language note highlighted](shot:troubleshooting/website-language-tab)

2. Open **Pages**, open the page that shows English, then choose **Edit section** (the pencil) on the section with the missing text.

   ![The Page Editor with the Edit section button highlighted](shot:troubleshooting/page-editor-edit-section)

3. In each field, find the box labelled "Arabic · optional" that says "Not translated yet" and type the Arabic text. Choose **Apply changes**.

   ![A section's settings with the optional Arabic field highlighted](shot:troubleshooting/section-arabic-field)

4. Choose **Save changes**, or on a live site **Publish page** to make it visible straight away. **Save draft** keeps it hidden from visitors.
5. Open your site's Arabic address and check the page again.

> [!TIP]
> If you paste English into an Arabic box by mistake, the editor warns you: "This field expects Arabic text. Brand names, technical terms, numbers and links are fine."

Texts outside page sections, such as the site's navigation and SEO settings, have their own Arabic boxes in **Settings**. Fill them in the same way.

## Still stuck?

If you filled in the Arabic text, published, and the Arabic site still shows English, open a ticket from **Support** ([open Support](app:/dashboard/support)) with the page address. See [Getting help](category:support).

Related: [Website builder](category:website).
