import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { DeliveryChallansService, DeliveryChallan } from '../../../core/services/delivery-challans.service';
import { DeliveryChallanFormDialogComponent } from './delivery-challan-form-dialog.component';
import { DeliveryChallanDetailDialogComponent } from './delivery-challan-detail-dialog.component';

@Component({
  selector: 'app-admin-delivery-challans',
  templateUrl: './admin-delivery-challans.component.html',
  styleUrls: ['./admin-delivery-challans.component.scss'],
})
export class AdminDeliveryChallansComponent implements OnInit {
  readonly columns = [
    'challanNumber',
    'customerName',
    'challanDate',
    'salesOrder',
    'status',
    'actions',
  ] as const;

  readonly dataSource = new MatTableDataSource<DeliveryChallan>([]);
  loading = false;

  constructor(
    private readonly deliveryChallansService: DeliveryChallansService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadDeliveryChallans();
  }

  loadDeliveryChallans(): void {
    this.loading = true;
    this.deliveryChallansService.listDeliveryChallans().subscribe({
      next: (dcs) => {
        this.loading = false;
        this.dataSource.data = dcs;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load delivery challans', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DeliveryChallanFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Delivery Challan created successfully', 'Close', {
          duration: 3000,
        });
        this.loadDeliveryChallans();
      }
    });
  }

  view(dc: DeliveryChallan): void {
    const dialogRef = this.dialog.open(DeliveryChallanDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { dcId: dc.id },
    });
    dialogRef.afterClosed().subscribe(() => this.loadDeliveryChallans());
  }

  edit(dc: DeliveryChallan): void {
    const dialogRef = this.dialog.open(DeliveryChallanFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dc,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Delivery Challan updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadDeliveryChallans();
      }
    });
  }

  delete(dc: DeliveryChallan): void {
    if (!confirm(`Are you sure you want to delete delivery challan ${dc.challanNumber}?`)) return;
    this.deliveryChallansService.deleteDeliveryChallan(dc.id).subscribe({
      next: () => {
        this.snackBar.open('Delivery Challan deleted successfully', 'Close', { duration: 3000 });
        this.loadDeliveryChallans();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete delivery challan',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      dispatched: 'Dispatched',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: 'accent',
      dispatched: 'primary',
      delivered: 'primary',
      cancelled: 'warn',
    };
    return colorMap[status] || 'accent';
  }
}

