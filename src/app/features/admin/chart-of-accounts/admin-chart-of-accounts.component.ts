import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  ChartOfAccountsService,
  ChartOfAccount,
  AccountType,
} from '../../../core/services/chart-of-accounts.service';
import { ChartOfAccountFormDialogComponent } from './chart-of-account-form-dialog.component';

@Component({
  selector: 'app-admin-chart-of-accounts',
  templateUrl: './admin-chart-of-accounts.component.html',
  styleUrls: ['./admin-chart-of-accounts.component.scss'],
})
export class AdminChartOfAccountsComponent implements OnInit {
  readonly columns = [
    'accountCode',
    'accountName',
    'accountType',
    'accountSubType',
    'currentBalance',
    'isActive',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<ChartOfAccount>([]);
  loading = false;
  searchTerm = '';
  selectedAccountType: AccountType | null = null;
  showActiveOnly = true;
  viewMode: 'list' | 'tree' = 'list';
  treeData: ChartOfAccount[] = [];

  readonly accountTypes = Object.values(AccountType);

  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['view'] === 'create') {
        this.openDialog();
      }
    });
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;
    const filters: any = {
      isActive: this.showActiveOnly ? true : undefined,
    };
    if (this.selectedAccountType) {
      filters.accountType = this.selectedAccountType;
    }
    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    if (this.viewMode === 'tree') {
      this.chartOfAccountsService.getAccountTree(filters).subscribe({
        next: (accounts) => {
          this.loading = false;
          this.treeData = accounts;
          // Flatten tree for table view
          this.dataSource.data = this.flattenTree(accounts);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to load accounts', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
    } else {
      this.chartOfAccountsService.listAccounts(filters).subscribe({
        next: (accounts) => {
          this.loading = false;
          this.dataSource.data = accounts;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to load accounts', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
    }
  }

  private flattenTree(accounts: ChartOfAccount[]): ChartOfAccount[] {
    const result: ChartOfAccount[] = [];
    accounts.forEach((account) => {
      result.push(account);
      if (account.children && account.children.length > 0) {
        result.push(...this.flattenTree(account.children));
      }
    });
    return result;
  }

  openDialog(account?: ChartOfAccount): void {
    const dialogRef = this.dialog.open(ChartOfAccountFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: account ?? null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          account ? 'Account updated' : 'Account created',
          'Close',
          { duration: 3000 },
        );
        this.loadAccounts();
      }
    });
  }

  delete(account: ChartOfAccount): void {
    if (account.isSystemDefault) {
      this.snackBar.open('Cannot delete system default account', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    if (!confirm(`Delete account "${account.accountName}"?`)) {
      return;
    }

    this.chartOfAccountsService.deleteAccount(account.id).subscribe({
      next: () => {
        this.snackBar.open('Account deleted', 'Close', { duration: 3000 });
        this.loadAccounts();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete account',
          'Close',
          {
            duration: 4000,
            panelClass: ['snack-error'],
          },
        );
      },
    });
  }

  onSearchChange(): void {
    this.loadAccounts();
  }

  onAccountTypeChange(): void {
    this.loadAccounts();
  }

  toggleActiveFilter(): void {
    this.showActiveOnly = !this.showActiveOnly;
    this.loadAccounts();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'tree' : 'list';
    this.loadAccounts();
  }

  getAccountTypeLabel(type: AccountType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getAccountTypeColor(type: AccountType): 'primary' | 'accent' | 'warn' {
    switch (type) {
      case AccountType.ASSET:
        return 'primary';
      case AccountType.LIABILITY:
        return 'warn';
      case AccountType.EQUITY:
        return 'accent';
      case AccountType.REVENUE:
        return 'primary';
      case AccountType.EXPENSE:
        return 'warn';
      default:
        return 'accent';
    }
  }
}
