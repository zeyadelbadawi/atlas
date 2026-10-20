---
id: DOC-LRN-022
title: How certificate verification works
description: Anyone can check an Atlas certificate with its verification code. Here is where the code is, what each result means and what is shown.
summary: >
  Every certificate an academy issues has a verification code and link. Open
  the link, or go to /verify/ followed by the code on the academy's site, to
  see whether it is a Valid certificate, revoked on a given date, or a code
  that doesn't match any certificate. A valid result shows who it was issued
  to, the course, the academy and the dates.
type: feature-explanation
audience: [everyone]
order: 19
priority: P1
related: [DOC-LRN-020, DOC-LRN-021, DOC-LRN-035, DOC-SEC-004, DOC-REF-004]
keywords: [verify certificate, certificate code, fake certificate, التحقق من شهادة, كود الشهادة, شهادة حقيقية, رمز التحقق]
updated: 2026-10-20
---

Certificate verification lets an employer, a school or anyone else check that a certificate is genuine and still valid. No account is needed.

## Where the code is

Each certificate carries a verification code of letters and digits. Learners find it on their certificate in the academy site, with **Copy code** and **Copy verification link** buttons. The letters I, L and O are never used in codes, so they can't be confused with 1 and 0.

## Check a certificate

Open the verification link the learner shared. You can also type the address yourself: the academy's site address followed by /verify/ and the code. The same check works on the Atlas site.

![A valid certificate result with its details](shot:courses/verify-valid)

## What the result means

| Result | Meaning |
|---|---|
| **Valid certificate** | The certificate was issued by the academy named on the page and is still in force. |
| **This certificate was revoked on** a date | The academy withdrew it. It should no longer be relied on. |
| **This code does not match any certificate** | Check the characters and try again. |

![The result for a code that does not match any certificate](shot:courses/verify-invalid)

## What information is shown

A valid or revoked certificate shows its **Certificate details**: who it was **Issued to**, the **Course**, the **Academy**, **Issued on**, **Completed on**, the **Serial**, the **Version** and the **Status**.

> [!NOTE]
> Anyone with the code can see these details, including the learner's name. Learners decide whom they share their code with.

## For academies

- You don't need to do anything: every certificate gets its code automatically. See [Certificates](doc:DOC-LRN-020).
- If you revoke a certificate, its verification page shows it as revoked straight away. If you regenerate one, the code stays the same. See [Issue, revoke or regenerate a certificate](doc:DOC-LRN-021).

## Related

- [Certificates: design a template and issue automatically](doc:DOC-LRN-020)
- [For learners](category:for-learners)
