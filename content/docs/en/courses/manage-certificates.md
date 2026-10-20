---
id: DOC-LRN-021
title: Issue, revoke or regenerate a certificate manually
description: Find any certificate your academy issued, revoke one that should no longer count, regenerate its PDF, or issue one by hand.
summary: >
  Owners and managers see every certificate under Certificates, Issued
  certificates. From a certificate's actions menu, Revoke withdraws it with a
  reason and the verification page then shows it as revoked; Regenerate makes
  a new PDF from the current template with the same serial and code. To issue
  one by hand, open the learner on the Students tab and choose Issue
  certificate.
type: step-by-step
audience: [owner, manager]
order: 18
priority: P2
related: [DOC-LRN-020, DOC-LRN-022, DOC-ORG-009, DOC-ANL-004]
keywords: [revoke certificate, regenerate certificate, issue certificate manually, الغاء شهادة, اصدار شهادة يدوي, اعادة انشاء الشهادة, شهادة]
updated: 2026-10-20
---

Every action on this page is recorded in the academy's audit trail. Only the academy's owner and managers can issue, revoke or regenerate certificates.

## Find a certificate

1. In the academy sidebar, open **Certificates**. The **Issued certificates** tab lists every certificate with its learner, course, serial, issue date, status and PDF state. Filter by **Status** or **Course**, and use **View** for the full record or the actions menu for more.

   ![The Issued certificates list with filters and a certificate's actions button](shot:courses/certificates-list)

## Revoke a certificate

2. Open the certificate's actions menu and choose **Revoke**. Enter the **Reason**, which is recorded in the audit trail, and choose **Revoke certificate**.

   ![The Revoke certificate dialog with the reason field](shot:courses/certificate-revoke)

The certificate stays in the list, its verification page shows it as revoked with the date, and the learner can no longer download it. Revoking can't be undone.

## Regenerate a certificate

3. Open the certificate's actions menu and choose **Regenerate**. Optionally enter a reason, for example that the academy logo changed, and choose **Regenerate**.

   ![The Regenerate certificate dialog](shot:courses/certificate-regenerate)

A new version of the PDF is made from the current template and the learner's current name. The serial and the verification code stay the same, and the score and dates recorded at issuance don't change.

## Issue a certificate by hand

Use this when the learner met the completion rule outside Atlas, or an automatic certificate didn't happen. The course must have **Issue a certificate** switched on in its Course Settings.

4. Open **Members**, choose the **Students** tab and open the learner. Next to the course enrollment, choose **Issue certificate**.

   ![The student details panel with the Issue certificate button next to an enrollment](shot:courses/student-issue-certificate)

5. Optionally fill in **Reason (optional)**. Tick **Issue even if the completion rule is not met** if the learner hasn't met the rule; the certificate then records the learner's current score. Choose **Issue certificate**.

   ![The Issue a certificate dialog with the reason and the issue even if not met option](shot:courses/issue-certificate-dialog)

## What happens next

**Certificate issued** confirms it with the new serial number, and the certificate appears in **Issued certificates** marked as issued manually by staff. The learner can download it from their certificates on the academy site.

## Related

- [Certificates: design a template and issue automatically](doc:DOC-LRN-020)
- [How certificate verification works](doc:DOC-LRN-022)
- [Team and learners](category:team)
