import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-invoice-email-dialog',
  templateUrl: './invoice-email-dialog.component.html',
  styleUrls: ['./invoice-email-dialog.component.scss'],
})
export class InvoiceEmailDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  invoice: SalesInvoice;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<InvoiceEmailDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { invoice: SalesInvoice },
  ) {
    this.invoice = data.invoice;
    this.form = this.fb.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      subject: [`Invoice ${this.invoice.invoiceNumber}`, Validators.required],
      message: ['Please find attached invoice for your review and payment.', Validators.required],
    });
  }

  ngOnInit(): void {
    // Email field already pre-filled in constructor
    // Customer email will be loaded from customer service if needed
  }

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    this.invoicesService.sendInvoiceEmail(this.invoice.id, {
      recipientEmail: formValue.recipientEmail,
      subject: formValue.subject,
      message: formValue.message,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Invoice email sent successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to send invoice email',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

