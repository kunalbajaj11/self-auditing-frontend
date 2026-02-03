# Proforma Invoices & Purchase Orders

This guide covers **proforma invoices** (quotes/drafts) and **purchase orders (PO)** in SelfAccounting.AI.

---

## Proforma Invoices

### What Is a Proforma Invoice?

- A **proforma invoice** is a preliminary document sent **before** a sale is final — effectively a quote or estimate.
- It is **not** a legal request for payment and does **not** create revenue or VAT until converted to a **tax invoice**.

### When to Use

- Sending a quote to a customer.
- Customs or financing documentation.
- Showing the customer what the final invoice will look like.

### In SelfAccounting.AI

- New sales invoices can be created as **Proforma** by default.
- They appear in the invoice list with a distinct status (e.g. “Proforma”).
- **Convert to Tax Invoice** when the customer confirms; the invoice then gets a formal number and is included in revenue and VAT reports.

### Workflow

1. Create sales invoice → saved as **Proforma**.
2. Send PDF to customer (preview / email).
3. On confirmation → **Convert to Tax Invoice**.
4. When payment is received → **Record payment** (bank or cash).

---

## Purchase Orders (PO)

### What Is a Purchase Order?

- A **purchase order** is a document **you** (the buyer) send to a **vendor** to commit to buying goods or services at agreed prices and terms.
- It does **not** create an expense in the books until you receive goods/services and match an invoice.

### When to Use

- Ordering from suppliers with agreed prices.
- Tracking commitments and matching later vendor invoices.
- Budget vs actual tracking.

### PO Workflow in SelfAccounting.AI

1. **Create PO:** **Expenses** → **Purchase Order** → Create. Select vendor, date, add line items (description, quantity, unit price, VAT). Save as **Draft**.
2. **Send to vendor:** Use **Send** or **Email** to send the PO (e.g. as PDF) to the vendor. Status can move to **Sent**.
3. **Receive goods/services:** When the vendor delivers, you can update **received quantities** on the PO (Partially received / Fully received).
4. **Vendor invoice arrives:** Create an **Expense** (or bill) for the vendor invoice and **link it to the PO**.
5. **Match and close:** Match amounts and line items; mark PO as **Invoiced** or **Closed** when fully processed.

### PO Statuses

- **Draft** — Being prepared.  
- **Sent** — Sent to vendor.  
- **Acknowledged** — Vendor confirmed.  
- **Partially received** — Some items received.  
- **Fully received** — All items received.  
- **Invoiced** — Vendor invoice received and linked.  
- **Closed** — Fully processed.  
- **Cancelled** — Order cancelled.

### Converting PO to Expense

- When the vendor invoice arrives, create a new **Expense** and link it to the PO. The system can pre-fill vendor, amounts, and line items from the PO. Then attach the invoice and save.

---

## Quick Reference

| Item | Path |
|------|------|
| Proforma invoice | Sales → Invoices (create as Proforma) |
| Convert to tax invoice | Open proforma → Convert to Tax Invoice |
| Create PO | Expenses → Purchase Order → Create |
| Link expense to PO | When creating expense, select PO |
| Send PO | Open PO → Send / Email |

---

*Last updated: February 2025*
