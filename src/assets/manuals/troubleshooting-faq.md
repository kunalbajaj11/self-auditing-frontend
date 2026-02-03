# Troubleshooting & FAQ

Common issues and quick answers when using SelfAccounting.AI.

---

## Login & Account

**I forgot my password.**  
Use **Forgot Password** on the login page. Enter your email and follow the reset link (check spam if you don’t see it). Links expire after a short time; request again if needed.

**I can’t log in — “Invalid credentials”.**  
Check email and password (caps lock, spelling). If correct, use Forgot Password to set a new one. If the account was deactivated, contact your Admin.

**“User limit reached” when inviting someone.**  
Standard plan allows 5 users. Upgrade to Premium/Enterprise for more users, or deactivate a user who no longer needs access.

**“Organization context is required” or similar.**  
Your user may not be linked to an organization. Contact your account manager or Super Admin to fix this.

---

## Expenses & Receipts

**OCR didn’t extract anything from my receipt.**  
Upload a clearer image (good light, no blur, right-side up). You can still attach the file and enter all details manually. See **Receipt & OCR Guide**.

**I can’t see other users’ expenses.**  
Employees see only their own expenses. Admins and Accountants see all organization expenses. If you should have access, your role may need to be updated (Admin → User Management).

**Expense is stuck in “Pending approval”.**  
An Approver, Accountant, or Admin must open the expense and Approve or Reject. See **Approval Workflow Guide**.

**Wrong VAT on expense or invoice.**  
Check **Settings → Tax Settings** (rates) and the VAT/TRN on the vendor or customer. You can often override VAT on the individual expense or invoice line.

---

## Invoices & Payments

**Invoice total or VAT looks wrong.**  
Confirm tax settings and the VAT rate on each line. Ensure company TRN and address are set in **Settings → Organization Settings**.

**I don’t see “Convert to Tax Invoice”.**  
Only **Proforma** invoices can be converted. Open the invoice and check its status; convert from the invoice detail view.

**Payment not reflecting on invoice.**  
Use **Record payment** (or Payments) and link the payment to the correct invoice and account (bank/cash). Refresh the invoice view.

---

## Bank & Reconciliation

**Upload bank statement failed or columns wrong.**  
Use a CSV with clear columns (Date, Description, Debit, Credit). Column names vary by bank; use the mapping step in the import if available. See **Bank Statement Import & Reconciliation**.

**Can’t match a statement line.**  
Create a **journal entry** or **expense** (e.g. bank fee) for that line, then match the statement line to it. Or leave unmatched and document.

---

## Reports

**Report doesn’t match my expectation.**  
Check the **date range** and that all transactions (expenses, payments, journal entries, invoices) are posted. Reconcile bank and VAT first. Run **Trial Balance** to verify totals.

**VAT report doesn’t match my return.**  
Verify **Settings → Tax Settings** and **Organization TRN**. Ensure all invoices and expenses have correct VAT treatment (standard, zero-rated, exempt). See **VAT & Tax Configuration**.

---

## Imports & Migration

**I don’t see “Bulk Import” for journal entries.**  
Bulk import is enabled per organization (often called “Migration”). Contact your account manager or Super Admin to enable it for your org.

**Opening balance import failed or totals don’t match.**  
Ensure **total debits = total credits** in your CSV. Use the correct **account mapping** (e.g. Owner/Shareholder Account for equity). See **Data Import Templates** and **Migration: Tally & Zoho**.

---

## Notifications & Email

**I’m not getting emails (welcome, password reset, reminders).**  
Check spam/junk and allowlist the sender. Confirm your email in your profile. If it still fails, contact support — SMTP may need to be checked.

**Too many reminder emails.**  
Ask your Admin or support if reminder frequency can be reduced or if you can opt out of certain types. See **Notifications & Email Settings**.

---

## General

**Something’s slow or not loading.**  
Refresh the page. Try another browser or device. Clear cache if needed. If it persists, report to support with browser and what you were doing.

**I need more help.**  
See **Support & Escalation** for how to contact support and what information to provide.

---

*Last updated: February 2025*
