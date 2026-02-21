import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { InventoryService, InventoryLocation } from '../../../core/services/inventory.service';
import { LocationFormDialogComponent } from './location-form-dialog.component';

@Component({
  selector: 'app-admin-inventory-locations',
  templateUrl: './admin-inventory-locations.component.html',
  styleUrls: ['./admin-inventory-locations.component.scss'],
})
export class AdminInventoryLocationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly columns = ['name', 'address', 'isDefault', 'isActive', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<InventoryLocation>([]);
  loading = false;

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadLocations(): void {
    this.loading = true;
    this.inventoryService.listLocations().subscribe({
      next: (locations) => {
        this.loading = false;
        this.dataSource.data = locations;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load locations', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openDialog(location?: InventoryLocation): void {
    const dialogRef = this.dialog.open(LocationFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: location ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          location ? 'Location updated' : 'Location created',
          'Close',
          { duration: 3000 },
        );
        this.loadLocations();
      }
    });
  }
}

