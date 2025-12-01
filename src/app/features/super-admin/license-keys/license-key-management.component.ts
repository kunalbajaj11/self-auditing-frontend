import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
export class LicenseKeyManagementComponent implements OnInit {
  loading = false;
  licenseKeys: LicenseKey[] = [];
  displayedColumns = ['key', 'plan', 'status', 'email', 'expires', 'created', 'actions'];

  constructor(
    private readonly licenseKeysService: LicenseKeysService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadKeys();
  }

  loadKeys(): void {
    this.loading = true;
    this.licenseKeysService.list().subscribe({
      next: (keys) => {
        this.loading = false;
        this.licenseKeys = keys;
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
}

