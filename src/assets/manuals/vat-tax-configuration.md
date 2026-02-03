# VAT & Tax Configuration Guide

This guide explains how to configure VAT and tax settings in SelfAccounting.AI for UAE (and similar jurisdictions).

---

## Where to Configure Tax

- **Path:** **Settings** → **Tax Settings** (or `/admin/settings/tax`).
- **Role:** Admin.

---

## Why Tax Settings Matter

- **Invoices:** Correct VAT on sales invoices and correct treatment (standard, zero-rated, exempt).
- **Expenses:** VAT on purchases (input VAT) and reverse charge where applicable.
- **Reports:** VAT Control Account and reports used for FTA/VAT return.
- **Compliance:** TRN (VAT registration number) and rates must match your registration.

---

## Organization TRN (VAT Number)

- Your **VAT number (TRN)** is set in **Settings** → **Organization Settings** (company profile).
- It appears on tax invoices and may be used for reverse charge and reporting. Keep it accurate.

---

## Tax Rates in Tax Settings

1. Go to **Settings** → **Tax Settings**.
2. Add **tax rates** as used in your jurisdiction, for example:
   - **Standard rate** (e.g. 5% for UAE).
   - **Zero rate** (0%) for zero-rated supplies.
   - **Exempt** — no VAT (different from 0% for reporting).
3. Name each rate clearly (e.g. “UAE Standard 5%”, “Zero-rated”) and set the percentage or type.
4. Save. These rates are then available on invoices and expenses.

---

## Applying VAT on Invoices

- When creating a **sales invoice**, select the correct VAT rate (or default) per line or for the invoice.
- Standard-rated lines will show 5% (or your rate); zero-rated and exempt stay out of VAT totals.
- The **VAT Control Account** report will show output VAT from these invoices.

---

## Applying VAT on Expenses

- When creating an **expense**, the system often suggests VAT from tax settings. You can override if needed.
- **Vendor TRN:** If the vendor is VAT-registered, enter or select their TRN so the system can apply the correct treatment (e.g. reverse charge where applicable).
- Input VAT from expenses feeds into the **VAT Control Account** (input VAT).

---

## VAT Control Account Report

- **Path:** **Reports** → **VAT Control Account**.
- Use it to see output VAT (sales) vs input VAT (purchases) and to prepare your VAT return. Ensure tax settings and TRN are correct so this report matches your records.

---

## Zero-Rated and Exempt

- **Zero-rated:** 0% VAT; still a taxable supply (reported but at 0%).
- **Exempt:** Not subject to VAT; different reporting treatment.
- Configure both in Tax Settings and choose the right option per invoice line or expense.

---

## Multiple Currencies

- Tax is typically calculated in the **transaction currency**. Base currency and exchange rates are set under **Settings** → **Currency & Exchange Rates**; VAT amounts may be converted for reporting in base currency.

---

## Quick Reference

| Task | Path |
|------|------|
| Tax rates | Settings → Tax Settings |
| Organization TRN | Settings → Organization Settings |
| VAT report | Reports → VAT Control Account |
| Currency | Settings → Currency & Exchange Rates |

---

*Last updated: February 2025*
