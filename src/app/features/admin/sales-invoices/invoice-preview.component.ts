import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';

interface InvoicePreviewData {
  invoice: any;
  templateSettings: {
    logoUrl?: string;
    headerText?: string;
    colorScheme?: string;
    customColor?: string;
    title?: string;
    showCompanyDetails?: boolean;
    showVatDetails?: boolean;
    showPaymentTerms?: boolean;
    showBankDetails?: boolean;
    showTermsAndConditions?: boolean;
    showItemDescription?: boolean;
    showItemQuantity?: boolean;
    showItemUnitPrice?: boolean;
    showItemTotal?: boolean;
    defaultPaymentTerms?: string;
    customPaymentTerms?: string;
    defaultNotes?: string;
    termsAndConditions?: string;
    footerText?: string;
    showFooter?: boolean;
  };
}

@Component({
  selector: 'app-invoice-preview',
  templateUrl: './invoice-preview.component.html',
  styleUrls: ['./invoice-preview.component.scss'],
})
export class InvoicePreviewComponent implements OnInit {
  invoiceId: string | null = null;
  previewData: InvoicePreviewData | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id');
    if (this.invoiceId) {
      this.loadPreview();
    } else {
      this.error = 'Invoice ID not provided';
      this.loading = false;
    }
  }

  loadPreview(): void {
    if (!this.invoiceId) return;

    this.loading = true;
    this.error = null;

    this.invoicesService.getInvoicePreview(this.invoiceId).subscribe({
      next: (data) => {
        this.previewData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading invoice preview:', err);
        this.error = 'Failed to load invoice preview';
        this.loading = false;
        this.snackBar.open('Failed to load invoice preview', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  downloadPDF(): void {
    if (!this.invoiceId) return;

    this.invoicesService.downloadInvoicePDF(this.invoiceId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${this.previewData?.invoice?.invoiceNumber || this.invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading PDF:', err);
        this.snackBar.open('Failed to download invoice PDF', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  printInvoice(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/admin/sales-invoices']);
  }

  getColorScheme(): string {
    if (!this.previewData?.templateSettings) return '#1976d2';
    const scheme = this.previewData.templateSettings.colorScheme;
    if (scheme === 'custom' && this.previewData.templateSettings.customColor) {
      return this.previewData.templateSettings.customColor;
    }
    const colorMap: Record<string, string> = {
      blue: '#1976d2',
      green: '#2e7d32',
      purple: '#7b1fa2',
      orange: '#f57c00',
      red: '#d32f2f',
    };
    return colorMap[scheme || 'blue'] || '#1976d2';
  }
}

