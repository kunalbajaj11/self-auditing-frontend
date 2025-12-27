import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import {
  OrganizationUsage,
  SuperAdminService,
} from '../../../core/services/super-admin.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationFormDialogComponent } from './organization-form-dialog.component';
import {
  ActivateOrganizationDialogComponent,
  ActivateOrganizationDialogData,
} from './activate-organization-dialog.component';
import {
  UpgradeLicenseDialogComponent,
  UpgradeLicenseDialogData,
  UpgradeLicenseResult,
} from './upgrade-license-dialog.component';
import {
  AllocateUploadsDialogComponent,
  AllocateUploadsDialogData,
} from './allocate-uploads-dialog.component';
import {
  LicenseKeyRenewDialogComponent,
  LicenseKeyRenewResult,
} from '../license-keys/license-key-renew-dialog.component';
import { PlanType } from '../../../core/models/plan.model';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-super-admin-organizations',
  templateUrl: './super-admin-organizations.component.html',
  styleUrls: ['./super-admin-organizations.component.scss'],
})
export class SuperAdminOrganizationsComponent implements OnInit {
  displayedColumns = [
    'name',
    'planType',
    'status',
    'licenseExpires',
    'userCount',
    'expenseCount',
    'accrualCount',
    'storage',
    'createdAt',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<OrganizationUsage>([]);

  readonly searchControl = new FormControl('');
  loading = false;
  error: string | null = null;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly organizationService: OrganizationService,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data, filter) =>
      `${data.name} ${data.planType} ${data.status}`
        .toLowerCase()
        .includes(filter);
    this.loadOrganizations();
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((value) => this.applyFilter(value ?? ''));
  }

  refresh(): void {
    this.loadOrganizations();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(OrganizationFormDialogComponent, {
      width: '480px',
      data: null,
    });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.snackBar.open('Organization created successfully', 'Close', {
          duration: 3000,
        });
        this.loadOrganizations();
      }
    });
  }

  upgradeLicense(org: OrganizationUsage): void {
    const dialogRef = this.dialog.open<
      UpgradeLicenseDialogComponent,
      UpgradeLicenseDialogData,
      UpgradeLicenseResult | null
    >(UpgradeLicenseDialogComponent, {
      width: '600px',
      data: {
        organizationName: org.name,
        currentPlanType: org.planType as PlanType,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.method === 'direct' && result.planType) {
          // Direct plan type change
          this.organizationService.changePlanType(org.id, result.planType).subscribe({
            next: (updated) => {
              org.planType = updated.planType;
              if (updated.storageQuotaMb) {
                // Update storage quota if available in the response
              }
              this.snackBar.open(
                `Plan type changed successfully to ${updated.planType}`,
                'Close',
                { duration: 3000 },
              );
              this.dataSource.data = [...this.dataSource.data];
            },
            error: (error) => {
              const message =
                error?.error?.message ??
                'Failed to change plan type. Please try again.';
              this.snackBar.open(message, 'Close', {
                duration: 4000,
                panelClass: ['snack-error'],
              });
            },
          });
        } else if (result.method === 'licenseKey' && result.licenseKey) {
          // License key upgrade
          this.organizationService.upgradeLicense(org.id, result.licenseKey).subscribe({
            next: (updated) => {
              org.planType = updated.planType;
              if (updated.storageQuotaMb) {
                // Update storage quota if available in the response
              }
              this.snackBar.open(
                `License upgraded successfully to ${updated.planType}`,
                'Close',
                { duration: 3000 },
              );
              this.dataSource.data = [...this.dataSource.data];
            },
            error: (error) => {
              const message =
                error?.error?.message ??
                'Failed to upgrade license. Please check the license key and try again.';
              this.snackBar.open(message, 'Close', {
                duration: 4000,
                panelClass: ['snack-error'],
              });
            },
          });
        }
      }
    });
  }

  allocateUploads(org: OrganizationUsage): void {
    // Get license and upload usage for this organization
    forkJoin({
      license: this.licenseKeysService.getByOrganizationId(org.id),
      usage: this.licenseKeysService.getUploadUsage(org.id),
    }).subscribe({
      next: ({ license, usage }) => {
        if (!license) {
          this.snackBar.open(
            'No license found for this organization',
            'Close',
            { duration: 3000, panelClass: ['snack-error'] },
          );
          return;
        }

        const dialogRef = this.dialog.open<
          AllocateUploadsDialogComponent,
          AllocateUploadsDialogData,
          boolean
        >(AllocateUploadsDialogComponent, {
          width: '600px',
          data: {
            organizationId: org.id,
            organizationName: org.name,
            licenseId: license.id,
            currentUsage: usage,
          },
        });

        dialogRef.afterClosed().subscribe((allocated) => {
          if (allocated) {
            this.snackBar.open(
              'Upload allocation updated successfully',
              'Close',
              { duration: 3000 },
            );
            // Optionally refresh the list
          }
        });
      },
      error: () => {
        this.snackBar.open(
          'Failed to load license information',
          'Close',
          { duration: 3000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  renewLicense(org: OrganizationUsage): void {
    // Get the license key for this organization
    this.licenseKeysService.getByOrganizationId(org.id).subscribe({
      next: (license) => {
        if (!license) {
          this.snackBar.open(
            'No license found for this organization',
            'Close',
            { duration: 3000, panelClass: ['snack-error'] },
          );
          return;
        }

        const dialogRef = this.dialog.open<
          LicenseKeyRenewDialogComponent,
          { license: any },
          LicenseKeyRenewResult
        >(LicenseKeyRenewDialogComponent, {
          width: '400px',
          disableClose: true,
          data: { license },
        });

        dialogRef.afterClosed().subscribe((result?: LicenseKeyRenewResult) => {
          if (result?.refresh) {
            this.snackBar.open('License renewed successfully', 'Close', {
              duration: 3000,
            });
            this.loadOrganizations(); // Refresh to get updated expiry date
          }
        });
      },
      error: () => {
        this.snackBar.open(
          'Failed to load license information',
          'Close',
          { duration: 3000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  toggleStatus(org: OrganizationUsage): void {
    if (org.status === 'active') {
      // Deactivate: simple status change
      this.organizationService.changeStatus(org.id, 'inactive').subscribe({
        next: () => {
          org.status = 'inactive';
          this.snackBar.open('Organization deactivated', 'Close', {
            duration: 3000,
          });
          this.dataSource.data = [...this.dataSource.data];
        },
        error: () => {
          this.snackBar.open(
            'Failed to deactivate organization. Please retry.',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
    } else {
      // Activate: show dialog for expiry date
      const dialogRef = this.dialog.open<
        ActivateOrganizationDialogComponent,
        ActivateOrganizationDialogData,
        string | null
      >(ActivateOrganizationDialogComponent, {
        width: '480px',
        data: { organizationName: org.name },
      });

      dialogRef.afterClosed().subscribe((expiryDate) => {
        if (expiryDate) {
          this.organizationService.activateWithExpiry(org.id, expiryDate).subscribe({
            next: () => {
              org.status = 'active';
              this.snackBar.open(
                'Organization activated successfully',
                'Close',
                { duration: 3000 },
              );
              this.dataSource.data = [...this.dataSource.data];
            },
            error: () => {
              this.snackBar.open(
                'Failed to activate organization. Please retry.',
                'Close',
                { duration: 4000, panelClass: ['snack-error'] },
              );
            },
          });
        }
      });
    }
  }

  getLicenseExpiryStatus(expiresAt: string | null | undefined): {
    status: 'expired' | 'expiring-soon' | 'expiring-warning' | 'valid';
    color: string;
    label: string;
  } {
    if (!expiresAt) {
      return { status: 'valid', color: 'primary', label: 'No license' };
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
        label: `Expires in ${daysUntilExpiry} days`,
      };
    } else if (daysUntilExpiry <= 60) {
      return {
        status: 'expiring-warning',
        color: 'accent',
        label: `Expires in ${daysUntilExpiry} days`,
      };
    } else {
      return {
        status: 'valid',
        color: 'primary',
        label: expiresAt ? new Date(expiresAt).toLocaleDateString() : '—',
      };
    }
  }

  private loadOrganizations(): void {
    this.loading = true;
    this.error = null;
    this.superAdminService.usage().subscribe({
      next: (usage) => {
        this.loading = false;
        this.dataSource.data = usage;
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load organizations right now.';
      },
    });
  }

  private applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
  }
}

