import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationService } from '../../../core/services/organization.service';
import { PlanType } from '../../../core/models/plan.model';

@Component({
  selector: 'app-organization-form-dialog',
  templateUrl: './organization-form-dialog.component.html',
  styleUrls: ['./organization-form-dialog.component.scss'],
})
export class OrganizationFormDialogComponent {
  readonly planTypes: PlanType[] = ['free', 'standard', 'premium', 'enterprise'];
  readonly regions: Array<{ value: string; label: string }> = [
    { value: 'UAE', label: 'United Arab Emirates (UAE)' },
    { value: 'SAUDI', label: 'Saudi Arabia' },
    { value: 'OMAN', label: 'Oman' },
    { value: 'KUWAIT', label: 'Kuwait' },
    { value: 'BAHRAIN', label: 'Bahrain' },
    { value: 'QATAR', label: 'Qatar' },
    { value: 'INDIA', label: 'India' },
  ];
  loading = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<OrganizationFormDialogComponent>,
    private readonly organizationService: OrganizationService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: null,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      planType: ['standard' as PlanType, Validators.required],
      vatNumber: [''],
      contactPerson: [''],
      contactEmail: ['', [Validators.email]],
      currency: ['AED', Validators.required],
      region: ['UAE'],
      address: [''],
      enablePayroll: [false],
      enableInventory: [false],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const payload = this.form.getRawValue();
    this.organizationService
      .createOrganization(payload as any)
      .subscribe({
        next: (organization) => {
          this.loading = false;
          this.snackBar.open(
            `${organization.name} onboarded successfully`,
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close(organization);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(
            'Failed to create organization. Please check the details and retry.',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

