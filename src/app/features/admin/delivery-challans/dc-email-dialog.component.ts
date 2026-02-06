import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeliveryChallansService } from '../../../core/services/delivery-challans.service';

@Component({
  selector: 'app-dc-email-dialog',
  templateUrl: './dc-email-dialog.component.html',
  styleUrls: ['./dc-email-dialog.component.scss'],
})
export class DCEmailDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DCEmailDialogComponent>,
    private readonly deliveryChallansService: DeliveryChallansService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA)
    public data: { dcId: string; customerEmail?: string; challanNumber: string },
  ) {
    this.form = this.fb.group({
      recipientEmail: [
        data.customerEmail || '',
        [Validators.required, Validators.email],
      ],
      subject: [`Delivery Challan ${data.challanNumber}`, Validators.required],
      message: ['Please find attached Delivery Challan.', Validators.required],
    });
  }

  ngOnInit(): void {}

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const value = this.form.getRawValue();

    this.deliveryChallansService
      .sendDeliveryChallanEmail(this.data.dcId, {
        recipientEmail: value.recipientEmail,
        subject: value.subject,
        message: value.message,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Delivery Challan email sent successfully', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to send delivery challan email',
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

