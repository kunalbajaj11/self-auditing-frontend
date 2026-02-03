# Migration: Tally & Zoho Books → SelfAccounting.AI

This guide explains how to move to SelfAccounting.AI from **Tally** or **Zoho Books** using **opening balances** (Option B: post trial balance as journal entries).

---

## Approach: Opening Balances

- Export your **closing trial balance** from Tally or Zoho as of a **cutover date** (e.g. last day before you go live on SelfAccounting.AI).
- Import that trial balance into SelfAccounting.AI as **journal entries** (opening balances).
- From the cutover date onward, record all new transactions in SelfAccounting.AI.

---

## What Already Works in SelfAccounting.AI

- **Journal entries** with single debit/credit pairs — each trial balance line becomes one journal entry.
- **Account types:** cash, bank, accounts_receivable, accounts_payable, vat_receivable, vat_payable, owner_shareholder_account, share_capital, sales_revenue, general_expense, plus custom **ledger accounts**.
- **Balancing account for opening balance:** Use **Owner/Shareholder Account** (or Share Capital). Do **not** use Retained Earnings — it is system-calculated and blocked for manual entries.
- **Reports:** Trial Balance, Balance Sheet, P&L, General Ledger all use these journal entries.

---

## Client Migration Steps

### 1. Choose Cutover Date

- Example: 1 Jan 2025 or start of your fiscal year.
- All balances from the **day before** cutover will be brought in as opening balances.

### 2. Export from Tally

- **Path:** Display → Trial Balance → Export to Excel/CSV.
- **Date:** As of cutover date (or day before).
- Ensure columns: **Account Name** (or Account Code), **Debit**, **Credit**.

### 3. Export from Zoho Books

- **Path:** Reports → Trial Balance → Export.
- **Date:** As of cutover date (or day before).
- Ensure columns: **Account Name**, **Debit**, **Credit**.

### 4. Setup in SelfAccounting.AI

- Complete **organization registration** and **Getting Started** (company profile, tax, ledger accounts).
- Create **custom ledger accounts** if your chart differs from defaults (Settings → Ledger Accounts).
- Ensure **Bulk Import** / **Import Opening Balances** is enabled for your organization (contact your account manager if you don’t see it).

### 5. Import Opening Balances

- **Path:** Expenses → Journal Entries → **Bulk Import** (when enabled).
- Upload your CSV (Account Name, Debit, Credit).
- **Preview** the mapping: map Tally/Zoho account names to SelfAccounting.AI accounts (see table below).
- Confirm **total debits = total credits**, then **Import**.

### 6. Verify

- Run **Trial Balance** in SelfAccounting.AI for the cutover date (or first day after).
- Compare to the trial balance you exported from Tally/Zoho. They should match.

### 7. Go Live

- From the cutover date, record all new transactions in SelfAccounting.AI only.

---

## Account Name → SelfAccounting.AI Mapping

| Tally / Zoho name (typical) | SelfAccounting.AI |
|-----------------------------|-------------------|
| Cash, Cash in Hand | cash |
| Bank, Current Account | bank |
| Sundry Debtors, Accounts Receivable | accounts_receivable |
| VAT Input, Input VAT | vat_receivable |
| Prepaid Expenses | prepaid_expenses |
| Sundry Creditors, Accounts Payable | accounts_payable |
| VAT Output, Output VAT | vat_payable |
| Share Capital, Capital | share_capital |
| Owner's Capital, Drawings | owner_shareholder_account |
| Sales, Revenue | sales_revenue |
| Expenses, General Expense | general_expense |
| Custom account | Create in Ledger Accounts first, then use ledger:{uuid} |

Unmapped names: create as **custom ledger account** in Settings → Ledger Accounts, then map in the import or use the ledger ID in the template.

---

## Retained Earnings

- **Retained Earnings** in SelfAccounting.AI is **system-calculated** and cannot be used for manual opening balance entries.
- Use **Owner/Shareholder Account** (or **Share Capital**) as the balancing account for opening balance equity.

---

## Bulk Import Availability

- **Bulk journal import** and **opening balance import** are controlled per license/organization (often by super admin).
- If you don’t see **Bulk Import** under Journal Entries, ask your account manager to enable **Migration** (or equivalent) for your organization.

---

## Data Import Templates

- For CSV format details and column expectations, see **Data Import Templates**.
- For creating custom ledger accounts before import, see **Admin Operations** and **Getting Started**.

---

*Document version: 1.0 | Last updated: February 2025*
