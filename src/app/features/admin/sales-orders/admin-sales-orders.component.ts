import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { SalesOrdersService, SalesOrder } from '../../../core/services/sales-orders.service';
import { SalesOrderFormDialogComponent } from './sales-order-form-dialog.component';
import { SalesOrderDetailDialogComponent } from './sales-order-detail-dialog.component';

@Component({
  selector: 'app-admin-sales-orders',
  templateUrl: './admin-sales-orders.component.html',
  styleUrls: ['./admin-sales-orders.component.scss'],
})
export class AdminSalesOrdersComponent implements OnInit {
  readonly columns = [
    'soNumber',
    'customerName',
    'orderDate',
    'expectedDeliveryDate',
    'totalAmount',
    'status',
    'actions',
  ] as const;

  readonly dataSource = new MatTableDataSource<SalesOrder>([]);
  loading = false;

  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadSalesOrders();
  }

  loadSalesOrders(): void {
    this.loading = true;
    this.salesOrdersService.listSalesOrders().subscribe({
      next: (orders) => {
        this.loading = false;
        this.dataSource.data = orders;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load sales orders', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SalesOrderFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Sales Order created successfully', 'Close', {
          duration: 3000,
        });
        this.loadSalesOrders();
      }
    });
  }

  viewSalesOrder(so: SalesOrder): void {
    const dialogRef = this.dialog.open(SalesOrderDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { soId: so.id },
    });

    dialogRef.afterClosed().subscribe(() => this.loadSalesOrders());
  }

  editSalesOrder(so: SalesOrder): void {
    const dialogRef = this.dialog.open(SalesOrderFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: so,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Sales Order updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadSalesOrders();
      }
    });
  }

  deleteSalesOrder(so: SalesOrder): void {
    if (!confirm(`Are you sure you want to delete sales order ${so.soNumber}?`)) {
      return;
    }

    this.salesOrdersService.deleteSalesOrder(so.id).subscribe({
      next: () => {
        this.snackBar.open('Sales Order deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadSalesOrders();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete sales order',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      confirmed: 'Confirmed',
      partially_delivered: 'Partially Delivered',
      fully_delivered: 'Fully Delivered',
      invoiced: 'Invoiced',
      closed: 'Closed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: 'accent',
      sent: 'primary',
      confirmed: 'primary',
      partially_delivered: 'accent',
      fully_delivered: 'primary',
      invoiced: 'primary',
      closed: 'primary',
      cancelled: 'warn',
    };
    return colorMap[status] || 'accent';
  }
}

