# Notifications & Email Settings

This guide explains how notifications and email work in SelfAccounting.AI and where to configure them.

---

## Overview

- SelfAccounting.AI can send **emails** for:
  - Welcome after registration
  - Password reset
  - Reminders and alerts (e.g. pending approvals, overdue invoices, compliance)
  - Scheduled report delivery (if enabled)
- Notifications may appear **in-app** (e.g. Reminders & Alerts) and/or by **email**, depending on configuration.

---

## Where to Manage Notifications (Admin)

- **Path:** **Settings** → **Email / Notifications** (or **Reminders & Alerts**) — often under the same menu as **Notifications**.
- Here you may see:
  - Unread notifications list
  - Options to mark as read
  - Links to the related record (expense, invoice, etc.)

---

## Email Reminders and Alerts

- **Reminders** can be set for:
  - Expenses pending approval
  - Overdue receivables (invoices not paid)
  - Upcoming tax or compliance deadlines
  - Other configurable events
- If your plan supports it, you may be able to:
  - Turn reminders on/off per type
  - Set frequency (e.g. daily digest, immediate)
  - Choose recipients (e.g. admin, accountant)

---

## Email Delivery and SMTP

- **Outgoing email** is typically sent via SMTP configured at the **platform** level (not per organization). If you are the platform operator, configure SMTP in the backend or environment (e.g. `.env`).
- As an **organization admin**, you usually cannot change SMTP; contact support or your account manager if emails are not received.
- Ensure **support@selfaccounting.ai** (or your configured “from” address) is not blocked by spam filters; ask users to allowlist it if needed.

---

## In-App Notifications

- **Path:** **Settings** → **Reminders & Alerts** (or the notifications icon in the shell).
- Users see a list of notifications; opening one may take them to the related expense, invoice, or report.
- Mark notifications as **read** to keep the list manageable. Unread count may appear in the menu.

---

## What Users Receive by Default

- **New user:** Welcome email after an admin creates the user or after registration.
- **Password reset:** Email with reset link (token expires after a short period, e.g. 1 hour).
- **Reminders:** Depends on plan and configuration (e.g. pending approvals, overdue invoices).

---

## Troubleshooting

- **Not receiving emails:** Check spam/junk; allowlist the sender; confirm email address in profile; contact support if SMTP may be misconfigured.
- **Too many emails:** Ask admin or support if reminder frequency can be reduced or if you can opt out of certain reminder types.
- **In-app notifications not updating:** Refresh the page or re-open the notifications panel.

---

## Quick Reference

| Task | Path |
|------|------|
| View notifications | Settings → Email / Notifications or Reminders & Alerts |
| Mark as read | Open notification or use “Mark all read” if available |

---

*Last updated: February 2025*
