import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { InventoryService, StockMovement, StockMovementType, CreateStockMovementPayload } from '../../../core/services/inventory.service';
import { StockMovementFormDialogComponent } from './stock-movement-form-dialog.component';

@Component({
  selector: 'app-admin-stock-movements',
  templateUrl: './admin-stock-movements.component.html',
  styleUrls: ['./admin-stock-movements.component.scss'],
})
export class AdminStockMovementsComponent implements OnInit {
  readonly columns = ['date', 'product', 'location', 'type', 'quantity', 'unitCost', 'totalCost', 'createdBy', 'notes', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<StockMovement>([]);
  loading = false;
  movementTypes = [
    { value: StockMovementType.PURCHASE, label: 'Purchase' },
    { value: StockMovementType.SALE, label: 'Sale' },
    { value: StockMovementType.ADJUSTMENT, label: 'Adjustment' },
    { value: StockMovementType.TRANSFER, label: 'Transfer' },
    { value: StockMovementType.RETURN, label: 'Return' },
  ];
  selectedType: StockMovementType | '' = '';

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.loading = true;
    const filters: any = {};
    if (this.selectedType) {
      filters.movementType = this.selectedType;
    }
    this.inventoryService.listStockMovements(filters).subscribe({
      next: (movements) => {
        this.loading = false;
        this.dataSource.data = movements;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load stock movements', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openDialog(movement?: StockMovement): void {
    const dialogRef = this.dialog.open(StockMovementFormDialogComponent, {
      width: '600px',
      data: movement ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          movement ? 'Stock movement updated' : 'Stock movement recorded',
          'Close',
          { duration: 3000 },
        );
        this.loadMovements();
      }
    });
  }

  getMovementTypeLabel(type: StockMovementType): string {
    const movementType = this.movementTypes.find((mt) => mt.value === type);
    return movementType?.label || type;
  }

  getTypeColor(type: StockMovementType): 'primary' | 'accent' | 'warn' {
    switch (type) {
      case StockMovementType.PURCHASE:
        return 'primary';
      case StockMovementType.SALE:
        return 'accent';
      case StockMovementType.ADJUSTMENT:
        return 'warn';
      default:
        return 'primary';
    }
  }

  getQuantity(movement: StockMovement): number {
    return parseFloat(movement.quantity);
  }

  getTotalCost(movement: StockMovement): number {
    return parseFloat(movement.quantity) * parseFloat(movement.unitCost);
  }

  onTypeFilterChange(): void {
    this.loadMovements();
  }
}

