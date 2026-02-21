import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  JournalEntriesService,
  JournalEntry,
  JournalEntryAccount,
  ACCOUNT_METADATA,
  getAccountsByCategory,
} from '../../../core/services/journal-entries.service';
import {
  LedgerAccountsService,
  LedgerAccount,
} from '../../../core/services/ledger-accounts.service';
import { LicenseService } from '../../../core/services/license.service';
import { JournalEntryFormDialogComponent } from './journal-entry-form-dialog.component';
import { BulkImportDialogComponent } from './bulk-import-dialog.component';

@Component({
  selector: 'app-admin-journal-entries',
  templateUrl: './admin-journal-entries.component.html',
  styleUrls: ['./admin-journal-entries.component.scss'],
})
export class AdminJournalEntriesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly Math = Math; // Expose Math to template
  readonly columns = [
    'debitAccount',
    'creditAccount',
    'amount',
    'entryDate',
    'description',
    'customerVendorName',
    'vatAmount',
    'vendorTrn',
    'subAccount',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<JournalEntry>([]);
  loading = false;
  bulkImportEnabled$: Observable<boolean> = of(false);

  readonly filters;
  readonly accountsByCategory = getAccountsByCategory();
  readonly allAccounts = Object.values(ACCOUNT_METADATA).filter(
    (acc) => !acc.isReadOnly,
  );

  private readonly ledgerAccountsById = new Map<string, LedgerAccount>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly ledgerAccountsService: LedgerAccountsService,
    private readonly licenseService: LicenseService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    this.filters = this.fb.group({
      debitAccount: [''],
      creditAccount: [''],
      startDate: [''],
      endDate: [''],
      referenceNumber: [''],
    });
  }

  ngOnInit(): void {
    this.bulkImportEnabled$ = this.licenseService.isBulkJournalImportEnabled();
    this.ledgerAccountsService.listLedgerAccounts().subscribe({
      next: (accounts) => {
        this.ledgerAccountsById.clear();
        accounts.forEach((a) => this.ledgerAccountsById.set(a.id, a));
      },
      error: () => {
        // Non-blocking: if ledger accounts can't be loaded, fall back to showing the code.
      },
    });

    this.loadJournalEntries();

    this.filters.valueChanges.subscribe(() => {
      this.loadJournalEntries();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadJournalEntries(): void {
    this.loading = true;
    const filterValues = this.filters.getRawValue();
    const filters: any = {};

    if (filterValues.debitAccount) filters.debitAccount = filterValues.debitAccount;
    if (filterValues.creditAccount) filters.creditAccount = filterValues.creditAccount;
    if (filterValues.startDate) filters.startDate = filterValues.startDate;
    if (filterValues.endDate) filters.endDate = filterValues.endDate;
    if (filterValues.referenceNumber) filters.referenceNumber = filterValues.referenceNumber;

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

  openBulkImportDialog(): void {
    const dialogRef = this.dialog.open(BulkImportDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadJournalEntries();
      }
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

  getAccountName(accountCode: string | null | undefined): string {
    if (!accountCode) return '—';

    if (accountCode.startsWith('ledger:')) {
      const id = accountCode.slice('ledger:'.length);
      const ledger = this.ledgerAccountsById.get(id);
      return ledger?.name || 'Custom Ledger Account';
    }

    const meta = ACCOUNT_METADATA[accountCode as JournalEntryAccount];
    return meta?.name || accountCode;
  }

  getAccountCategory(accountCode: JournalEntryAccount): string {
    return ACCOUNT_METADATA[accountCode]?.category || 'asset';
  }
}
