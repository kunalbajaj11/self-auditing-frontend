# Data Import Templates

This guide describes CSV and bulk import options in SelfAccounting.AI for opening balances, ledger accounts, and journal entries (e.g. after migrating from Tally or Zoho).

---

## Overview

- **Bulk journal import** and **opening balance** import are available when enabled for your organization (typically by your account manager or super admin).
- You can import:
  - **Journal entries** (e.g. opening balances from a trial balance export).
  - **Ledger accounts** (chart of accounts) — where supported.
- Templates and column formats are described below. Always **preview** before importing and **back up** data if possible.

---

## Opening Balances (Trial Balance Import)

Used when moving from another system (e.g. Tally, Zoho) and bringing over opening balances as journal entries.

### Export from Your Old System

- **Tally:** Display → Trial Balance → Export to Excel/CSV (as of cutover date).
- **Zoho Books:** Reports → Trial Balance → Export (as of cutover date).
- Ensure columns include: **Account name** (or code), **Debit**, **Credit**.

### Expected CSV Format

- **Columns:** Account Name (or Account Code), Debit, Credit.
- One row per account with a balance. Debit and credit are positive numbers; the system will create one journal entry per line (debit balance → Dr that account, Cr Owner/Shareholder account; credit balance → reverse).
- **Balancing account:** Opening balance equity is posted to **Owner/Shareholder Account** (not Retained Earnings, which is system-calculated).

### In SelfAccounting.AI

- **Path:** Expenses → Journal Entries → **Bulk Import** (when enabled).
- Upload CSV → **Preview** mapping (account name → system account or ledger account).
- Confirm and **Import**. Validate that total debits = total credits before posting.

### Account Name Mapping

Common mappings (Tally/Zoho name → SelfAccounting.AI):

| Typical name in export | SelfAccounting.AI account |
|------------------------|----------------------------|
| Cash, Cash in Hand | cash |
| Bank, Current Account | bank |
| Sundry Debtors, Receivables | accounts_receivable |
| VAT Input, Input VAT | vat_receivable |
| Sundry Creditors, Payables | accounts_payable |
| VAT Output, Output VAT | vat_payable |
| Share Capital, Capital | share_capital |
| Owner's Capital, Drawings | owner_shareholder_account |
| Sales, Revenue | sales_revenue |
| Expenses | general_expense |
| Custom account | ledger:{uuid} (must exist) |

Unmapped names may need a custom ledger account created first, or mapping in the import UI.

---

## Ledger Accounts Bulk Import

- If supported, use **Settings** → **Ledger Accounts** and look for **Bulk import** or **Import**.
- CSV format typically: **Name**, **Category** (asset, liability, equity, revenue, expense), optional **Code**.
- Create accounts first if you need to reference them in journal entry import (e.g. `ledger:{uuid}`).

---

## Journal Entries Bulk Import

- When **Bulk Import** is enabled under Journal Entries, the system may accept a CSV of entries with columns such as:
  - **Date**
  - **Debit account** (code or ledger ID)
  - **Credit account**
  - **Amount**
  - **Description**
- Each row = one journal entry (single debit, single credit). Ensure total debits = total credits across the file.
- Use **Preview** to check mapping and totals before importing.

---

## Best Practices

- **Backup:** Ensure you have a backup or test in a copy before large imports.
- **Cutover date:** Use a single cutover date (e.g. start of fiscal year) for opening balances.
- **Verify:** After import, run **Trial Balance** and compare to your exported trial balance.
- **Small batch first:** Test with a few rows before importing the full file.

---

## Where Import Lives in the App

| What | Where (when enabled) |
|------|------------------------|
| Opening balances / trial balance | Expenses → Journal Entries → Bulk Import |
| Ledger accounts | Settings → Ledger Accounts → Import (if available) |
| Journal entries | Expenses → Journal Entries → Bulk Import |

If you don’t see **Bulk Import**, it may need to be enabled for your license (contact your account manager). See also **Migration: Tally & Zoho Books**.

---

*Last updated: February 2025*
