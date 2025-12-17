import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { PlanType } from '../../../core/models/plan.model';

export interface LicenseKeyCreateResult {
  refresh: boolean;
}

@Component({
  selector: 'app-license-key-create-dialog',
  templateUrl: './license-key-create-dialog.component.html',
  styleUrls: ['./license-key-create-dialog.component.scss'],
})
export class LicenseKeyCreateDialogComponent {
  loading = false;
  readonly planTypes: PlanType[] = ['free', 'standard', 'enterprise'];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LicenseKeyCreateDialogComponent>,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      planType: ['standard' as PlanType, Validators.required],
      maxUsers: [null as number | null],
      storageQuotaMb: [null as number | null],
      maxUploads: [2000, [Validators.min(1)]],
      validityDays: [365, [Validators.required, Validators.min(1)]],
      notes: [''],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      planType: raw.planType ?? undefined,
      maxUsers: raw.maxUsers ?? undefined,
      storageQuotaMb: raw.storageQuotaMb ?? undefined,
      maxUploads: raw.maxUploads ?? undefined,
      validityDays: raw.validityDays ?? undefined,
      notes: raw.notes ?? undefined,
      email: raw.email ?? '',
    };
    this.loading = true;
    this.licenseKeysService.create(payload).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close({ refresh: true } satisfies LicenseKeyCreateResult);
      },
      error: (error) => {
        this.loading = false;
        const message =
          error?.error?.message ??
          'Failed to generate license key. Please try again.';
        this.snackBar.open(message, 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close({ refresh: false } satisfies LicenseKeyCreateResult);
  }
}

