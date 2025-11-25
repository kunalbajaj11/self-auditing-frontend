import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanType } from '../../../core/models/plan.model';

export interface UpgradeLicenseDialogData {
  organizationName: string;
  currentPlanType: PlanType;
}

@Component({
  selector: 'app-upgrade-license-dialog',
  template: `
    <h2 mat-dialog-title>Upgrade License</h2>
    <mat-dialog-content>
      <p>
        Upgrade license for <strong>{{ data.organizationName }}</strong>
      </p>
      <p class="current-plan">
        Current Plan: <strong>{{ data.currentPlanType | titlecase }}</strong>
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>New License Key</mat-label>
          <input
            matInput
            formControlName="licenseKey"
            placeholder="Enter the new license key"
            required
            minlength="8"
          />
          <mat-hint
            >The license key must be for a higher tier than the current plan</mat-hint
          >
          <mat-error *ngIf="form.get('licenseKey')?.hasError('required')">
            License key is required
          </mat-error>
          <mat-error
            *ngIf="form.get('licenseKey')?.hasError('minlength')"
          >
            License key must be at least 8 characters
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid"
        (click)="upgrade()"
      >
        Upgrade License
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: 400px;
        padding: 20px;
      }
      .full-width {
        width: 100%;
      }
      p {
        margin-bottom: 20px;
      }
      .current-plan {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
      }
    `,
  ],
})
export class UpgradeLicenseDialogComponent {
  form = new FormGroup({
    licenseKey: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(8),
    ]),
  });

  constructor(
    private readonly dialogRef: MatDialogRef<UpgradeLicenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UpgradeLicenseDialogData,
  ) {}

  cancel(): void {
    this.dialogRef.close(null);
  }

  upgrade(): void {
    if (this.form.valid) {
      const licenseKey = this.form.value.licenseKey?.trim();
      if (licenseKey) {
        this.dialogRef.close(licenseKey);
      }
    }
  }
}

