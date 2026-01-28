import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrdersService } from '../../../core/services/purchase-orders.service';

@Component({
  selector: 'app-po-email-dialog',
  templateUrl: './po-email-dialog.component.html',
  styleUrls: ['./po-email-dialog.component.scss'],
})
export class POEmailDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<POEmailDialogComponent>,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: {
      poId: string;
      vendorEmail?: string;
      poNumber: string;
    },
  ) {
    this.form = this.fb.group({
      recipientEmail: [data.vendorEmail || '', [Validators.required, Validators.email]],
      subject: [`Purchase Order ${data.poNumber}`, Validators.required],
      message: ['Please find attached Purchase Order for your review and confirmation.', Validators.required],
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

    this.purchaseOrdersService.sendPOEmail(this.data.poId, {
      recipientEmail: formValue.recipientEmail,
      subject: formValue.subject,
      message: formValue.message,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Purchase Order email sent successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to send purchase order email',
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
