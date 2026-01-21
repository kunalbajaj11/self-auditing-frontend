import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LedgerAccountsService,
  LedgerAccount,
} from '../../../core/services/ledger-accounts.service';

@Component({
  selector: 'app-ledger-account-form-dialog',
  templateUrl: './ledger-account-form-dialog.component.html',
  styleUrls: ['./ledger-account-form-dialog.component.scss'],
})
export class LedgerAccountFormDialogComponent {
  readonly isEdit: boolean;
  loading = false;

  readonly form;

  readonly categories: Array<{ value: string; label: string }> = [
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity', label: 'Equity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LedgerAccountFormDialogComponent>,
    private readonly ledgerAccountsService: LedgerAccountsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: LedgerAccount | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [
        data?.name ?? '',
        [Validators.required, Validators.maxLength(100)],
      ],
      description: [data?.description ?? ''],
      category: [
        data?.category ?? 'asset',
        [Validators.required],
      ],
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
        category?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      } = {};
      if (value.name) {
        updatePayload.name = String(value.name);
      }
      if (value.description !== undefined) {
        updatePayload.description = value.description ? String(value.description).trim() : undefined;
      }
      if (value.category) {
        updatePayload.category = value.category as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      }
      this.ledgerAccountsService
        .updateLedgerAccount(this.data.id, updatePayload)
        .subscribe({
          next: () => {
            this.loading = false;
            this.snackBar.open('Ledger account updated', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open(
              error.error?.message || 'Failed to update ledger account',
              'Close',
              { duration: 4000, panelClass: ['snack-error'] },
            );
          },
        });
    } else {
      const payload: {
        name: string;
        description?: string;
        category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      } = {
        name: String(value.name || ''),
        category: value.category as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
      };
      if (value.description && String(value.description).trim()) {
        payload.description = String(value.description).trim();
      }
      this.ledgerAccountsService.createLedgerAccount(payload).subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Ledger account created', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error.error?.message || 'Failed to create ledger account',
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

