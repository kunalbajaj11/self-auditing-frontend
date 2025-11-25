import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { ExpenseTypesService, ExpenseType } from '../../../core/services/expense-types.service';

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './category-form-dialog.component.html',
  styleUrls: ['./category-form-dialog.component.scss'],
})
export class CategoryFormDialogComponent implements OnInit {
  readonly isEdit: boolean;
  loading = false;
  expenseTypes: ExpenseType[] = [];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CategoryFormDialogComponent>,
    private readonly categoriesService: CategoriesService,
    private readonly expenseTypesService: ExpenseTypesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: Category | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [
        data?.name ?? '',
        [Validators.required, Validators.maxLength(100)],
      ],
      description: [data?.description ?? ''],
      expenseType: [data?.expenseType ?? ''],
      expenseTypeId: [data?.expenseTypeId ?? null],
    });
  }

  ngOnInit(): void {
    this.expenseTypesService.listExpenseTypes().subscribe({
      next: (types) => {
        this.expenseTypes = types;
      },
      error: () => {
        this.snackBar.open('Failed to load expense types', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const payload = this.normalizePayload(this.form.getRawValue());
    const request$ = this.isEdit
      ? this.categoriesService.updateCategory(this.data!.id, payload)
      : this.categoriesService.createCategory(payload);
    request$.subscribe({
      next: (category) => {
        this.loading = false;
        this.snackBar.open(
          `Category ${this.isEdit ? 'updated' : 'created'} successfully`,
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close(category);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(
          `Failed to ${this.isEdit ? 'update' : 'create'} category`,
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private normalizePayload(value: any): { 
    name: string; 
    description?: string;
    expenseType?: string;
    expenseTypeId?: string;
  } {
    return {
      name: value.name ?? '',
      description: value.description ?? undefined,
      expenseType: value.expenseType || undefined,
      expenseTypeId: value.expenseTypeId && value.expenseTypeId !== null && value.expenseTypeId !== '' ? String(value.expenseTypeId) : undefined,
    };
  }
}

