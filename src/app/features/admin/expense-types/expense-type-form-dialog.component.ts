import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ExpenseTypesService,
  ExpenseType,
} from '../../../core/services/expense-types.service';

@Component({
  selector: 'app-expense-type-form-dialog',
  templateUrl: './expense-type-form-dialog.component.html',
  styleUrls: ['./expense-type-form-dialog.component.scss'],
})
export class ExpenseTypeFormDialogComponent {
  readonly isEdit: boolean;
  loading = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ExpenseTypeFormDialogComponent>,
    private readonly expenseTypesService: ExpenseTypesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: ExpenseType | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [
        data?.name ?? '',
        [Validators.required, Validators.maxLength(100)],
      ],
      displayLabel: [data?.displayLabel ?? ''],
      description: [data?.description ?? ''],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const value = this.form.getRawValue();
    if (this.isEdit && this.data) {
      const updatePayload: {
        name?: string;
        description?: string;
        displayLabel?: string;
      } = {};
      if (value.name) {
        updatePayload.name = String(value.name);
      }
      if (value.displayLabel && String(value.displayLabel).trim()) {
        updatePayload.displayLabel = String(value.displayLabel).trim();
      }
      if (value.description && String(value.description).trim()) {
        updatePayload.description = String(value.description).trim();
      }
      this.expenseTypesService
        .updateExpenseType(this.data.id, updatePayload)
        .subscribe({
          next: () => {
            this.loading = false;
            this.snackBar.open('Expense type updated', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open(
              error.error?.message || 'Failed to update expense type',
              'Close',
              { duration: 4000, panelClass: ['snack-error'] },
            );
          },
        });
    } else {
      const payload: {
        name: string;
        description?: string;
        displayLabel?: string;
      } = {
        name: String(value.name || ''),
      };
      if (value.displayLabel && String(value.displayLabel).trim()) {
        payload.displayLabel = String(value.displayLabel).trim();
      }
      if (value.description && String(value.description).trim()) {
        payload.description = String(value.description).trim();
      }
      this.expenseTypesService.createExpenseType(payload).subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Expense type created', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error.error?.message || 'Failed to create expense type',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

