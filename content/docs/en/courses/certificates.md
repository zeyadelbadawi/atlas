---
id: DOC-LRN-020
title: "Certificates: design a template and issue automatically"
description: Design your academy's certificate with logo, signature, wording and colours, then switch on automatic certificates for a course.
summary: >
  Owners and managers design one certificate template for the academy under
  Certificates, Template: logo, signature, signatory, English and Arabic
  wording and colours, with a live preview. Then, in each course's Course
  Settings, switch on Issue a certificate. Atlas issues it automatically when
  a learner completes the course and reaches the minimum score, if you set one.
type: step-by-step
audience: [owner, manager]
order: 17
priority: P1
related: [DOC-LRN-013, DOC-LRN-021, DOC-LRN-022, DOC-LRN-035, DOC-MED-007]
keywords: [certificate, certificate template, completion certificate, شهادة, شهادة اتمام, قالب الشهادة, شهادة تلقائية, توقيع, لوجو]
updated: 2026-10-20
---

Certificates have two parts: the academy's template, which sets how every certificate looks, and a switch on each course that turns automatic certificates on. Only owners and managers can change either.

## Design the template

1. In the academy sidebar, open **Certificates** and choose the **Template** tab. Enter a **Template name**; it is shown to staff only.

   ![The Certificate template page with the template name field](shot:courses/certificate-template)

2. Under **Logo** and **Signature image**, choose **Choose image** (or **Replace**) and pick each image from the academy's media library. The logo is printed at the top; the signature is printed above the signatory's name.

   ![The Logo and Signature image fields of the certificate template](shot:courses/certificate-template-images)

3. Enter the **Signatory name** and **Signatory title**. Under **English wording** and **Arabic wording**, write the **Title** and the **Body**. The layout prints the learner's name, the course and the completion date; your body text introduces them.

   ![The English and Arabic wording fields with title and body](shot:courses/certificate-wording)

4. Under **Colours**, pick a preset and fine-tune the **Primary**, **Accent**, **Text** and **Background** colours. Combinations that would be hard to read or print poorly are refused when you save; the background must stay light.

   ![The Colours card with the colour presets and the four colour roles](shot:courses/certificate-colors)

5. Check the **Preview** in English and Arabic. It is produced by the same engine that makes the issued PDF. Then choose **Save template**.

   ![The live certificate preview and the Save template button](shot:courses/certificate-save)

## Turn on certificates for a course

6. Open **Courses**, open the course's **Actions** menu and choose **Settings**. In **Completion and certificate**, switch on **Issue a certificate**. Optionally enter a **Minimum score for the certificate (%)**; leave it empty to issue on completion alone. Choose **Save completion settings**.

   ![The Issue a certificate switch on Course Settings](shot:courses/settings-certificate-switch)

## What happens next

When a learner completes the course and reaches the certificate's minimum score, a certificate is issued automatically. The learner sees it in their certificates on the academy site, can download the PDF, and can share its verification code. See [For learners](category:for-learners).

Every certificate gets a serial number and a public verification code. See [How certificate verification works](doc:DOC-LRN-022).

## Changing the template later

New certificates use the saved template from then on. Certificates already issued keep the version they were made with until you regenerate them; see [Issue, revoke or regenerate a certificate](doc:DOC-LRN-021).

> [!NOTE]
> The certificate footer is fixed: it shows the serial, the issue date and the version, and reads "Issued & verified through Atlas".

## Related

- [Completion rules and learner progress](doc:DOC-LRN-013)
- [Issue, revoke or regenerate a certificate manually](doc:DOC-LRN-021)
- [Content protection and media](category:protection)
