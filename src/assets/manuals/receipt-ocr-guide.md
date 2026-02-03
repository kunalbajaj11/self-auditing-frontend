# Receipt & OCR Guide

SelfAccounting.AI can extract data from receipt and invoice images or PDFs using OCR (optical character recognition). This guide explains how to get the best results.

---

## Supported Formats

- **Images:** JPEG, PNG, and other common image formats.
- **Documents:** PDF (single or multi-page).

Upload via the expense form when creating or editing an expense, or via the **Upload Expense** flow (employee).

---

## How to Upload a Receipt

1. When creating or editing an expense, go to the **Attachments** or **Receipt** section.
2. Click **Upload** or drag and drop the file(s).
3. If OCR is enabled, the system will attempt to extract:
   - Vendor name  
   - Date  
   - Amount (total and sometimes VAT)  
   - Line items (where supported)  
4. Review the auto-filled fields and correct any mistakes before saving.

---

## Getting Better OCR Results

- **Quality:** Use clear, well-lit photos or scans. Avoid blur, shadows, or skewed angles.
- **Crop:** Include only the receipt/invoice; crop out table or background.
- **Orientation:** Right-side up; avoid sideways or upside-down images.
- **Format:** PDFs from email or apps often give good results; photos of paper receipts work when the text is readable.
- **Size:** Very small thumbnails or heavily compressed images may reduce accuracy.

---

## When OCR Doesn’t Work Well

- Handwritten receipts often are not extracted accurately — enter details manually.
- Faded or low-contrast text may be missed or wrong — verify amounts and dates.
- Non-standard layouts or languages may need manual entry.
- If extraction fails, you can still attach the file and fill in all fields yourself.

---

## Manual Entry After Upload

- You can always type or change:
  - Vendor name  
  - Date  
  - Amount and VAT  
  - Category and expense type  
- Keeping the attachment ensures an audit trail even when data is entered manually.

---

## Multiple Attachments

- You can attach more than one file per expense (e.g. receipt + supporting invoice).
- OCR typically runs on the first or primary attachment; use the best-quality image as the main receipt.

---

## Privacy and Security

- Attachments are stored securely and are visible only to users who can access that expense (by role and organization).
- Do not upload sensitive data that is not needed for the expense (e.g. full card numbers).

---

## Troubleshooting

- **“OCR failed” or no data extracted:** Re-upload a clearer image or enter data manually.
- **Wrong amount or date:** Correct the fields after extraction; the attachment remains as proof.
- **Vendor not recognized:** Select or create the vendor in Contacts → Vendors and link the expense to it.

For more help, see **Troubleshooting & FAQ** or contact support.

---

*Last updated: February 2025*
