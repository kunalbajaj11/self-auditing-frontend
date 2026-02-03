# Approval Workflow Guide

This guide describes how expense approval works in SelfAccounting.AI and how to use it as an approver or admin.

---

## Overview

- Expenses can be submitted by **employees** (or created by **accountants**).
- **Approvers** (and **Admins** / **Accountants**) can see **pending** expenses and **approve** or **reject** them.
- Approved expenses can then be paid and reflected in reports and accruals.

---

## Who Can Approve

- **Admin** and **Accountant:** Full access to all expenses; can approve/reject and manage workflow.
- **Approver:** Can view expenses pending approval and approve or reject them; limited editing.
- **Employee:** Cannot approve; only submits and views own expenses.

---

## Viewing Pending Approvals

1. Log in as **Admin**, **Accountant**, or **Approver**.
2. Go to **Expenses** → **Expenses** (or the main expense list).
3. Use the **status** or **filter** option to show **Pending approval** (or similar) items.
4. Open an expense to see details, receipt, and vendor/category/amount.

---

## Approving an Expense

1. Open the expense from the list (pending items).
2. Review amount, vendor, category, date, and attachment.
3. Click **Approve** (or equivalent). The expense status changes to approved.
4. Optionally add an approval note or comment if the system supports it.

---

## Rejecting an Expense

1. Open the expense.
2. Click **Reject**.
3. If prompted, enter a reason (e.g. “Missing receipt”, “Wrong category”). This helps the employee correct and resubmit.
4. The expense status changes to rejected; the submitter may edit and resubmit.

---

## After Approval

- Approved expenses are included in financial reports and can be selected for **payment**.
- **Payments** are recorded via **Expenses** → **Payments** (link payment to vendor or to specific expenses).
- Accrual and payables reports will reflect approved-but-unpaid items where applicable.

---

## Delegation and Escalation

- Approval is role-based: any user with **Approver**, **Accountant**, or **Admin** role can act on pending items in scope.
- There is no built-in “delegate to another user” in this workflow; reassign by changing user roles (Admin → User Management) or by having multiple approvers who can all see the same pending list.
- For audit trail, use **Audit logs** (Admin/Auditor) to see who approved or rejected and when.

---

## Tips for Approvers

- Always check the **receipt/attachment** before approving.
- Ensure **category** and **VAT** are correct for reporting.
- Reject with a clear reason so submitters can fix and resubmit quickly.

---

*Last updated: February 2025*
