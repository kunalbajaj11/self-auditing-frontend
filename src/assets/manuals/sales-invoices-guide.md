# Sales Invoices & Invoicing Guide

This guide explains how to create, send, and manage sales invoices in SelfAccounting.AI.

---

## Overview

- **Sales invoices** are issued to **customers** for goods or services.
- You can create **proforma** (draft/quote) invoices and convert them to **tax invoices** when the sale is confirmed.
- Invoices can be previewed, downloaded as PDF, and sent by email. Payment status can be updated (e.g. bank received, cash received).

---

## Where to Manage Invoices

- **Path:** **Sales** → **Invoices** (or **Sales** → **Invoices** in the menu).
- **Roles:** Admin and Accountant.

---

## Before You Start

- **Customers:** Add customers under **Contacts** → **Customers** (name, contact, TRN if applicable).
- **Company profile:** Ensure **Settings** → **Organization Settings** has VAT number (TRN), address, and bank details for the invoice footer.
- **Invoice template:** Set logo and footer under **Settings** → **Invoice Template**.
- **Numbering:** Set invoice number prefix under **Settings** → **Numbering Sequences**.

---

## Creating a Sales Invoice

1. Go to **Sales** → **Invoices** and click **Create** or **New Invoice**.
2. Select **Customer**.
3. Enter **Invoice date**, **Due date** (optional).
4. Add **line items:**
   - Description  
   - Quantity  
   - Unit price  
   - VAT rate (or use default from tax settings)  
   - Amount / total per line  
5. Optional: **Discount**, **notes**, **payment terms**.
6. Review **subtotal**, **VAT**, and **total**.
7. Save. The invoice is usually created as **Proforma** first (see below).

---

## Proforma vs Tax Invoice

- **Proforma:** A draft or quote; not a demand for payment. Use for estimates and before the sale is confirmed.
- **Tax invoice:** The formal invoice for the sale; affects revenue and VAT reporting.
- **Workflow:** Create as Proforma → when the customer confirms, **Convert to Tax Invoice**. Then record payment when received.

---

## Converting Proforma to Tax Invoice

1. Open the **proforma** invoice from the list.
2. Use **Convert to Tax Invoice** (or similar).
3. The invoice gets a formal number (from your numbering sequence) and is treated as revenue and VAT in reports.

---

## PDF and Email

- **Preview / PDF:** Open the invoice and use **Preview** or **Download PDF** to check layout and send to the customer.
- **Email:** Use **Send by email** if available; enter the recipient and send. The system may attach the PDF.

---

## Recording Payment

- When the customer pays:
  1. Open the invoice.
  2. Use **Record payment** or go to **Payments received** (or Sales → Payments).
  3. Enter amount, date, and whether paid by **bank** or **cash**.
- Invoice status updates to “Paid” or “Bank/Cash received” and is reflected in receivables and bank/cash accounts.

---

## Credit Notes

- To issue a **credit note** (refund or adjustment), use **Sales** → **Credit Notes** and link it to the original invoice where supported. This reduces receivables and can adjust VAT.

---

## Invoice List and Filters

- Filter by customer, date range, status (draft, proforma, tax invoice, paid).
- Use the list to follow up on unpaid invoices and to run receivables reports.

---

## Quick Reference

| Task | Path |
|------|------|
| Create invoice | Sales → Invoices → Create |
| Customers | Contacts → Customers |
| Invoice template | Settings → Invoice Template |
| Numbering | Settings → Numbering Sequences |
| Credit notes | Sales → Credit Notes |
| Payments received | Sales → Invoices (filter) or Payments |

---

*Last updated: February 2025*
