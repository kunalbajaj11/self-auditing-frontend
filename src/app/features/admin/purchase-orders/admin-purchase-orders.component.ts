import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrdersService, PurchaseOrder } from '../../../core/services/purchase-orders.service';
import { PurchaseOrderFormDialogComponent } from './purchase-order-form-dialog.component';
import { PurchaseOrderDetailDialogComponent } from './purchase-order-detail-dialog.component';

@Component({
  selector: 'app-admin-purchase-orders',
  templateUrl: './admin-purchase-orders.component.html',
  styleUrls: ['./admin-purchase-orders.component.scss'],
})
export class AdminPurchaseOrdersComponent implements OnInit {
  readonly columns = [
    'poNumber',
    'vendorName',
    'poDate',
    'expectedDeliveryDate',
    'totalAmount',
    'status',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<PurchaseOrder>([]);
  loading = false;

  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  loadPurchaseOrders(): void {
    this.loading = true;
    this.purchaseOrdersService.listPurchaseOrders().subscribe({
      next: (pos) => {
        this.loading = false;
        this.dataSource.data = pos;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load purchase orders', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PurchaseOrderFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Purchase Order created successfully', 'Close', {
          duration: 3000,
        });
        this.loadPurchaseOrders();
      }
    });
  }

  viewPurchaseOrder(po: PurchaseOrder): void {
    const dialogRef = this.dialog.open(PurchaseOrderDetailDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { poId: po.id },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadPurchaseOrders();
    });
  }

  editPurchaseOrder(po: PurchaseOrder): void {
    const dialogRef = this.dialog.open(PurchaseOrderFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: po,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Purchase Order updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadPurchaseOrders();
      }
    });
  }

  deletePurchaseOrder(po: PurchaseOrder): void {
    if (!confirm(`Are you sure you want to delete purchase order ${po.poNumber}?`)) {
      return;
    }

    this.purchaseOrdersService.deletePurchaseOrder(po.id).subscribe({
      next: () => {
        this.snackBar.open('Purchase Order deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadPurchaseOrders();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete purchase order',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'sent': 'Sent',
      'acknowledged': 'Acknowledged',
      'partially_received': 'Partially Received',
      'fully_received': 'Fully Received',
      'invoiced': 'Invoiced',
      'closed': 'Closed',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'draft': 'accent',
      'sent': 'primary',
      'acknowledged': 'primary',
      'partially_received': 'accent',
      'fully_received': 'primary',
      'invoiced': 'primary',
      'closed': 'primary',
      'cancelled': 'warn',
    };
    return colorMap[status] || 'accent';
  }
}
