import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProductsService, Product } from '../../../core/services/products.service';
import { ProductFormDialogComponent } from './product-form-dialog.component';

@Component({
  selector: 'app-admin-products',
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss'],
})
export class AdminProductsComponent implements OnInit {
  readonly columns = ['name', 'sku', 'unitPrice', 'stockQuantity', 'isActive', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<Product>([]);
  loading = false;

  constructor(
    private readonly productsService: ProductsService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.listProducts().subscribe({
      next: (products) => {
        this.loading = false;
        this.dataSource.data = products;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load products', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openDialog(product?: Product): void {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: product ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          product ? 'Product updated' : 'Product created',
          'Close',
          { duration: 3000 },
        );
        this.loadProducts();
      }
    });
  }

  delete(product: Product): void {
    if (!confirm(`Delete product "${product.name}"?`)) {
      return;
    }
    this.productsService.deleteProduct(product.id).subscribe({
      next: () => {
        this.snackBar.open('Product deleted', 'Close', { duration: 3000 });
        this.loadProducts();
      },
      error: () => {
        this.snackBar.open('Failed to delete product', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }
}

