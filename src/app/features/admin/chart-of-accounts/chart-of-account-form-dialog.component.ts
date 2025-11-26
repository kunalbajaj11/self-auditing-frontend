import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ChartOfAccountsService,
  ChartOfAccount,
  AccountType,
  AccountSubType,
  CreateChartOfAccountPayload,
} from '../../../core/services/chart-of-accounts.service';

@Component({
  selector: 'app-chart-of-account-form-dialog',
  templateUrl: './chart-of-account-form-dialog.component.html',
  styleUrls: ['./chart-of-account-form-dialog.component.scss'],
})
export class ChartOfAccountFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  accounts: ChartOfAccount[] = [];
  filteredAccounts: ChartOfAccount[] = [];

  readonly accountTypes = Object.values(AccountType);
  readonly accountSubTypes = Object.values(AccountSubType);

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ChartOfAccountFormDialogComponent>,
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: ChartOfAccount | null,
  ) {
    this.form = this.fb.group({
      accountCode: ['', [Validators.required, Validators.maxLength(50)]],
      accountName: ['', [Validators.required, Validators.maxLength(200)]],
      accountType: ['', Validators.required],
      accountSubType: [null],
      parentAccountId: [null],
      description: [''],
      isActive: [true],
      openingBalance: [0, [this.numberValidator, Validators.min(0)]],
      currency: ['AED'],
      notes: [''],
    });
  }

  ngOnInit(): void {
    // Load all accounts for parent selection
    this.chartOfAccountsService.listAccounts({ isActive: true }).subscribe({
      next: (accounts) => {
        this.accounts = accounts.filter(
          (acc) => !this.data || acc.id !== this.data.id,
        );
        this.filteredAccounts = this.accounts;
      },
    });

    if (this.data) {
      this.form.patchValue({
        accountCode: this.data.accountCode,
        accountName: this.data.accountName,
        accountType: this.data.accountType,
        accountSubType: this.data.accountSubType || null,
        parentAccountId: this.data.parentAccountId || null,
        description: this.data.description || '',
        isActive: this.data.isActive,
        openingBalance: parseFloat(this.data.openingBalance || '0'),
        currency: this.data.currency || 'AED',
        notes: this.data.notes || '',
      });
    }
  }

  numberValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value && control.value !== 0) return null;
    const num = Number(control.value);
    return !isNaN(num) ? null : { invalidNumber: { value: control.value } };
  }

  onAccountTypeChange(): void {
    const accountType = this.form.get('accountType')?.value;
    if (accountType) {
      // Filter parent accounts to same type or allow all
      this.filteredAccounts = this.accounts.filter(
        (acc) => !accountType || acc.accountType === accountType,
      );
    } else {
      this.filteredAccounts = this.accounts;
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();
    const payload: CreateChartOfAccountPayload = {
      accountCode: formValue.accountCode,
      accountName: formValue.accountName,
      accountType: formValue.accountType,
      accountSubType: formValue.accountSubType || undefined,
      parentAccountId: formValue.parentAccountId || undefined,
      description: formValue.description || undefined,
      isActive: formValue.isActive !== undefined ? formValue.isActive : true,
      openingBalance: formValue.openingBalance || 0,
      currency: formValue.currency || 'AED',
      notes: formValue.notes || undefined,
    };

    // Clean up empty strings
    Object.keys(payload).forEach((key) => {
      const payloadKey = key as keyof CreateChartOfAccountPayload;
      if (payload[payloadKey] === '') {
        (payload as any)[payloadKey] = undefined;
      }
    });

    const operation = this.data
      ? this.chartOfAccountsService.updateAccount(this.data.id, payload)
      : this.chartOfAccountsService.createAccount(payload);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message ||
            `Failed to ${this.data ? 'update' : 'create'} account`,
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  getAccountTypeLabel(type: AccountType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getAccountDisplayName(account: ChartOfAccount): string {
    return `${account.accountCode} - ${account.accountName}`;
  }
}

