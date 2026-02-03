# Bank Statement Import & Reconciliation

This guide explains how to upload bank statements and reconcile them with your transactions in SelfAccounting.AI.

---

## Overview

- **Bank reconciliation** matches bank statement lines (from your bank or export) with **payments**, **expenses**, and other transactions in SelfAccounting.AI.
- You upload a statement (e.g. CSV), then **match** each statement line to the correct transaction or mark it as matched/unmatched.

---

## Where to Find It

- **Path:** **Banking** → **Upload Bank Statement** and **Banking** → **Reconciliation** (or **Bank Reconciliation**).
- **Roles:** Admin and Accountant (Enterprise plan feature where applicable).

---

## Step 1: Add Bank Accounts

Before reconciling, ensure each bank account is set up:

1. Go to **Banking** → **Bank Accounts**.
2. Add each account: name, currency, optional opening balance.
3. Use the same account names or identifiers as in your statement exports so matching is clear.

---

## Step 2: Upload a Bank Statement

1. Go to **Banking** → **Upload Bank Statement**.
2. Select the **bank account** this statement belongs to.
3. Choose the **statement file** (CSV or the supported format). Many banks allow “Export to CSV” or “Download statement”.
4. Upload the file. The system parses lines (date, description, debit, credit, balance, etc.) and shows a preview.
5. Confirm or adjust column mapping if the system offers it, then **Import** or **Continue**.

---

## Supported Formats

- **CSV** is the most common. Typical columns:
  - Date  
  - Description / narrative  
  - Debit amount  
  - Credit amount  
  - Balance (optional)  
- Column names and date formats vary by bank. The import may allow you to map columns. If your bank’s export is different, a standard CSV with Date, Description, Debit, Credit is usually sufficient.

---

## Step 3: Reconcile (Match Transactions)

1. Go to **Banking** → **Reconciliation** (or **Bank Reconciliation**).
2. Select the **bank account** and the **statement** or date range you imported.
3. You’ll see:
   - **Statement lines** (from the uploaded file)  
   - **Transactions** in SelfAccounting.AI (payments, expenses, journal entries, etc.) that might match  
4. For each statement line:
   - **Match** it to the correct transaction (select from list or suggest match), or  
   - **Mark as matched** if it’s a fee, transfer, or other item you don’t need to link to a single transaction, or  
   - Leave **unmatched** and resolve later.  
5. When debits and credits match your statement total, reconciliation is complete for that period.

---

## Matching Tips

- Match by **amount and date** first; then check description if there are multiple similar amounts.
- **Fees** and **bank charges:** Match to a journal entry or “Bank charges” expense if you record them; otherwise mark as matched with no transaction link.
- **Transfers** between your own accounts: Match each side to the corresponding transfer transaction or journal entry.
- Reconcile regularly (e.g. monthly) so the list of unmatched transactions stays manageable.

---

## Duplicates and Errors

- If the same bank line is matched twice, the reconciliation will be wrong. Unmatch one and assign the correct transaction.
- If a statement line has no matching transaction, create a **journal entry** or **expense** (e.g. bank fee) and then match to it, or leave as unmatched and document why.
- Correct any import errors (wrong account, wrong date range) by re-uploading or adjusting and re-running the reconciliation.

---

## Reports

- Use **Bank reconciliation** views and any **reconciliation report** to see matched vs unmatched and to confirm closing balance vs statement balance.

---

## Quick Reference

| Task | Path |
|------|------|
| Add bank account | Banking → Bank Accounts |
| Upload statement | Banking → Upload Bank Statement |
| Reconcile | Banking → Reconciliation |
| Journal entries (manual adjustments) | Expenses → Journal Entries |

---

*Last updated: February 2025*
