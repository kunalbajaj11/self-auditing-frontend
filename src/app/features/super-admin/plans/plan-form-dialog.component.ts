import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlansService } from '../../../core/services/plans.service';
import { SubscriptionPlan } from '../../../core/models/plan.model';

@Component({
  selector: 'app-plan-form-dialog',
  templateUrl: './plan-form-dialog.component.html',
  styleUrls: ['./plan-form-dialog.component.scss'],
})
export class PlanFormDialogComponent {
  loading = false;
  readonly isEdit: boolean;
  readonly form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PlanFormDialogComponent>,
    private readonly plansService: PlansService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: SubscriptionPlan | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [
        data?.name ?? '',
        [Validators.required, Validators.maxLength(50)],
      ],
      description: [data?.description ?? '', Validators.required],
      maxUsers: [data?.maxUsers ?? null],
      maxStorageMb: [data?.maxStorageMb ?? null],
      maxExpensesPerMonth: [data?.maxExpensesPerMonth ?? null],
      priceMonthly: [data?.priceMonthly ?? null],
      priceYearly: [data?.priceYearly ?? null],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const payload = this.normalizePayload(this.form.getRawValue());
    const request$ = this.isEdit
      ? this.plansService.updatePlan(this.data!.id, payload)
      : this.plansService.createPlan(payload);
    request$.subscribe({
      next: (plan) => {
        this.loading = false;
        this.snackBar.open(
          `Plan ${this.isEdit ? 'updated' : 'created'} successfully`,
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close(plan);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(
          `Failed to ${this.isEdit ? 'update' : 'create'} plan`,
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private normalizePayload(value: any): Partial<SubscriptionPlan> {
    return {
      name: value.name ?? undefined,
      description: value.description ?? undefined,
      maxUsers: value.maxUsers ?? undefined,
      maxStorageMb: value.maxStorageMb ?? undefined,
      maxExpensesPerMonth: value.maxExpensesPerMonth ?? undefined,
      priceMonthly: value.priceMonthly ?? undefined,
      priceYearly: value.priceYearly ?? undefined,
    };
  }
}

