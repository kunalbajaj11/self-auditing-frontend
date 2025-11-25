import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { CategoryFormDialogComponent } from './category-form-dialog.component';

@Component({
  selector: 'app-admin-categories',
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.scss'],
})
export class AdminCategoriesComponent implements OnInit {
  readonly columns = ['name', 'description', 'type', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<Category>([]);
  loading = false;

  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  openDialog(category?: Category): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '420px',
      data: category ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategories();
      }
    });
  }

  delete(category: Category): void {
    if (!confirm(`Delete category "${category.name}"?`)) {
      return;
    }
    this.categoriesService.deleteCategory(category.id).subscribe({
      next: () => {
        this.snackBar.open('Category deleted', 'Close', { duration: 3000 });
        this.loadCategories();
      },
      error: () => {
        this.snackBar.open('Unable to delete category', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  private loadCategories(): void {
    this.loading = true;
    this.categoriesService.listCategories().subscribe({
      next: (categories) => {
        this.loading = false;
        this.dataSource.data = categories;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load categories', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }
}

