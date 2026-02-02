import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelect } from '@angular/material/select';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { LicenseKey } from '../../../core/models/license-key.model';
import {
  LicenseKeyCreateDialogComponent,
  LicenseKeyCreateResult,
} from './license-key-create-dialog.component';
import {
  LicenseKeyRenewDialogComponent,
  LicenseKeyRenewResult,
} from './license-key-renew-dialog.component';

@Component({
  selector: 'app-license-key-management',
  templateUrl: './license-key-management.component.html',
  styleUrls: ['./license-key-management.component.scss'],
})
export class LicenseKeyManagementComponent implements OnInit, AfterViewInit {
  loading = false;
  licenseKeys: LicenseKey[] = [];
  dataSource = new MatTableDataSource<LicenseKey>([]);
  displayedColumns = ['key', 'organization', 'plan', 'region', 'status', 'features', 'email', 'expires', 'created', 'actions'];
  searchControl = new FormControl('');
  statusFilterControl = new FormControl('all');
  expiryFilterControl = new FormControl('all');

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly licenseKeysService: LicenseKeysService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadKeys();
    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => this.applyFilters());

    // Status filter
    this.statusFilterControl.valueChanges.subscribe(() => this.applyFilters());

    // Expiry filter
    this.expiryFilterControl.valueChanges.subscribe(() => this.applyFilters());
  }

  applyFilters(): void {
    let filtered = [...this.licenseKeys];

    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(
        (key) =>
          key.key.toLowerCase().includes(searchTerm) ||
          key.organizationName?.toLowerCase().includes(searchTerm) ||
          key.email?.toLowerCase().includes(searchTerm) ||
          key.planType?.toLowerCase().includes(searchTerm),
      );
    }

    // Status filter
    const statusFilter = this.statusFilterControl.value;
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((key) => key.status === statusFilter);
    }

    // Expiry filter
    const expiryFilter = this.expiryFilterControl.value;
    if (expiryFilter && expiryFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((key) => {
        const expiryDate = new Date(key.expiresAt);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        switch (expiryFilter) {
          case 'expired':
            return daysUntilExpiry < 0 || key.status === 'expired';
          case 'expiring-soon':
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
          case 'expiring-warning':
            return daysUntilExpiry > 30 && daysUntilExpiry <= 60;
          case 'valid':
            return daysUntilExpiry > 60;
          default:
            return true;
        }
      });
    }

    this.dataSource.data = filtered;
  }

  loadKeys(): void {
    this.loading = true;
    this.licenseKeysService.list().subscribe({
      next: (keys) => {
        this.loading = false;
        this.licenseKeys = keys;
        this.dataSource.data = keys;
        this.applyFilters();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(
          'Unable to load license keys. Please try again later.',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(LicenseKeyCreateDialogComponent, {
      width: '420px',
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result?: LicenseKeyCreateResult) => {
      if (result?.refresh) {
        this.snackBar.open('License key created successfully', 'Close', {
          duration: 3000,
        });
        this.loadKeys();
      }
    });
  }

  openRenewDialog(key: LicenseKey): void {
    const dialogRef = this.dialog.open(LicenseKeyRenewDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { license: key },
    });
    dialogRef.afterClosed().subscribe((result?: LicenseKeyRenewResult) => {
      if (result?.refresh) {
        this.snackBar.open('License key renewed successfully', 'Close', {
          duration: 3000,
        });
        this.loadKeys();
      }
    });
  }

  revoke(key: LicenseKey): void {
    this.licenseKeysService.revoke(key.id).subscribe({
      next: () => {
        this.snackBar.open('License key revoked', 'Close', { duration: 3000 });
        this.loadKeys();
      },
      error: () => {
        this.snackBar.open('Failed to revoke license key', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  statusColor(status: LicenseKey['status']): string {
    switch (status) {
      case 'active':
        return 'primary';
      case 'consumed':
        return 'accent';
      case 'expired':
      case 'revoked':
        return 'warn';
      default:
        return '';
    }
  }

  getRegionLabel(region: string | null | undefined): string {
    if (!region) {
      return '—';
    }
    const regionLabels: Record<string, string> = {
      UAE: 'United Arab Emirates (UAE)',
      SAUDI: 'Saudi Arabia',
      OMAN: 'Oman',
      KUWAIT: 'Kuwait',
      BAHRAIN: 'Bahrain',
      QATAR: 'Qatar',
      INDIA: 'India',
    };
    return regionLabels[region] || region;
  }

  getExpiryStatus(expiresAt: string, status: LicenseKey['status']): {
    status: 'expired' | 'expiring-soon' | 'expiring-warning' | 'valid';
    color: string;
    label: string;
  } {
    if (status === 'expired' || status === 'revoked') {
      return { status: 'expired', color: 'warn', label: 'Expired' };
    }

    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'warn', label: 'Expired' };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'expiring-soon',
        color: 'warn',
        label: `${daysUntilExpiry} days`,
      };
    } else if (daysUntilExpiry <= 60) {
      return {
        status: 'expiring-warning',
        color: 'accent',
        label: `${daysUntilExpiry} days`,
      };
    } else {
      return {
        status: 'valid',
        color: 'primary',
        label: expiryDate.toLocaleDateString(),
      };
    }
  }

  viewOrganization(organizationId: string): void {
    this.router.navigate(['/super-admin/organizations'], {
      queryParams: { highlight: organizationId },
    });
  }

  getLicenseTooltip(license: LicenseKey): string {
    const parts: string[] = [];
    
    if (license.organizationName) {
      parts.push(`Organization: ${license.organizationName}`);
    }
    
    if (license.email) {
      parts.push(`Email: ${license.email}`);
    }
    
    if (license.consumedAt) {
      parts.push(`Consumed: ${new Date(license.consumedAt).toLocaleString()}`);
    }
    
    if (license.notes) {
      parts.push(`Notes: ${license.notes}`);
    }
    
    if (license.maxUsers) {
      parts.push(`Max Users: ${license.maxUsers}`);
    }
    
    if (license.storageQuotaMb) {
      parts.push(`Storage: ${license.storageQuotaMb} MB`);
    }
    
    parts.push(`Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
    
    return parts.join('\n') || 'No additional details';
  }

  togglePayrollFeature(key: LicenseKey): void {
    // Default to false if undefined
    const currentValue = key.enablePayroll ?? false;
    const newValue = !currentValue;
    this.licenseKeysService
      .updateFeatures(key.id, { enablePayroll: newValue })
      .subscribe({
        next: (updated) => {
          key.enablePayroll = updated.enablePayroll ?? false;
          this.snackBar.open(
            `Payroll feature ${newValue ? 'enabled' : 'disabled'}`,
            'Close',
            { duration: 3000 },
          );
        },
        error: () => {
          this.snackBar.open(
            'Failed to update payroll feature',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  toggleInventoryFeature(key: LicenseKey): void {
    // Default to false if undefined
    const currentValue = key.enableInventory ?? false;
    const newValue = !currentValue;
    this.licenseKeysService
      .updateFeatures(key.id, { enableInventory: newValue })
      .subscribe({
        next: (updated) => {
          key.enableInventory = updated.enableInventory ?? false;
          this.snackBar.open(
            `Inventory feature ${newValue ? 'enabled' : 'disabled'}`,
            'Close',
            { duration: 3000 },
          );
        },
        error: () => {
          this.snackBar.open(
            'Failed to update inventory feature',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  toggleBulkJournalImportFeature(key: LicenseKey): void {
    const currentValue = key.enableBulkJournalImport ?? false;
    const newValue = !currentValue;
    this.licenseKeysService
      .updateFeatures(key.id, { enableBulkJournalImport: newValue })
      .subscribe({
        next: (updated) => {
          key.enableBulkJournalImport = updated.enableBulkJournalImport ?? false;
          this.snackBar.open(
            `Bulk journal import (migration) ${newValue ? 'enabled' : 'disabled'}`,
            'Close',
            { duration: 3000 },
          );
        },
        error: () => {
          this.snackBar.open(
            'Failed to update bulk journal import feature',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }
}

