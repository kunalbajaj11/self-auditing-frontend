# Expense Management Guide

This guide explains how to create, edit, and manage expenses in SelfAccounting.AI.

---

## Where to Manage Expenses

- **Admin / Accountant:** **Expenses** → **Expenses** in the main menu. Full list with filters; create and edit any expense.
- **Employee:** **Upload Expense** or **My Expenses**. Create and edit only your own expenses.

---

## Creating an Expense

1. Go to **Expenses** → **Expenses** (admin) or **Upload Expense** / **My Expenses** (employee).
2. Click **Add Expense** (or equivalent).
3. Fill in:
   - **Vendor** — Select existing vendor or enter name. Vendors can be added under Contacts → Vendors.
   - **Category** — Choose an expense category (from Settings → Expense Categories).
   - **Expense type** — e.g. OPEX, CAPEX (from Settings → Expense Types).
   - **Amount** — Value in organization currency.
   - **Date** — Expense date.
   - **Description / notes** — Optional.
   - **VAT** — Often auto-calculated from tax settings; can override if needed.
   - **Attachments** — Upload receipt or supporting document (recommended).
4. Optionally link to a **Purchase Order** if the expense relates to a PO.
5. Save. The expense appears in the list and in reports according to your role.

---

## Editing an Expense

- **Admin / Accountant:** Open the expense from the list and use **Edit**; change any field and save.
- **Employee:** You can edit only your own expenses from **My Expenses**.

---

## Expense List and Filters

- Filter by date range, category, vendor, status, and (for admin) user.
- Sort by date, amount, vendor, etc.
- Use status filters (e.g. draft, pending approval, approved, paid) when approval workflow is used.

---

## Categories and Expense Types

- **Categories** (e.g. Fuel, Travel, Utilities) are used for reporting and often for VAT treatment. Configure under **Settings** → **Expense Categories**.
- **Expense types** (e.g. OPEX, CAPEX) drive how expenses post to the **chart of accounts**. Configure under **Settings** → **Expense Types**; you can link types to ledger accounts.

---

## Receipts and Attachments

- Attach one or more files (receipt, invoice scan) when creating or editing an expense.
- Supported formats typically include PDF and common image types. See the **Receipt & OCR Guide** for best results from receipt scanning and OCR.

---

## Linking to Purchase Orders

- When creating an expense that relates to a purchase order, select the PO. Amounts and line items can be brought in from the PO where supported.
- After saving, the expense can be linked to the PO for tracking and matching.

---

## VAT and Tax

- VAT is often calculated automatically from the amount and the tax rules (Settings → Tax Settings).
- You can override VAT amount or rate on the expense if required. Vendor TRN may be used for reverse charge or zero-rating where applicable.

---

## Payments and Accruals

- **Payments:** Record payments against expenses (or against vendors) via **Expenses** → **Payments**.
- **Accruals:** Expenses can be accrued for period-end reporting; accrual status and reports are available to Admin and Accountant.

---

## Quick Reference

| Task | Path |
|------|------|
| Create/Edit expense | Expenses → Expenses → Add / Edit |
| Expense categories | Settings → Expense Categories |
| Expense types | Settings → Expense Types |
| Vendors | Contacts → Vendors |
| Record payment | Expenses → Payments |

---

*Last updated: February 2025*
