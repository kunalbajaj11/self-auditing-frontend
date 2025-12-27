import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanType } from '../../../core/models/plan.model';

export interface UpgradeLicenseDialogData {
  organizationName: string;
  currentPlanType: PlanType;
}

export type UpgradeMethod = 'direct' | 'licenseKey';

export interface UpgradeLicenseResult {
  method: UpgradeMethod;
  planType?: PlanType;
  licenseKey?: string;
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
      
      <mat-tab-group [(selectedIndex)]="selectedTab" class="upgrade-tabs">
        <mat-tab label="Direct Upgrade">
          <form [formGroup]="directForm" class="form-content">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Select New Plan Type</mat-label>
              <mat-select formControlName="planType" required>
                <mat-option value="free">Free</mat-option>
                <mat-option value="standard">Standard</mat-option>
                <mat-option value="premium">Premium</mat-option>
                <mat-option value="enterprise">Enterprise</mat-option>
              </mat-select>
              <mat-hint>Manually change the plan type directly</mat-hint>
              <mat-error *ngIf="directForm.get('planType')?.hasError('required')">
                Plan type is required
              </mat-error>
            </mat-form-field>
          </form>
        </mat-tab>
        
        <mat-tab label="License Key">
          <form [formGroup]="licenseKeyForm" class="form-content">
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
              <mat-error *ngIf="licenseKeyForm.get('licenseKey')?.hasError('required')">
                License key is required
              </mat-error>
              <mat-error
                *ngIf="licenseKeyForm.get('licenseKey')?.hasError('minlength')"
              >
                License key must be at least 8 characters
              </mat-error>
            </mat-form-field>
          </form>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="selectedTab === 0 ? directForm.invalid : licenseKeyForm.invalid"
        (click)="upgrade()"
      >
        {{ selectedTab === 0 ? 'Change Plan Type' : 'Upgrade License' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: 500px;
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
      .upgrade-tabs {
        margin-top: 20px;
      }
      .form-content {
        padding: 20px 0;
      }
    `,
  ],
})
export class UpgradeLicenseDialogComponent {
  selectedTab = 0;
  
  readonly planTypes: PlanType[] = ['free', 'standard', 'premium', 'enterprise'];
  
  directForm = new FormGroup({
    planType: new FormControl<PlanType | null>(null, [Validators.required]),
  });

  licenseKeyForm = new FormGroup({
    licenseKey: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(8),
    ]),
  });

  constructor(
    private readonly dialogRef: MatDialogRef<UpgradeLicenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UpgradeLicenseDialogData,
  ) {
    // Set default plan type to next tier up, or current if already at highest tier
    const currentIndex = this.planTypes.indexOf(this.data.currentPlanType);
    if (currentIndex < this.planTypes.length - 1) {
      this.directForm.patchValue({
        planType: this.planTypes[currentIndex + 1],
      });
    } else {
      // If already at highest tier, default to current plan type
      this.directForm.patchValue({
        planType: this.data.currentPlanType,
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  upgrade(): void {
    if (this.selectedTab === 0) {
      // Direct plan type change
      if (this.directForm.valid) {
        const planType = this.directForm.value.planType;
        if (planType) {
          this.dialogRef.close({
            method: 'direct',
            planType,
          } as UpgradeLicenseResult);
        }
      }
    } else {
      // License key upgrade
      if (this.licenseKeyForm.valid) {
        const licenseKey = this.licenseKeyForm.value.licenseKey?.trim();
        if (licenseKey) {
          this.dialogRef.close({
            method: 'licenseKey',
            licenseKey,
          } as UpgradeLicenseResult);
        }
      }
    }
  }
}

