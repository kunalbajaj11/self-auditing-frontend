import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreditNotesService, CreditNote } from '../../../core/services/credit-notes.service';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-credit-note-apply-dialog',
  templateUrl: './credit-note-apply-dialog.component.html',
  styleUrls: ['./credit-note-apply-dialog.component.scss'],
})
export class CreditNoteApplyDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  creditNote: CreditNote;
  invoices: SalesInvoice[] = [];
  loadingInvoices = false;
  maxApplyAmount = 0;
  selectedInvoice: SalesInvoice | null = null;
  invoiceOutstandingAmount = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CreditNoteApplyDialogComponent>,
    private readonly creditNotesService: CreditNotesService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { creditNote: CreditNote },
  ) {
    this.creditNote = data.creditNote;
    const totalAmount = parseFloat(this.creditNote.totalAmount || '0');
    const appliedAmount = parseFloat(this.creditNote.appliedAmount || '0');
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
    this.invoicesService.listInvoices({ paymentStatus: 'unpaid' }).subscribe({
      next: (invoices) => {
        this.loadingInvoices = false;
        this.invoices = invoices;
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

      // Set apply amount to minimum of remaining credit note amount or invoice outstanding
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

    this.creditNotesService.applyCreditNote(
      this.creditNote.id,
      formValue.invoiceId,
      parseFloat(formValue.applyAmount),
    ).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Credit note applied successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to apply credit note',
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

