import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { VendorFormDialogComponent } from './vendor-form-dialog.component';

@Component({
  selector: 'app-admin-vendors',
  templateUrl: './admin-vendors.component.html',
  styleUrls: ['./admin-vendors.component.scss'],
})
export class AdminVendorsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly columns = [
    'name',
    'vendorTrn',
    'category',
    'email',
    'phone',
    'paymentTerms',
    'isActive',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<Vendor>([]);
  loading = false;
  searchTerm = '';
  showActiveOnly = true;

  constructor(
    private readonly vendorsService: VendorsService,
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
    this.loadVendors();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadVendors(): void {
    this.loading = true;
    this.vendorsService
      .listVendors({
        search: this.searchTerm || undefined,
        isActive: this.showActiveOnly ? true : undefined,
      })
      .subscribe({
        next: (vendors) => {
          this.loading = false;
          this.dataSource.data = vendors;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to load vendors', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  openDialog(vendor?: Vendor): void {
    const dialogRef = this.dialog.open(VendorFormDialogComponent, {
      width: '600px',
      data: vendor ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          vendor ? 'Vendor updated' : 'Vendor created',
          'Close',
          { duration: 3000 },
        );
        this.loadVendors();
      }
    });
  }

  delete(vendor: Vendor): void {
    if (!confirm(`Delete vendor "${vendor.name}"?`)) {
      return;
    }
    this.vendorsService.deleteVendor(vendor.id).subscribe({
      next: () => {
        this.snackBar.open('Vendor deleted', 'Close', { duration: 3000 });
        this.loadVendors();
      },
      error: () => {
        this.snackBar.open('Failed to delete vendor', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  onSearchChange(): void {
    this.loadVendors();
  }

  toggleActiveFilter(): void {
    this.showActiveOnly = !this.showActiveOnly;
    this.loadVendors();
  }
}

