# Getting Started & Quickstart

**Audience:** New clients (admin users)  
**Time:** 30–60 minutes

---

## Overview

Welcome to SelfAccounting.AI. This guide walks you through registration and the minimum setup so you can start tracking expenses and running reports.

**You will need:**
- Your **license key** (from your account manager)
- Company details (name, VAT number, address)
- Admin name, email, and password
- Bank account details (for invoices and reconciliation)

---

## 1. Register with License Key

1. Open the **homepage** and click **Get Started** (or go to **Register with License**).
2. Enter your **license key** and click **Validate**.
3. Fill in the registration form:
   - **Organization Name** (required) — Legal business name
   - **VAT Number** — Your TRN for UAE VAT
   - **Address**, **Currency** (e.g. AED), **Region** (e.g. UAE)
   - **Admin Name**, **Admin Email**, **Admin Password** (min 8 characters)
4. Click **Register**. You will be logged in and a welcome email sent.

**Done automatically:** Organization created, default expense categories created, license activated.

---

## 2. Essential Configuration (Do First)

### Company Profile  
**Path:** Settings → Organization Settings (`/admin/company`)

- Company name, VAT number (TRN), currency, contact, registered address
- Bank account details (for invoices)

### Tax Settings  
**Path:** Settings → Tax Settings (`/admin/settings/tax`)

- Add standard VAT rate (e.g. 5% for UAE)
- Add zero-rated/exempt rules if needed

### Invoice Template  
**Path:** Settings → Invoice Template (`/admin/settings/invoice-template`)

- Upload company logo, set footer and branding

### Numbering  
**Path:** Settings → Numbering Sequences (`/admin/settings/numbering`)

- Set invoice prefix (e.g. INV-2025-), expense reference format

---

## 3. Master Data (Before First Expense)

### Expense Categories  
**Path:** Settings → Expense Categories (`/admin/categories`)

- Review defaults (Fuel, Food, Utilities, Travel, etc.), add or edit as needed.

### Expense Types  
**Path:** Settings → Expense Types (`/admin/expense-types`)

- Review OPEX/CAPEX etc., add custom types and link to ledger accounts if needed.

### Ledger Accounts  
**Path:** Settings → Ledger Accounts (`/admin/ledger-accounts`)

- Ensure chart of accounts has Revenue, Expenses, Bank, Receivables, Payables, VAT.

### Bank & Cash Accounts  
**Path:** Banking → Bank Accounts / Cash Accounts

- Add each bank account (name, currency, opening balance) and petty cash if used.

### Vendors  
**Path:** Contacts → Vendors (or Expenses → Vendors)

- Add main vendors; expenses are linked to a vendor.

### Customers (if you issue invoices)  
**Path:** Contacts → Customers

- Add main customers before creating sales invoices.

---

## 4. User Management

**Path:** Settings → User Management (`/admin/users`)

- Invite team: assign **Admin**, **Accountant**, **Employee** (and **Approver** / **Auditor** if used).
- Respect license user limits (e.g. Standard = 5 users).

---

## 5. First Expense

- **Admin/Accountant:** Expenses → Expenses → Add expense; choose vendor, category, amount, date; attach receipt.
- **Employee:** Upload Expense (or My Expenses) → add expense and upload receipt.

---

## Quick Reference

| Task | Path |
|------|------|
| Company Profile | Settings → Organization Settings |
| Tax | Settings → Tax Settings |
| Invoice Template | Settings → Invoice Template |
| Numbering | Settings → Numbering Sequences |
| Users | Settings → User Management |
| Categories | Settings → Expense Categories |
| Expense Types | Settings → Expense Types |
| Ledger Accounts | Settings → Ledger Accounts |
| Vendors | Contacts → Vendors |
| Bank Accounts | Banking → Bank Accounts |

---

*Last updated: February 2025*
