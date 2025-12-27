import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { LicenseService } from '../../../core/services/license.service';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { UploadUsage } from '../../../core/models/license-key.model';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-employee-upload',
  templateUrl: './employee-upload.component.html',
  styleUrls: ['./employee-upload.component.scss'],
})
export class EmployeeUploadComponent implements OnInit {
  categories: Category[] = [];
  loading = false;
  isEnterprise$: Observable<boolean>;
  canUploadExpense$: Observable<boolean>;
  uploadUsage$!: Observable<UploadUsage | null>;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly categoriesService: CategoriesService,
    private readonly expensesService: ExpensesService,
    private readonly snackBar: MatSnackBar,
    private readonly licenseService: LicenseService,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly organizationService: OrganizationService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
    this.canUploadExpense$ = this.licenseService.canUploadExpense().pipe(
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

    // Load upload usage
    this.uploadUsage$ = this.organizationService.getMyOrganization().pipe(
      switchMap((org) => 
        this.licenseKeysService.getUploadUsage(org.id).pipe(
          catchError(() => of(null)),
        )
      ),
      catchError(() => of(null)),
    );
  }

  submit(): void {
    // Check if upload is allowed
    this.canUploadExpense$.pipe(take(1)).subscribe((canUpload) => {
      if (!canUpload) {
        this.snackBar.open('Upload expense feature is not available for your license type. Please contact your administrator.', 'Close', {
          duration: 5000,
          panelClass: ['snack-error'],
        });
        return;
      }
      this.doSubmit();
    });
  }

  private doSubmit(): void {
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
        error: (error) => {
          this.loading = false;
          const message =
            error?.error?.message ??
            'Unable to submit expense. Please check the details.';
          this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
        },
      });
  }
}

