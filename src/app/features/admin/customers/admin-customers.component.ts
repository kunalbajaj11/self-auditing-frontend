import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { CustomerFormDialogComponent } from './customer-form-dialog.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-customers',
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-customers.component.scss'],
})
export class AdminCustomersComponent implements OnInit {
  readonly columns = [
    'name',
    'customerTrn',
    'email',
    'phone',
    'paymentTerms',
    'isActive',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<Customer>([]);
  loading = false;
  searchTerm = '';
  showActiveOnly = true;

  constructor(
    private readonly customersService: CustomersService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Check if create dialog should open
    this.route.queryParams.subscribe((params) => {
      if (params['view'] === 'create') {
        this.openDialog();
      }
    });
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customersService
      .listCustomers(
        this.searchTerm || undefined,
        this.showActiveOnly ? true : undefined,
      )
      .subscribe({
        next: (customers) => {
          this.loading = false;
          this.dataSource.data = customers;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to load customers', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  openDialog(customer?: Customer): void {
    const dialogRef = this.dialog.open(CustomerFormDialogComponent, {
      width: '640px',
      data: customer ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          customer ? 'Customer updated' : 'Customer created',
          'Close',
          { duration: 3000 },
        );
        this.loadCustomers();
      }
    });
  }

  delete(customer: Customer): void {
    if (!confirm(`Delete customer "${customer.name}"?`)) {
      return;
    }
    this.customersService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.snackBar.open('Customer deleted', 'Close', { duration: 3000 });
        this.loadCustomers();
      },
      error: () => {
        this.snackBar.open('Failed to delete customer', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  onSearchChange(): void {
    this.loadCustomers();
  }

  toggleActiveFilter(): void {
    this.showActiveOnly = !this.showActiveOnly;
    this.loadCustomers();
  }
}

