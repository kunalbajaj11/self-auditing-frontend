import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { LicenseService } from '../../../core/services/license.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-employee-upload',
  templateUrl: './employee-upload.component.html',
  styleUrls: ['./employee-upload.component.scss'],
})
export class EmployeeUploadComponent implements OnInit {
  categories: Category[] = [];
  loading = false;
  isEnterprise$: Observable<boolean>;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly categoriesService: CategoriesService,
    private readonly expensesService: ExpensesService,
    private readonly snackBar: MatSnackBar,
    private readonly licenseService: LicenseService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
    this.form = this.fb.group({
      vendorName: ['', Validators.required],
      categoryId: [''],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      vatAmount: [0, [Validators.min(0)]],
      expenseDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],
      description: [''],
      attachmentUrl: [''],
    });
  }

  ngOnInit(): void {
    this.categoriesService.listCategories().subscribe((categories) => {
      this.categories = categories;
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const value = this.form.getRawValue();
    const attachments = value.attachmentUrl
      ? [
          {
            fileName: value.vendorName
              ? `${value.vendorName}-receipt`
              : 'receipt',
            fileUrl: value.attachmentUrl,
            fileType: 'application/octet-stream',
            fileSize: 1,
          },
        ]
      : [];

    this.expensesService
      .createExpense({
        type: 'expense',
        categoryId: value.categoryId || undefined,
        amount: Number(value.amount ?? 0),
        vatAmount: Number(value.vatAmount ?? 0),
        expenseDate:
          value.expenseDate ?? new Date().toISOString().substring(0, 10),
        vendorName: value.vendorName ?? undefined,
        description: value.description ?? undefined,
        attachments,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Expense submitted for approval', 'Close', {
            duration: 3000,
          });
          this.form.reset({
            vendorName: '',
            categoryId: '',
            amount: 0,
            vatAmount: 0,
            expenseDate: new Date().toISOString().substring(0, 10),
            description: '',
            attachmentUrl: '',
          });
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(
            'Unable to submit expense. Please check the details.',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }
}

