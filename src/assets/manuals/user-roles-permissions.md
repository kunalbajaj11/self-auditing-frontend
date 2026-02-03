# User Roles & Permissions

SelfAccounting.AI uses **role-based access control (RBAC)**. Each user has one role that defines what they can see and do within the organization.

---

## Roles Overview

| Role | Who uses it | Main access |
|------|-------------|-------------|
| **Super Admin** | Platform operators | All organizations, license keys, plans |
| **Admin** | Org owner / finance lead | Full access inside the organization |
| **Accountant** | Bookkeepers, finance team | Expenses, reports, reconciliation; no user management |
| **Approver** | Managers | View and approve/reject pending expenses; view reports |
| **Auditor** | Internal audit / compliance | Read-only: expenses, reports, audit logs |
| **Employee** | Staff submitting expenses | Own expenses only; upload receipts; no reports |

---

## Super Admin

- **Access:** System-wide; not tied to one organization.
- **Can:** Manage all organizations, create and manage license keys, view platform analytics, manage plans, activate/deactivate organizations.
- **Use case:** Platform administrators.

---

## Admin

- **Access:** Full access within their organization.
- **Can:**
  - Manage all users (invite, edit, deactivate)
  - Create, edit, delete expenses
  - Manage categories, expense types, ledger accounts
  - Run all reports
  - Bank reconciliation, accruals
  - Organization settings (company profile, tax, invoice template, numbering)
  - Sales invoices, customers, vendors, purchase orders, payments, journal entries
- **Use case:** Organization administrators, finance managers.

---

## Accountant

- **Access:** Financial management within the organization.
- **Can:**
  - View and manage all expenses
  - Create and edit expenses, manage categories
  - Run financial reports
  - Bank reconciliation, accruals
- **Cannot:** Manage users or change organization settings.
- **Use case:** Accounting professionals, bookkeepers.

---

## Approver

- **Access:** Approval workflow and limited viewing.
- **Can:**
  - View expenses pending approval
  - Approve or reject expenses
  - View reports
- **Cannot:** Create expenses or manage categories/settings.
- **Use case:** Managers who approve expense claims.

---

## Auditor

- **Access:** Read-only for auditing.
- **Can:**
  - View all expenses and reports
  - Access audit logs
  - Generate audit reports
- **Cannot:** Create or edit any data.
- **Use case:** Internal auditors, compliance.

---

## Employee

- **Access:** Personal expense submission only.
- **Can:**
  - Create and manage own expenses
  - Upload receipts and attachments
  - View own expenses only
- **Cannot:** View other users’ expenses, access reports, or admin features.
- **Use case:** Staff submitting expense claims.

---

## Plan Limits (Users)

- **Standard:** Up to 5 users per organization.
- **Premium / Enterprise:** Unlimited users (subject to your license).

When the user limit is reached, the “Invite User” option is disabled until the plan is upgraded.

---

## Summary Matrix

| Feature | Admin | Accountant | Approver | Auditor | Employee |
|---------|-------|------------|----------|---------|----------|
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all expenses | ✅ | ✅ | ⚠️ Pending | ✅ | ❌ |
| Create/Edit expenses | ✅ | ✅ | ❌ | ❌ | Own only |
| Manage categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | View | ✅ | ❌ |
| Bank reconciliation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Organization settings | ✅ | ❌ | ❌ | ❌ | ❌ |

---

*Last updated: February 2025*
