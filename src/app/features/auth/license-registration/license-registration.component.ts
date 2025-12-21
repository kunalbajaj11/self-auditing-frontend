import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, LicensePreview } from '../../../core/services/auth.service';
import { PlanType } from '../../../core/models/plan.model';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-license-registration',
  templateUrl: './license-registration.component.html',
  styleUrls: ['./license-registration.component.scss'],
})
export class LicenseRegistrationComponent implements OnInit {
  validating = false;
  loading = false;
  hidePassword = true;
  licenseInfo: LicensePreview | null = null;

  readonly planTypes: PlanType[] = ['free', 'standard', 'enterprise'];
  readonly regions: Array<{ value: string; label: string }> = [
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
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      licenseKey: ['', [Validators.required, Validators.minLength(8)]],
      organizationName: ['', [Validators.required, Validators.maxLength(150)]],
      planType: [{ value: '', disabled: true }, []],
      vatNumber: [''],
      address: [''],
      currency: ['AED'],
      region: ['UAE'],
      contactPerson: [''],
      contactEmail: ['', [Validators.email]],
      adminName: ['', [Validators.required]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(8)]],
      adminPhone: [''],
    });
  }

  get licenseKeyControl(): AbstractControl {
    return this.form.controls.licenseKey;
  }

  ngOnInit(): void {
    // Reset plan field when license key changes
    this.form.controls.licenseKey.valueChanges.subscribe(() => {
      if (this.licenseInfo) {
        this.licenseInfo = null;
        this.form.controls.planType.setValue('');
        this.form.controls.planType.disable({ emitEvent: false });
        this.form.controls.planType.clearValidators();
        this.form.controls.planType.updateValueAndValidity();
      }
    });
  }

  validateLicense(): void {
    if (this.licenseKeyControl.invalid) {
      this.licenseKeyControl.markAsTouched();
      return;
    }
    const key = this.licenseKeyControl.value?.toString().trim();
    if (!key) {
      return;
    }
    this.validating = true;
    this.authService
      .validateLicense(key)
      .pipe(finalize(() => (this.validating = false)))
      .subscribe({
        next: (info) => {
          this.licenseInfo = info;
          this.snackBar.open('License key validated successfully', 'Close', {
            duration: 3000,
          });
          this.applyLicenseInfo(info);
        },
        error: (error) => {
          this.licenseInfo = null;
          this.enablePlanTypeControl();
          const message =
            error?.error?.message ??
            'Unable to validate license key. Please verify and try again.';
          this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  submit(): void {
    if (!this.licenseInfo) {
      this.snackBar.open(
        'Please validate your license key before registering.',
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    // If planType is disabled (from license), use the license planType
    const planType = this.form.controls.planType.disabled && this.licenseInfo?.planType
      ? this.licenseInfo.planType
      : raw.planType || undefined;
    
    const payload = {
      ...raw,
      licenseKey: raw.licenseKey?.trim(),
      planType: planType,
    };
    this.loading = true;
    this.authService
      .registerWithLicense(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ user }) => {
          this.snackBar.open(
            `Workspace created for ${payload.organizationName}. Welcome, ${user.name}!`,
            'Close',
            {
              duration: 3500,
            },
          );
          this.navigateByRole(user.role);
        },
        error: (error) => {
          const message =
            error?.error?.message ??
            'Unable to complete registration. Please review the details and retry.';
          this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  private applyLicenseInfo(info: LicensePreview): void {
    if (info.planType) {
      this.form.controls.planType.setValue(info.planType);
      this.form.controls.planType.clearValidators();
      this.form.controls.planType.updateValueAndValidity();
      this.form.controls.planType.disable({ emitEvent: false });
    } else {
      this.enablePlanTypeControl(true);
    }

    // Pre-populate region if license has one, but allow user to change it
    if (info.region) {
      this.form.controls.region.setValue(info.region);
    }
  }

  private enablePlanTypeControl(applyRequired = false): void {
    const control = this.form.controls.planType;
    control.enable({ emitEvent: false });
    if (applyRequired) {
      control.setValidators([Validators.required]);
    } else {
      control.clearValidators();
    }
    if (!applyRequired) {
      control.setValue('', { emitEvent: false });
    }
    control.updateValueAndValidity();
  }

  private navigateByRole(role: UserRole): void {
    const redirectMap: Record<UserRole, string> = {
      superadmin: '/super-admin/dashboard',
      admin: '/admin/dashboard',
      accountant: '/admin/expenses',
      approver: '/admin/expenses',
      auditor: '/admin/reports',
      employee: '/employee/upload',
    };
    this.router.navigateByUrl(redirectMap[role] ?? '/');
  }
}

