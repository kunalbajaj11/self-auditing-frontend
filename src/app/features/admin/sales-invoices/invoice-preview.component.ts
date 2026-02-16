import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';
import { ApiService } from '../../../core/services/api.service';

interface InvoicePreviewData {
  invoice: any;
  amountInWords?: string | null;
  templateSettings: {
    logoUrl?: string;
    signatureUrl?: string;
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
    /** Cash Received / Bank Received / Receivable (from invoice payment status) */
    paymentTermsDisplay?: string;
    defaultNotes?: string;
    termsAndConditions?: string;
    termsAndConditionsList?: string[];
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
  logoDataUrl: string | null = null;
  signatureDataUrl: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    private readonly apiService: ApiService,
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
    this.logoDataUrl = null;
    this.signatureDataUrl = null;

    this.invoicesService.getInvoicePreview(this.invoiceId).subscribe({
      next: (data) => {
        this.previewData = data;
        if (data.templateSettings?.logoUrl) {
          this.loadLogoWithAuth(data.templateSettings.logoUrl);
        }
        if (data.templateSettings?.signatureUrl) {
          this.loadSignatureWithAuth(data.templateSettings.signatureUrl);
        }
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

  /**
   * Load logo image with authentication and convert to data URL
   * This is needed because <img> tags don't send auth headers
   */
  private loadLogoWithAuth(logoUrl: string): void {
    // Convert relative URL to API endpoint path
    const endpoint = logoUrl.startsWith('/api/') 
      ? logoUrl.substring(4) // Remove '/api' prefix since apiService adds it
      : logoUrl.startsWith('/') 
        ? logoUrl 
        : `/${logoUrl}`;
    
    this.apiService.download(endpoint).subscribe({
      next: (blob) => {
        // Convert blob to data URL for display in img tag
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoDataUrl = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        this.logoDataUrl = null;
      },
    });
  }

  private loadSignatureWithAuth(signatureUrl: string): void {
    const endpoint = signatureUrl.startsWith('/api/')
      ? signatureUrl.substring(4)
      : signatureUrl.startsWith('/')
        ? signatureUrl
        : `/${signatureUrl}`;

    this.apiService.download(endpoint).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.signatureDataUrl = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        this.signatureDataUrl = null;
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
        const prefix = this.invoicesService.getPdfFilenamePrefix(this.previewData?.invoice?.status);
        a.download = `${prefix}${this.previewData?.invoice?.invoiceNumber || this.invoiceId}.pdf`;
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

  exportEInvoice(format: 'xml' | 'json'): void {
    if (!this.invoiceId) return;

    this.invoicesService.exportEInvoice(this.invoiceId, format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'xml' ? 'xml' : 'json';
        const prefix = this.invoicesService.getPdfFilenamePrefix(this.previewData?.invoice?.status);
        a.download = `${prefix}${this.previewData?.invoice?.invoiceNumber || this.invoiceId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open(`Invoice exported as ${ext.toUpperCase()}`, 'Close', {
          duration: 2000,
          panelClass: ['snack-success'],
        });
      },
      error: (err) => {
        console.error('Export failed:', err);
        this.snackBar.open('Failed to export invoice', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  /** Back route and label by document type: Proforma → proforma-invoices, Quotation → quotations, else sales-invoices */
  getBackRoute(): { url: string[]; label: string } {
    const status = (this.previewData?.invoice?.status ?? '').toLowerCase();
    if (status === 'proforma_invoice') {
      return { url: ['/admin/proforma-invoices'], label: 'Back to Proforma Invoices' };
    }
    if (status === 'quotation') {
      return { url: ['/admin/quotations'], label: 'Back to Quotations' };
    }
    return { url: ['/admin/sales-invoices'], label: 'Back to Invoices' };
  }

  goBack(): void {
    const { url } = this.getBackRoute();
    this.router.navigate(url);
  }

  getDiscountAmount(): number {
    return parseFloat(this.previewData?.invoice?.discountAmount ?? '0') || 0;
  }

  /** Effective VAT % for summary label: from line items if single rate, else derived from amounts */
  getEffectiveVatRate(): string {
    const invoice = this.previewData?.invoice;
    if (!invoice?.lineItems?.length) return '5';
    const taxableRates = (invoice.lineItems as any[])
      .filter(
        (li: any) =>
          (li.vatTaxType || '').toLowerCase() !== 'zero_rated' &&
          (li.vatTaxType || '').toLowerCase() !== 'exempt',
      )
      .map((li: any) => parseFloat(li.vatRate || '0'))
      .filter((r) => !Number.isNaN(r) && r >= 0);
    const unique = [...new Set(taxableRates.map((r) => r.toFixed(1)))];
    if (unique.length === 1) return unique[0];
    const subtotal = parseFloat(invoice.amount || '0') || 0;
    const discount = this.getDiscountAmount();
    const totalVat = parseFloat(invoice.vatAmount || '0') || 0;
    const taxBase = subtotal - discount;
    if (taxBase > 0 && totalVat >= 0)
      return ((totalVat / taxBase) * 100).toFixed(1);
    return '5';
  }

  hasReverseChargeLine(): boolean {
    const items = this.previewData?.invoice?.lineItems;
    if (!items || !Array.isArray(items)) return false;
    return items.some(
      (item: any) =>
        (item.vatTaxType || '').toLowerCase() === 'reverse_charge',
    );
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

  /** Title from backend: "PROFORMA INVOICE" | "Tax Invoice" | "Invoice" (no status appended). */
  getInvoiceTitle(): string {
    return this.previewData?.templateSettings?.title ?? 'Invoice';
  }
}

