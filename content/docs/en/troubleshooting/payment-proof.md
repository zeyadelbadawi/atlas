---
id: DOC-TRB-008
title: Payment proof pending or rejected
description: What a pending or rejected payment proof means for course purchases and for your Atlas subscription, who reviews it, and what to do next.
summary: >
  A course payment is reviewed by the academy that sells the course, not by
  Atlas: "Under review" means the academy is checking that your money arrived.
  If it was rejected, read the academy's reason and submit a new payment.
  Payments for your own Atlas subscription are reviewed by the Atlas team.
  Never pay twice while a payment is under review.
type: troubleshooting
audience: [learner, owner]
order: 7
priority: P0
related: [DOC-COM-010, DOC-COM-011, DOC-COM-003, DOC-BIL-004, DOC-TRB-015]
keywords: [payment pending, payment rejected, under review, proof of payment, instapay, vodafone cash, bank transfer, الدفع قيد المراجعة, الدفعة اترفضت, إثبات الدفع, انستاباي, فودافون كاش, تحويل بنكي, اسكرين التحويل]
updated: 2026-10-20
---

## Symptom

- **Learners:** your course payment shows **Under review** and you can't open the course yet, or it shows **Rejected**. At checkout you may see "Your payment is under review" or "Not available for purchase yet".
- **Owners:** learners say they paid, but they can't open the course.
- **Owners paying for Atlas:** your subscription payment is still waiting, or Atlas says "Atlas reviewed this payment and couldn't accept it."

## Why it happens

There are two different payments, reviewed by different people:

| Payment | Who reviews it |
|---|---|
| A learner pays an academy for a course (bank transfer, wallet or InstaPay) | The academy's organization owner, in the dashboard |
| An academy owner pays Atlas for the subscription | The Atlas team |

Atlas doesn't see your bank or wallet. A person checks that the money arrived, then approves or rejects the proof. Until then the payment is pending. There is no fixed review time.

Common reasons for each message:

- **"Under review"**: "The academy is checking your payment. You’ll get an email when it’s reviewed."
- **"Your payment is under review"** at checkout: you already sent a payment for this course. "You don’t need to pay again."
- **"Rejected"**: "This payment was not approved, so you don’t have access yet." The academy may give a reason, for example that the amount doesn't match.
- **"Not available for purchase yet"**: "This academy hasn't finished setting up payments, so this course can't be purchased right now."
- **"This academy isn’t accepting new enrollments right now. Please contact the academy."**: the academy can't take new learners at the moment, often because it reached its plan's student limit (see [You've reached a plan limit](doc:DOC-TRB-010)).

## Fix

### Learners: check and resend your payment

1. In My Learn, open **Payments** to see every payment you made to this academy and its status.

   ![The learner's My payments page with the Payments link highlighted](shot:troubleshooting/learner-payments)

2. If it says **Under review**, wait for the academy's email. Don't pay again.
3. If it says **Rejected**, read **Reason from the academy**. Fix what it says (for example the amount or the reference), then choose **Submit a new payment** and upload the new proof.
4. If **Submit a new payment** isn't offered any more, the order has closed: open the course page and start the checkout again.

> [!WARNING]
> Never send money twice for the same course while a payment is under review. If you think the academy missed your payment, contact the academy with your transfer reference.

### Owners: review the payments waiting for you

Only the organization owner can review learners' payments. Managers see "Only the organization owner can review payments".

1. In the academy sidebar, open **Payments**. The **Waiting for review** tab lists the proofs learners sent.

   ![The Payments page with the Waiting for review tab highlighted](shot:troubleshooting/owner-payments-pending)

2. Open a payment, check in your bank or wallet app that the money arrived, then choose **Approve**. "Approve only after the money has arrived in your account. Approving gives the learner access and emails them."
3. If the money didn't arrive or doesn't match, choose **Reject…** and write a reason. "The learner sees this reason and receives it by email."
4. To see payments you already rejected, open the **Rejected** tab.

   ![The Payments page with the Rejected tab highlighted](shot:troubleshooting/owner-payments-rejected)

> [!LIMITATION]
> Atlas doesn't check bank transfers or wallets for you. You confirm the money arrived in your own bank or wallet app before you approve.

### Owners: your Atlas subscription payment

1. Open **Billing** and its payment history. The **Review** column shows where each payment stands.

   ![The Payment History page with the Review column highlighted](shot:troubleshooting/subscription-payment-history)

2. If it is still pending, there is nothing to resend: the Atlas team reviews it and your plan activates once it is approved.
3. If it was rejected ("Atlas reviewed this payment and couldn't accept it."), open the payment to read the reason, then pay again with the correct details.

## Still stuck?

- **Learners:** contact your academy (in My Learn, choose **Contact your academy**). Atlas can't approve or refund course payments: they go to the academy directly.
- **Owners:** if a subscription payment has been pending longer than you expected, or no payment method appears at checkout, open a ticket from **Support** ([open Support](app:/dashboard/support)). See [Getting help](category:support).

Related: [Selling and payments](category:selling).
