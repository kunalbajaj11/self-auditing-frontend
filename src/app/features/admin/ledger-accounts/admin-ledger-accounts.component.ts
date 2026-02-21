import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LedgerAccountsService,
  LedgerAccount,
} from '../../../core/services/ledger-accounts.service';
import { LedgerAccountFormDialogComponent } from './ledger-account-form-dialog.component';

@Component({
  selector: 'app-admin-ledger-accounts',
  templateUrl: './admin-ledger-accounts.component.html',
  styleUrls: ['./admin-ledger-accounts.component.scss'],
})
export class AdminLedgerAccountsComponent implements OnInit {
  readonly columns = ['name', 'description', 'category', 'type', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<LedgerAccount>([]);
  loading = false;

  constructor(
    private readonly ledgerAccountsService: LedgerAccountsService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadLedgerAccounts();
  }

  openDialog(ledgerAccount?: LedgerAccount): void {
    const dialogRef = this.dialog.open(LedgerAccountFormDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: ledgerAccount ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadLedgerAccounts();
      }
    });
  }

  delete(ledgerAccount: LedgerAccount): void {
    if (!confirm(`Delete ledger account "${ledgerAccount.name}"?`)) {
      return;
    }
    this.loading = true;
    this.ledgerAccountsService.deleteLedgerAccount(ledgerAccount.id).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Ledger account deleted', 'Close', { duration: 3000 });
        this.loadLedgerAccounts();
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error.error?.message || 'Failed to delete ledger account',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  private loadLedgerAccounts(): void {
    this.loading = true;
    this.ledgerAccountsService.listLedgerAccounts().subscribe({
      next: (ledgerAccounts) => {
        this.loading = false;
        this.dataSource.data = ledgerAccounts;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load ledger accounts', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }
}

