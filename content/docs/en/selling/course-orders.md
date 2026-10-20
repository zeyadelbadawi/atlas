---
id: DOC-COM-004
title: Track course orders
description: See every course purchase in your academy with its payment and refund status. Search, filter and open an order to see each payment attempt.
summary: >
  Course orders lists every course purchase in one academy, with the student,
  amount, order status, payment and refund. You can search, filter, sort and
  open an order to see every payment made toward it. The dashboard's Revenue
  card adds up the payments you approved over 7, 30 or 90 days.
type: step-by-step
audience: [owner]
order: 4
priority: P1
related: [DOC-COM-003, DOC-COM-001, DOC-COM-011, DOC-ANL-001, DOC-FAQ-004]
keywords: [orders, sales, course purchases, revenue, paid orders, awaiting payment, الطلبات, المبيعات, طلبات الشراء, الإيرادات]
updated: 2026-10-20
---

**Course orders** is where you see what students bought from an academy and whether they paid. Only the **organization owner** can open it; anyone else sees "Only the organization owner can see orders".

## Find and open an order

1. In the academy sidebar, open **Course orders**. The page is titled **Orders**.

   ![The Orders page with Course orders highlighted in the sidebar](shot:selling/orders-nav)

2. Use the search box and filters to narrow the list: **Order status**, **Payment review**, **Method**, **Refund**, **From** and **To**. Change the order with **Sort by**.

   ![The search box and filters above the orders list, highlighted](shot:selling/orders-filters)

3. Choose an order to open **Order details**. You see the summary, **Order ID**, **Placed**, **Paid** and every payment under **Payment attempts**.

   ![Order details for a paid order with the Payment attempts section highlighted](shot:selling/order-detail)

## Order statuses

| Status | What it means |
|---|---|
| **Awaiting payment** | The student started the purchase but no payment has been approved yet. |
| **Paid** | You approved a payment. The student has access to the course. |
| **Expired** | The time to pay ran out before a payment was sent. The student can start again from the course page. |
| **Cancelled** | The order was cancelled. |
| **Refunded** | A refund was recorded for the order in Atlas. |
| **Draft** | The order was created but not completed. |

The **Payment** column shows each payment's method and review status (for example **Awaiting review**, **Approved** or **Rejected**).

## Why an old order can still say "Awaiting payment"

An order stays payable for 30 minutes after it's created, and for 72 hours once the student chooses one of your payment methods (and again after you reject a payment). While a proof is waiting for your review, the order doesn't expire. Atlas updates an order's status when it is next used, so an abandoned order can keep showing **Awaiting payment** for a while. Order details shows **Payment due by** for an order that is still waiting.

## Your sales totals

On your dashboard, the **Revenue** card shows **Sales recorded in Atlas (manual payments)**: the total of the payments you approved over the last 7, 30 or 90 days, and how many orders that is. Only the organization owner sees it.

![The dashboard Revenue card showing Sales recorded in Atlas (manual payments)](shot:selling/dashboard-revenue)

> [!LIMITATION]
> These figures are the amounts you approved. Your academy received the money directly; Atlas doesn't hold it. Money you give back outside Atlas is not subtracted. Course orders has no export and shows no total.

> [!NOTE]
> Student emails are partly hidden in the orders list. Open the student from **Members** if you need their full details.

## Related

- [Review payment proofs and approve enrollments](doc:DOC-COM-003)
- [How selling courses works in Atlas](doc:DOC-COM-001)
- [Refunds for course purchases](doc:DOC-COM-005)
