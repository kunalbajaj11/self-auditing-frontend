import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaxFormsService } from '../../../core/services/tax-forms.service';
import { TaxForm, TaxFormType, TaxFormStatus } from '../../../core/models/tax-form.model';
import { GenerateVATReturnDialogComponent } from './generate-vat-return-dialog.component';
import { TaxFormDetailDialogComponent } from './tax-form-detail-dialog.component';

@Component({
  selector: 'app-admin-tax-forms',
  templateUrl: './admin-tax-forms.component.html',
  styleUrls: ['./admin-tax-forms.component.scss'],
})
export class AdminTaxFormsComponent implements OnInit {
  readonly columns = [
    'formType',
    'period',
    'status',
    'generatedAt',
    'filedAt',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<TaxForm>([]);
  loading = false;

  form: FormGroup;
  formTypes = Object.values(TaxFormType);
  statuses = Object.values(TaxFormStatus);

  constructor(
    private readonly fb: FormBuilder,
    private readonly taxFormsService: TaxFormsService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      formType: [''],
      period: [''],
    });
  }

  ngOnInit(): void {
    this.loadTaxForms();
  }

  loadTaxForms(): void {
    this.loading = true;
    const formType = this.form.get('formType')?.value || undefined;
    const period = this.form.get('period')?.value || undefined;

    this.taxFormsService.getTaxForms(formType, period).subscribe({
      next: (forms) => {
        this.dataSource.data = forms;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tax forms:', error);
        this.snackBar.open('Error loading tax forms', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  openGenerateDialog(): void {
    const dialogRef = this.dialog.open(GenerateVATReturnDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTaxForms();
      }
    });
  }

  viewForm(form: TaxForm): void {
    this.dialog.open(TaxFormDetailDialogComponent, {
      width: '800px',
      data: form,
    });
  }

  downloadForm(form: TaxForm): void {
    if (!form.formData) {
      this.snackBar.open('Form data not available', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.taxFormsService
      .downloadVATReturn({
        formType: form.formType,
        period: form.period,
        format: (form.fileFormat as 'pdf' | 'excel' | 'csv') || 'pdf',
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${form.formType}_${form.period}.${form.fileFormat || 'pdf'}`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error downloading form:', error);
          this.snackBar.open('Error downloading form', 'Close', { duration: 3000 });
          this.loading = false;
        },
      });
  }

  getFormTypeLabel(formType: TaxFormType): string {
    const labels: Record<TaxFormType, string> = {
      [TaxFormType.VAT_RETURN_UAE]: 'UAE VAT Return',
      [TaxFormType.VAT_RETURN_SAUDI]: 'Saudi VAT Return',
      [TaxFormType.VAT_RETURN_OMAN]: 'Oman VAT Return',
      [TaxFormType.VAT_RETURN_KUWAIT]: 'Kuwait VAT Return',
      [TaxFormType.VAT_RETURN_BAHRAIN]: 'Bahrain VAT Return',
      [TaxFormType.VAT_RETURN_QATAR]: 'Qatar VAT Return',
      [TaxFormType.TDS_RETURN_26Q]: 'TDS Return (26Q)',
      [TaxFormType.TDS_RETURN_27Q]: 'TDS Return (27Q)',
      [TaxFormType.TDS_RETURN_24Q]: 'TDS Return (24Q)',
      [TaxFormType.EPF_CHALLAN]: 'EPF Challan',
      [TaxFormType.ESI_CHALLAN]: 'ESI Challan',
      [TaxFormType.GSTR_1]: 'GSTR-1',
      [TaxFormType.GSTR_3B]: 'GSTR-3B',
    };
    return labels[formType] || formType;
  }

  getStatusColor(status: TaxFormStatus): string {
    const colors: Record<TaxFormStatus, string> = {
      [TaxFormStatus.DRAFT]: 'gray',
      [TaxFormStatus.GENERATED]: 'blue',
      [TaxFormStatus.VALIDATED]: 'green',
      [TaxFormStatus.FILED]: 'green',
      [TaxFormStatus.REJECTED]: 'red',
    };
    return colors[status] || 'gray';
  }

  getCountByStatus(status: string): number {
    return this.dataSource.data.filter((form) => form.status === status).length;
  }

  getFormTypeIcon(formType: TaxFormType): string {
    const icons: Record<TaxFormType, string> = {
      [TaxFormType.VAT_RETURN_UAE]: 'receipt_long',
      [TaxFormType.VAT_RETURN_SAUDI]: 'receipt_long',
      [TaxFormType.VAT_RETURN_OMAN]: 'receipt_long',
      [TaxFormType.VAT_RETURN_KUWAIT]: 'receipt_long',
      [TaxFormType.VAT_RETURN_BAHRAIN]: 'receipt_long',
      [TaxFormType.VAT_RETURN_QATAR]: 'receipt_long',
      [TaxFormType.TDS_RETURN_26Q]: 'description',
      [TaxFormType.TDS_RETURN_27Q]: 'description',
      [TaxFormType.TDS_RETURN_24Q]: 'description',
      [TaxFormType.EPF_CHALLAN]: 'account_balance_wallet',
      [TaxFormType.ESI_CHALLAN]: 'account_balance_wallet',
      [TaxFormType.GSTR_1]: 'assignment',
      [TaxFormType.GSTR_3B]: 'assignment',
    };
    return icons[formType] || 'description';
  }
}

