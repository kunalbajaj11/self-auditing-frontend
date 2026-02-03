# Admin Operations Guide

This guide summarizes day-to-day admin tasks in SelfAccounting.AI: organization settings, users, numbering, ledger accounts, and related configuration.

---

## Organization Settings

**Path:** Settings → Organization Settings (`/admin/company`)

- **Company name**, legal name, **VAT number (TRN)**
- **Address**, contact person, contact email
- **Currency** (base currency), **region**
- **Bank account details** for invoices (name, IBAN, Swift, branch, etc.)

Keep this up to date; it appears on invoices and in reports.

---

## User Management

**Path:** Settings → User Management (`/admin/users`)

- **Invite user:** Name, email, password, role (Admin, Accountant, Approver, Auditor, Employee), optional phone.
- **Edit user:** Change name, email, phone, role, or status.
- **Deactivate user:** Set status to Inactive so they can no longer log in.
- **User limits:** Standard plan = 5 users; Premium/Enterprise = unlimited. When at limit, upgrade is required to add more users.

---

## Invoice Template

**Path:** Settings → Invoice Template (`/admin/settings/invoice-template`)

- Upload **company logo**
- Set **footer** text (terms, payment instructions)
- Adjust **branding** if options are available

---

## Numbering Sequences

**Path:** Settings → Numbering Sequences (`/admin/settings/numbering`)

- **Invoice number** prefix (e.g. INV-2025-)
- **Expense / receipt** reference format
- Other document numbering as needed

---

## Tax Settings

**Path:** Settings → Tax Settings (`/admin/settings/tax`)

- Add/edit **VAT rates** (e.g. 5% standard, 0% zero-rated, exempt)
- Ensures correct VAT on invoices and expenses and in VAT reports

---

## Currency & Exchange Rates

**Path:** Settings → Currency & Exchange Rates (`/admin/settings/currency`)

- Add **secondary currencies** if you operate in multiple currencies
- Set or import **exchange rates** for reporting and conversions

---

## Expense Categories

**Path:** Settings → Expense Categories (`/admin/categories`)

- Add, edit, or deactivate categories (e.g. Fuel, Travel, Utilities)
- Categories drive expense reporting and VAT treatment

---

## Expense Types

**Path:** Settings → Expense Types (`/admin/expense-types`)

- Add or edit types (e.g. OPEX, CAPEX) and link to **ledger accounts**
- Controls how expenses post to the chart of accounts

---

## Ledger Accounts (Chart of Accounts)

**Path:** Settings → Ledger Accounts (`/admin/ledger-accounts`)

- Add **custom ledger accounts** (name, category: asset, liability, equity, revenue, expense)
- Required for journal entries and for mapping in migrations (see **Data Import Templates** and **Migration: Tally & Zoho**)

---

## Bank and Cash Accounts

**Path:** Banking → Bank Accounts; Banking → Cash Accounts

- Add **bank accounts** (name, currency, opening balance)
- Add **petty cash** or other cash accounts
- Needed for bank reconciliation and accurate cash tracking

---

## Customers and Vendors

- **Customers:** Contacts → Customers — add before creating sales invoices.
- **Vendors:** Contacts → Vendors (or Expenses → Vendors) — add before recording expenses.

---

## Notifications / Reminders

**Path:** Settings → Email / Notifications (or Reminders & Alerts)

- View and manage in-app notifications
- Mark as read; follow links to related expenses or invoices

---

## Payroll and Inventory (If Enabled)

- **Payroll:** Payroll → Salary Profiles, Payroll → Payroll Runs (when enabled for your license).
- **Inventory:** Inventory → Products, Locations, Stock Movements (when enabled).

---

## Quick Reference

| Task | Path |
|------|------|
| Company profile | Settings → Organization Settings |
| Users | Settings → User Management |
| Invoice template | Settings → Invoice Template |
| Numbering | Settings → Numbering Sequences |
| Tax | Settings → Tax Settings |
| Currency | Settings → Currency & Exchange Rates |
| Categories | Settings → Expense Categories |
| Expense types | Settings → Expense Types |
| Ledger accounts | Settings → Ledger Accounts |
| Bank/Cash accounts | Banking → Bank / Cash Accounts |
| Customers / Vendors | Contacts → Customers / Vendors |

---

*Last updated: February 2025*
