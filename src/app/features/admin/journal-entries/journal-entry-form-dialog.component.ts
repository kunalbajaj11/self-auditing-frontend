import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  JournalEntriesService,
  JournalEntry,
  JournalEntryAccount,
  ACCOUNT_METADATA,
  getAccountsByCategory,
} from '../../../core/services/journal-entries.service';

interface JournalEntryTemplate {
  name: string;
  description: string;
  debitAccount: JournalEntryAccount;
  creditAccount: JournalEntryAccount;
}

@Component({
  selector: 'app-journal-entry-form-dialog',
  templateUrl: './journal-entry-form-dialog.component.html',
  styleUrls: ['./journal-entry-form-dialog.component.scss'],
})
export class JournalEntryFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  isEditMode = false;
  selectedTemplate: JournalEntryTemplate | null = null;

  readonly accountsByCategory = getAccountsByCategory();
  readonly allAccounts = Object.values(ACCOUNT_METADATA);

  readonly templates: JournalEntryTemplate[] = [
    {
      name: 'Owner Introduced Capital',
      description: 'Owner invested capital into the business',
      debitAccount: JournalEntryAccount.CASH_BANK,
      creditAccount: JournalEntryAccount.SHARE_CAPITAL,
    },
    {
      name: 'Owner Withdrew',
      description: 'Owner withdrew funds from the business',
      debitAccount: JournalEntryAccount.OWNER_SHAREHOLDER_ACCOUNT,
      creditAccount: JournalEntryAccount.CASH_BANK,
    },
    {
      name: 'Accrued Income',
      description: 'Income earned but not yet received',
      debitAccount: JournalEntryAccount.ACCOUNTS_RECEIVABLE,
      creditAccount: JournalEntryAccount.SALES_REVENUE,
    },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<JournalEntryFormDialogComponent>,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: JournalEntry | null,
  ) {
    this.isEditMode = Boolean(data);
    this.form = this.fb.group(
      {
        entryStyle: ['simple'], // Simple journal (1 debit, 1 credit) - default
        debitAccount: [null, Validators.required],
        creditAccount: [null, Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]],
        entryDate: [
          new Date().toISOString().substring(0, 10),
          Validators.required,
        ],
        description: [''],
        customerVendorName: [''],
        vendorTrn: [''],
        vatAmount: [0, [Validators.min(0)]],
        vatTaxType: ['standard'],
        subAccount: [''],
        referenceNumber: [''],
        attachmentId: [''],
        notes: [''],
      },
      { validators: [this.accountMismatchValidator, this.retainedEarningsValidator] },
    );
  }

  ngOnInit(): void {
    if (this.data) {
      // Editing existing entry
      this.form.patchValue({
        debitAccount: this.data.debitAccount,
        creditAccount: this.data.creditAccount,
        amount: parseFloat(this.data.amount.toString()),
        entryDate: this.data.entryDate,
        description: this.data.description || '',
        customerVendorName: this.data.customerVendorName || '',
        vendorTrn: (this.data as any).vendorTrn || '',
        vatAmount: (this.data as any).vatAmount ? parseFloat((this.data as any).vatAmount.toString()) : 0,
        vatTaxType: (this.data as any).vatTaxType || 'standard',
        subAccount: (this.data as any).subAccount || '',
        referenceNumber: this.data.referenceNumber || '',
        attachmentId: this.data.attachmentId || '',
        notes: this.data.notes || '',
      });
    }
  }

  // Custom validator: Debit and Credit accounts must be different
  accountMismatchValidator(control: AbstractControl): ValidationErrors | null {
    const debitAccount = control.get('debitAccount')?.value;
    const creditAccount = control.get('creditAccount')?.value;

    if (debitAccount && creditAccount && debitAccount === creditAccount) {
      return { accountMismatch: true };
    }
    return null;
  }

  // Custom validator: Retained Earnings cannot be manually selected
  retainedEarningsValidator(control: AbstractControl): ValidationErrors | null {
    const debitAccount = control.get('debitAccount')?.value;
    const creditAccount = control.get('creditAccount')?.value;

    if (
      debitAccount === JournalEntryAccount.RETAINED_EARNINGS ||
      creditAccount === JournalEntryAccount.RETAINED_EARNINGS
    ) {
      return { retainedEarningsNotAllowed: true };
    }
    return null;
  }

  getAccountName(accountCode: JournalEntryAccount): string {
    return ACCOUNT_METADATA[accountCode]?.name || accountCode;
  }

  getAccountCategory(accountCode: JournalEntryAccount): string {
    return ACCOUNT_METADATA[accountCode]?.category || 'asset';
  }

  applyTemplate(template: JournalEntryTemplate): void {
    this.selectedTemplate = template;
    this.form.patchValue({
      debitAccount: template.debitAccount,
      creditAccount: template.creditAccount,
      description: template.description,
    });
  }

  get isBalanced(): boolean {
    const amount = this.form.get('amount')?.value || 0;
    return amount > 0;
  }

  get debitAmount(): number {
    return this.form.get('amount')?.value || 0;
  }

  get creditAmount(): number {
    return this.form.get('amount')?.value || 0;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    // Format date to YYYY-MM-DD if it's a Date object
    let entryDate = formValue.entryDate;
    if (entryDate instanceof Date) {
      entryDate = entryDate.toISOString().substring(0, 10);
    } else if (typeof entryDate === 'string' && entryDate.length > 10) {
      entryDate = entryDate.substring(0, 10);
    }

    const payload = {
      debitAccount: formValue.debitAccount,
      creditAccount: formValue.creditAccount,
      amount: parseFloat(formValue.amount),
      entryDate: entryDate,
      description: formValue.description || undefined,
      customerVendorName: formValue.customerVendorName || undefined,
      vendorTrn: formValue.vendorTrn || undefined,
      vatAmount: formValue.vatAmount > 0 ? parseFloat(formValue.vatAmount) : undefined,
      vatTaxType: formValue.vatTaxType || undefined,
      subAccount: formValue.subAccount || undefined,
      referenceNumber: formValue.referenceNumber || undefined,
      attachmentId: formValue.attachmentId || undefined,
      notes: formValue.notes || undefined,
    };

    const request$ = this.isEditMode
      ? this.journalEntriesService.updateEntry(this.data!.id, payload)
      : this.journalEntriesService.createEntry(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(
          `Journal entry ${this.isEditMode ? 'updated' : 'created'} successfully`,
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message ||
            `Failed to ${this.isEditMode ? 'update' : 'create'} journal entry`,
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
