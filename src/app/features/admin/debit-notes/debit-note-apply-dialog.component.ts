import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-debit-note-apply-dialog',
  templateUrl: './debit-note-apply-dialog.component.html',
  styleUrls: ['./debit-note-apply-dialog.component.scss'],
})
export class DebitNoteApplyDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  debitNote: DebitNote;
  invoices: SalesInvoice[] = [];
  loadingInvoices = false;
  maxApplyAmount = 0;
  selectedInvoice: SalesInvoice | null = null;
  invoiceOutstandingAmount = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DebitNoteApplyDialogComponent>,
    private readonly debitNotesService: DebitNotesService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { debitNote: DebitNote },
  ) {
    this.debitNote = data.debitNote;
    const totalAmount = parseFloat(this.debitNote.totalAmount || '0');
    const appliedAmount = parseFloat(this.debitNote.appliedAmount || '0');
    this.maxApplyAmount = Math.max(0, totalAmount - appliedAmount);

    this.form = this.fb.group({
      invoiceId: ['', Validators.required],
      applyAmount: [
        this.maxApplyAmount,
        [Validators.required, Validators.min(0.01), Validators.max(this.maxApplyAmount)],
      ],
    });
  }

  ngOnInit(): void {
    this.loadInvoices();
    
    // Watch for invoice changes
    this.form.get('invoiceId')?.valueChanges.subscribe((invoiceId) => {
      if (invoiceId) {
        this.onInvoiceChange(invoiceId);
      }
    });
  }

  loadInvoices(): void {
    this.loadingInvoices = true;
    // Prefer invoices for the same customer as this debit note (if known)
    const customerId =
      this.debitNote.invoice?.customerId ||
      this.debitNote.customerId ||
      this.debitNote.customer?.id ||
      null;

    const filters: {
      customerId?: string;
    } = {};

    if (customerId) {
      filters.customerId = customerId;
    }

    // Fetch invoices (optionally scoped to this customer). We don't filter by
    // paymentStatus here so that PARTIAL/UNPAID invoices with outstanding
    // balance are all available for applying the debit note.
    this.invoicesService.listInvoices(filters).subscribe({
      next: (invoices) => {
        this.loadingInvoices = false;
        this.invoices = invoices;

        // Pre-select the linked invoice if this debit note already has one
        const preselectInvoiceId =
          this.debitNote.invoiceId || this.debitNote.invoice?.id || null;
        if (preselectInvoiceId) {
          const exists = this.invoices.some((inv) => inv.id === preselectInvoiceId);
          if (exists) {
            this.form.patchValue({ invoiceId: preselectInvoiceId });
            this.onInvoiceChange(preselectInvoiceId);
          }
        }
      },
      error: () => {
        this.loadingInvoices = false;
      },
    });
  }

  onInvoiceChange(invoiceId: string): void {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      this.selectedInvoice = invoice;
      
      // Calculate outstanding amount for the invoice
      const totalAmount = parseFloat(invoice.totalAmount || '0');
      const paidAmount = parseFloat(invoice.paidAmount || '0');
      this.invoiceOutstandingAmount = Math.max(0, totalAmount - paidAmount);

      // Set apply amount to minimum of remaining debit note amount or invoice outstanding
      const suggestedAmount = Math.min(this.maxApplyAmount, this.invoiceOutstandingAmount);
      this.form.patchValue({
        applyAmount: suggestedAmount,
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    this.debitNotesService.applyDebitNote(
      this.debitNote.id,
      formValue.invoiceId,
      parseFloat(formValue.applyAmount),
    ).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Debit note applied successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to apply debit note',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getInvoiceOutstanding(invoice: SalesInvoice): number {
    const totalAmount = parseFloat(invoice.totalAmount || '0');
    const paidAmount = parseFloat(invoice.paidAmount || '0');
    return Math.max(0, totalAmount - paidAmount);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
