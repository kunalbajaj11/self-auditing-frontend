import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  JournalEntriesService,
  JournalEntry,
  JournalEntryType,
  JournalEntryCategory,
  JournalEntryStatus,
} from '../../../core/services/journal-entries.service';

@Component({
  selector: 'app-journal-entry-form-dialog',
  templateUrl: './journal-entry-form-dialog.component.html',
  styleUrls: ['./journal-entry-form-dialog.component.scss'],
})
export class JournalEntryFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  isEditMode = false;

  readonly typeOptions = [
    { value: JournalEntryType.SHARE_CAPITAL, label: 'Share Capital' },
    { value: JournalEntryType.RETAINED_EARNINGS, label: 'Retained Earnings' },
    { value: JournalEntryType.SHAREHOLDER_ACCOUNT, label: 'Share Holder Account' },
    { value: JournalEntryType.OUTSTANDING, label: 'Outstanding' },
    { value: JournalEntryType.PREPAID, label: 'Prepaid' },
    { value: JournalEntryType.ACCRUED_INCOME, label: 'Accrued Income' },
    { value: JournalEntryType.DEPRECIATION, label: 'Depreciation' },
  ];

  readonly categoryOptions = [
    { value: JournalEntryCategory.EQUITY, label: 'Equity' },
    { value: JournalEntryCategory.OTHERS, label: 'Others' },
  ];

  readonly statusOptions = [
    { value: JournalEntryStatus.CASH_PAID, label: 'Cash Paid' },
    { value: JournalEntryStatus.BANK_PAID, label: 'Bank Paid' },
    { value: JournalEntryStatus.CASH_RECEIVED, label: 'Cash Received' },
    { value: JournalEntryStatus.BANK_RECEIVED, label: 'Bank Received' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<JournalEntryFormDialogComponent>,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: JournalEntry | null,
  ) {
    this.isEditMode = Boolean(data);
    this.form = this.fb.group({
      type: [JournalEntryType.SHARE_CAPITAL, Validators.required],
      category: [JournalEntryCategory.EQUITY, Validators.required],
      status: [JournalEntryStatus.CASH_PAID, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      entryDate: [new Date().toISOString().substring(0, 10), Validators.required],
      description: [''],
      referenceNumber: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      // Editing existing entry
      this.form.patchValue({
        type: this.data.type,
        category: this.data.category,
        status: this.data.status,
        amount: parseFloat(this.data.amount.toString()),
        entryDate: this.data.entryDate,
        description: this.data.description || '',
        referenceNumber: this.data.referenceNumber || '',
        notes: this.data.notes || '',
      });
    }
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
      // If it's a string with time, extract just the date part
      entryDate = entryDate.substring(0, 10);
    }

    const payload = {
      type: formValue.type,
      category: formValue.category,
      status: formValue.status,
      amount: parseFloat(formValue.amount),
      entryDate: entryDate,
      description: formValue.description || undefined,
      referenceNumber: formValue.referenceNumber || undefined,
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
          error?.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} journal entry`,
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

