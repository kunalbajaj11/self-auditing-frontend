import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LicenseKey } from '../../../core/models/license-key.model';
import { LicenseKeysService } from '../../../core/services/license-keys.service';

export interface LicenseKeyRenewDialogData {
  license: LicenseKey;
}

export interface LicenseKeyRenewResult {
  refresh: boolean;
}

@Component({
  selector: 'app-license-key-renew-dialog',
  templateUrl: './license-key-renew-dialog.component.html',
  styleUrls: ['./license-key-renew-dialog.component.scss'],
})
export class LicenseKeyRenewDialogComponent {
  loading = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LicenseKeyRenewDialogComponent>,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: LicenseKeyRenewDialogData,
  ) {
    this.form = this.fb.group({
      extendByDays: [365, [Validators.min(1)]],
      newExpiry: [''],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    if (!payload.extendByDays && !payload.newExpiry) {
      this.form.controls.extendByDays.setErrors({ required: true });
      this.form.controls.newExpiry.setErrors({ required: true });
      return;
    }
    const requestPayload = {
      extendByDays:
        payload.extendByDays === null || payload.extendByDays === undefined
          ? undefined
          : payload.extendByDays,
      newExpiry: payload.newExpiry || undefined,
    };
    this.loading = true;
    this.licenseKeysService
      .renew(this.data.license.id, requestPayload)
      .subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close({ refresh: true } satisfies LicenseKeyRenewResult);
        },
        error: (error) => {
          this.loading = false;
          const message =
            error?.error?.message ??
            'Failed to renew license key. Please try again.';
          this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  cancel(): void {
    this.dialogRef.close({ refresh: false } satisfies LicenseKeyRenewResult);
  }
}

