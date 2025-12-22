import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  JournalEntriesService,
  JournalEntry,
  JournalEntryType,
  JournalEntryCategory,
  JournalEntryStatus,
} from '../../../core/services/journal-entries.service';
import { JournalEntryFormDialogComponent } from './journal-entry-form-dialog.component';

@Component({
  selector: 'app-admin-journal-entries',
  templateUrl: './admin-journal-entries.component.html',
  styleUrls: ['./admin-journal-entries.component.scss'],
})
export class AdminJournalEntriesComponent implements OnInit {
  readonly Math = Math; // Expose Math to template
  readonly columns = [
    'type',
    'category',
    'status',
    'amount',
    'entryDate',
    'description',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<JournalEntry>([]);
  loading = false;

  readonly filters;

  readonly typeOptions = [
    { value: '', label: 'All' },
    { value: JournalEntryType.SHARE_CAPITAL, label: 'Share Capital' },
    { value: JournalEntryType.RETAINED_EARNINGS, label: 'Retained Earnings' },
    { value: JournalEntryType.SHAREHOLDER_ACCOUNT, label: 'Share Holder Account' },
  ];

  readonly categoryOptions = [
    { value: '', label: 'All' },
    { value: JournalEntryCategory.EQUITY, label: 'Equity' },
    { value: JournalEntryCategory.OTHERS, label: 'Others' },
  ];

  readonly statusOptions = [
    { value: '', label: 'All' },
    { value: JournalEntryStatus.CASH_PAID, label: 'Cash Paid' },
    { value: JournalEntryStatus.BANK_PAID, label: 'Bank Paid' },
    { value: JournalEntryStatus.CASH_RECEIVED, label: 'Cash Received' },
    { value: JournalEntryStatus.BANK_RECEIVED, label: 'Bank Received' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    this.filters = this.fb.group({
      type: [''],
      category: [''],
      status: [''],
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit(): void {
    this.loadJournalEntries();

    this.filters.valueChanges.subscribe(() => {
      this.loadJournalEntries();
    });
  }

  loadJournalEntries(): void {
    this.loading = true;
    const filterValues = this.filters.getRawValue();
    const filters: any = {};

    if (filterValues.type) filters.type = filterValues.type;
    if (filterValues.category) filters.category = filterValues.category;
    if (filterValues.status) filters.status = filterValues.status;
    if (filterValues.startDate) filters.startDate = filterValues.startDate;
    if (filterValues.endDate) filters.endDate = filterValues.endDate;

    this.journalEntriesService.listEntries(filters).subscribe({
      next: (entries) => {
        this.dataSource.data = entries;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to load journal entries',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(JournalEntryFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadJournalEntries();
      }
    });
  }

  openEditDialog(entry: JournalEntry): void {
    const dialogRef = this.dialog.open(JournalEntryFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: entry,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadJournalEntries();
      }
    });
  }

  deleteEntry(entry: JournalEntry): void {
    if (!confirm(`Are you sure you want to delete this journal entry?`)) {
      return;
    }

    this.journalEntriesService.deleteEntry(entry.id).subscribe({
      next: () => {
        this.snackBar.open('Journal entry deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadJournalEntries();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete journal entry',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getTypeLabel(type: JournalEntryType): string {
    const option = this.typeOptions.find((opt) => opt.value === type);
    return option?.label || type;
  }

  getCategoryLabel(category: JournalEntryCategory): string {
    const option = this.categoryOptions.find((opt) => opt.value === category);
    return option?.label || category;
  }

  getStatusLabel(status: JournalEntryStatus): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option?.label || status;
  }

  getStatusColor(status: JournalEntryStatus): 'primary' | 'accent' | 'warn' {
    if (status === JournalEntryStatus.CASH_PAID || status === JournalEntryStatus.BANK_PAID) {
      return 'warn';
    }
    return 'primary';
  }

  getAmountWithSign(entry: JournalEntry): number {
    const amount = parseFloat(entry.amount.toString());
    // CASH_PAID and BANK_PAID are negative (outflow), CASH_RECEIVED and BANK_RECEIVED are positive (inflow)
    if (entry.status === JournalEntryStatus.CASH_PAID || entry.status === JournalEntryStatus.BANK_PAID) {
      return -amount;
    }
    return amount;
  }
}

