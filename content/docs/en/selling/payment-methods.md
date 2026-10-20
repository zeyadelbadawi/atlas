---
id: DOC-COM-002
title: "Set up payment methods: bank transfer, mobile wallets and InstaPay"
description: Add the bank account, mobile wallet or InstaPay address learners pay into, turn each method on or off, and check what learners see at checkout.
summary: >
  The organization owner adds bank transfer, e-wallet or InstaPay details for
  each academy on the Payment methods page and turns each method on. Learners
  see exactly these details at checkout. Until at least one method is on,
  learners can't buy your paid courses.
type: setup-config
audience: [owner]
order: 2
priority: P0
related: [DOC-COM-001, DOC-COM-003, DOC-COM-010, DOC-TRB-008]
keywords: [payment methods, vodafone cash, orange cash, etisalat cash, we pay, instapay, bank account, iban, wallet number, طرق الدفع, رقم المحفظة, فودافون كاش, انستاباي, حساب بنكي]
updated: 2026-10-20
---

Payment methods decide how learners pay your academy for paid courses. Each academy has its own methods: one academy can take bank transfer and InstaPay while another takes a wallet only.

## Before you start

- You need to be the **organization owner**. Managers and instructors see "Only the organization owner can manage payment methods".
- Work on one academy at a time. Open the academy you want in the dashboard first.
- Have the real details ready: the account the money should actually go to. Learners see the details exactly as you type them.

## Set up or edit a method

1. In the academy sidebar, open **Payment methods**.

   ![The Payment methods page with Payment methods highlighted in the sidebar](shot:selling/payment-methods-nav)

2. Find the card of the method you want (**Bank transfer**, **InstaPay** or **E-wallet**) and choose **Set up**. If the method already has details, choose **Edit details** instead.

   ![The E-wallet card with the Edit details button highlighted](shot:selling/payment-method-edit)

3. Fill in the details for the method. For a wallet, choose the **Wallet provider** and type the **Wallet number**.

   ![The Edit E-wallet dialog with the wallet provider choices highlighted](shot:selling/payment-method-dialog)

4. Write the **Transfer instructions** and **Payment reference instructions**. Tell learners how to send the money, what to upload as proof, and what to write in the transfer reference so you can match their payment.

   ![The dialog scrolled to Transfer instructions and Payment reference instructions](shot:selling/payment-method-texts)

5. Choose **Save and turn on** for a new method, or **Save changes** when you edit one.

   ![The bottom of the dialog with the save button highlighted](shot:selling/payment-method-save)

6. To stop accepting a method, switch off **Accept** on its card. Switch it on again any time.

   ![The E-wallet card with the Accept switch highlighted](shot:selling/payment-method-toggle)

## What each method asks for

| Method | Details | Format |
|---|---|---|
| **Bank transfer** | **Bank name**, **Account holder name**, **Account number**, optional **Branch**, **IBAN** and **SWIFT/BIC code** | Account number: letters, numbers, spaces and hyphens |
| **E-wallet** | **Wallet provider** (Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay or **Other provider** with its name), **Wallet number**, **Account holder name** | An Egyptian mobile number starting with 010, 011, 012 or 015; +20 is accepted |
| **InstaPay** | **InstaPay address**, **Account holder name** | Like name@instapay |

Every method also has **Transfer instructions** and **Payment reference instructions**. Each text has an optional Arabic version: learners viewing your academy in Arabic see the Arabic text, and everyone else sees the English one.

## What happens next

- When a method is on, its card says **Accepting** and learners see it at checkout straight away.
- When you switch a method off, its card says **Off** and learners no longer see it. Its details stay saved.
- A method you haven't set up yet says **Not set up**. Switching it on opens its form first.
- Payments learners already sent keep the details they were shown at the time. Editing a method changes only what new payments show.

> [!WARNING]
> If no method is on, the page shows "No payment method is on", and learners see "Not available for purchase yet" on your paid courses.

> [!NOTE]
> You can have one method of each type per academy: one bank account, one wallet and one InstaPay address. Methods are switched off, not deleted.

> [!LIMITATION]
> Atlas shows your details to learners but doesn't check that a transfer arrived. You confirm each payment in your own bank, wallet or InstaPay app before you approve it.

## Related

- [Review payment proofs and approve enrollments](doc:DOC-COM-003)
- [How selling courses works in Atlas](doc:DOC-COM-001)
- [Buy a course: pay and upload your proof](doc:DOC-COM-010) (what learners see)
