import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesOrdersService } from '../../../core/services/sales-orders.service';

@Component({
  selector: 'app-so-email-dialog',
  templateUrl: './so-email-dialog.component.html',
  styleUrls: ['./so-email-dialog.component.scss'],
})
export class SOEmailDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<SOEmailDialogComponent>,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      soId: string;
      customerEmail?: string;
      soNumber: string;
    },
  ) {
    this.form = this.fb.group({
      recipientEmail: [
        data.customerEmail || '',
        [Validators.required, Validators.email],
      ],
      subject: [`Sales Order ${data.soNumber}`, Validators.required],
      message: [
        'Please find attached Sales Order for your review and confirmation.',
        Validators.required,
      ],
    });
  }

  ngOnInit(): void {}

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    this.salesOrdersService
      .sendSalesOrderEmail(this.data.soId, {
        recipientEmail: formValue.recipientEmail,
        subject: formValue.subject,
        message: formValue.message,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Sales Order email sent successfully', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to send sales order email',
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

