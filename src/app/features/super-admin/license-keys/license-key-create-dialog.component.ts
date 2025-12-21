import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { PlanType } from '../../../core/models/plan.model';
import { Region } from '../../../core/models/organization.model';

export interface LicenseKeyCreateResult {
  refresh: boolean;
}

@Component({
  selector: 'app-license-key-create-dialog',
  templateUrl: './license-key-create-dialog.component.html',
  styleUrls: ['./license-key-create-dialog.component.scss'],
})
export class LicenseKeyCreateDialogComponent implements OnInit {
  loading = false;
  readonly planTypes: PlanType[] = ['free', 'standard', 'enterprise'];
  readonly regions: Array<{ value: Region; label: string }> = [
    { value: 'UAE', label: 'United Arab Emirates (UAE)' },
    { value: 'SAUDI', label: 'Saudi Arabia' },
    { value: 'OMAN', label: 'Oman' },
    { value: 'KUWAIT', label: 'Kuwait' },
    { value: 'BAHRAIN', label: 'Bahrain' },
    { value: 'QATAR', label: 'Qatar' },
    { value: 'INDIA', label: 'India' },
  ];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LicenseKeyCreateDialogComponent>,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      planType: ['standard' as PlanType, Validators.required],
      maxUsers: [5, [Validators.min(1)]],
      storageQuotaMb: [null as number | null],
      maxUploads: [2000, [Validators.min(1)]],
      validityDays: [365, [Validators.required, Validators.min(1)]],
      notes: [''],
      region: [null as Region | null],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    // Update maxUsers default when plan type changes
    this.form.controls.planType.valueChanges.subscribe((planType: PlanType | null) => {
      const defaultMaxUsers = this.getDefaultMaxUsers(planType);
      this.form.controls.maxUsers.setValue(defaultMaxUsers, { emitEvent: false });
    });
  }

  private getDefaultMaxUsers(planType: PlanType | null): number | null {
    switch (planType) {
      case 'enterprise':
        return 25;
      case 'standard':
        return 5;
      case 'free':
      default:
        return null;
    }
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
      region: raw.region ?? undefined,
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

