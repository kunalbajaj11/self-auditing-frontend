import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationService } from '../../../../core/services/organization.service';
import { SettingsService, InvoiceTemplateSettings } from '../../../../core/services/settings.service';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-invoice-template',
  templateUrl: './invoice-template.component.html',
  styleUrls: ['./invoice-template.component.scss'],
})
export class InvoiceTemplateComponent implements OnInit {
  loading = false;
  saving = false;
  logoDataUrl: string | null = null;

  readonly form;
  readonly paymentTermOptions = [
    { value: 'Due on receipt', label: 'Due on receipt' },
    { value: 'Net 7', label: 'Net 7' },
    { value: 'Net 15', label: 'Net 15' },
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Net 45', label: 'Net 45' },
    { value: 'Net 60', label: 'Net 60' },
    { value: 'Custom', label: 'Custom' },
  ];

  readonly colorSchemes = [
    { value: 'blue', label: 'Blue', color: '#1976d2' },
    { value: 'green', label: 'Green', color: '#2e7d32' },
    { value: 'purple', label: 'Purple', color: '#7b1fa2' },
    { value: 'orange', label: 'Orange', color: '#f57c00' },
    { value: 'red', label: 'Red', color: '#d32f2f' },
    { value: 'custom', label: 'Custom', color: '#000000' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly organizationService: OrganizationService,
    private readonly settingsService: SettingsService,
    private readonly apiService: ApiService,
  ) {
    this.form = this.fb.group({
      // Branding
      logoUrl: [''],
      headerText: [''],
      colorScheme: ['blue'],
      customColor: ['#1976d2'],
      
      // Content
      showCompanyDetails: [true],
      showVatDetails: [true],
      showPaymentTerms: [true],
      showPaymentMethods: [true],
      showBankDetails: [false],
      showTermsAndConditions: [true],
      
      // Defaults
      defaultPaymentTerms: ['Net 30'],
      customPaymentTerms: [''],
      defaultNotes: [''],
      termsAndConditions: [''],
      
      // Layout
      invoiceTitle: ['TAX INVOICE'],
      showItemDescription: [true],
      showItemQuantity: [true],
      showItemUnitPrice: [true],
      showItemTotal: [true],
      
      // Footer
      footerText: [''],
      showFooter: [true],
      
      // Email
      emailSubject: ['Invoice {{invoiceNumber}} from {{companyName}}'],
      emailMessage: ['Please find attached invoice {{invoiceNumber}} for {{totalAmount}} {{currency}}.'],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.loading = true;
    this.settingsService.getInvoiceTemplate().subscribe({
      next: (settings) => {
        // Store the logo URL path for form value (used when saving)
        const logoUrl = settings.invoiceLogoUrl || '';
        
        this.form.patchValue({
          logoUrl,
          headerText: settings.invoiceHeaderText ?? '',
          colorScheme: settings.invoiceColorScheme ?? 'blue',
          customColor: settings.invoiceCustomColor ?? '#1976d2',
          invoiceTitle: settings.invoiceTitle ?? 'TAX INVOICE',
          showCompanyDetails: settings.invoiceShowCompanyDetails ?? true,
          showVatDetails: settings.invoiceShowVatDetails ?? true,
          showPaymentTerms: settings.invoiceShowPaymentTerms ?? true,
          showPaymentMethods: settings.invoiceShowPaymentMethods ?? true,
          showBankDetails: settings.invoiceShowBankDetails ?? false,
          showTermsAndConditions: settings.invoiceShowTermsConditions ?? true,
          defaultPaymentTerms: settings.invoiceDefaultPaymentTerms ?? 'Net 30',
          customPaymentTerms: settings.invoiceCustomPaymentTerms ?? '',
          defaultNotes: settings.invoiceDefaultNotes ?? '',
          termsAndConditions: settings.invoiceTermsConditions ?? '',
          footerText: settings.invoiceFooterText ?? '',
          showFooter: settings.invoiceShowFooter ?? true,
          showItemDescription: settings.invoiceShowItemDescription ?? true,
          showItemQuantity: settings.invoiceShowItemQuantity ?? true,
          showItemUnitPrice: settings.invoiceShowItemUnitPrice ?? true,
          showItemTotal: settings.invoiceShowItemTotal ?? true,
          emailSubject: settings.invoiceEmailSubject ?? 'Invoice {{invoiceNumber}} from {{companyName}}',
          emailMessage: settings.invoiceEmailMessage ?? 'Please find attached invoice {{invoiceNumber}} for {{totalAmount}} {{currency}}.',
        });
        
        // Load logo with authentication if URL is present
        if (logoUrl) {
          this.loadLogoWithAuth(logoUrl);
        }
        
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      error: (err) => {
        console.error('Error loading logo:', err);
        // Silently fail - settings will show without logo preview
        this.logoDataUrl = null;
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload: Partial<InvoiceTemplateSettings> = {
      invoiceLogoUrl: this.form.get('logoUrl')?.value || null,
      invoiceHeaderText: this.form.get('headerText')?.value || null,
      invoiceColorScheme: this.form.get('colorScheme')?.value,
      invoiceCustomColor: this.showCustomColor ? this.form.get('customColor')?.value : null,
      invoiceTitle: this.form.get('invoiceTitle')?.value,
      invoiceShowCompanyDetails: this.form.get('showCompanyDetails')?.value,
      invoiceShowVatDetails: this.form.get('showVatDetails')?.value,
      invoiceShowPaymentTerms: this.form.get('showPaymentTerms')?.value,
      invoiceShowPaymentMethods: this.form.get('showPaymentMethods')?.value,
      invoiceShowBankDetails: this.form.get('showBankDetails')?.value,
      invoiceShowTermsConditions: this.form.get('showTermsAndConditions')?.value,
      invoiceDefaultPaymentTerms: this.form.get('defaultPaymentTerms')?.value,
      invoiceCustomPaymentTerms: this.showCustomPaymentTerms ? this.form.get('customPaymentTerms')?.value : null,
      invoiceDefaultNotes: this.form.get('defaultNotes')?.value?.trim() || null,
      invoiceTermsConditions: this.form.get('termsAndConditions')?.value?.trim() || null,
      invoiceFooterText: this.form.get('footerText')?.value?.trim() || null,
      invoiceShowFooter: this.form.get('showFooter')?.value,
      invoiceShowItemDescription: this.form.get('showItemDescription')?.value,
      invoiceShowItemQuantity: this.form.get('showItemQuantity')?.value,
      invoiceShowItemUnitPrice: this.form.get('showItemUnitPrice')?.value,
      invoiceShowItemTotal: this.form.get('showItemTotal')?.value,
      invoiceEmailSubject: this.form.get('emailSubject')?.value,
      invoiceEmailMessage: this.form.get('emailMessage')?.value,
    };

    this.settingsService.updateInvoiceTemplate(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Invoice template settings saved successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save invoice template settings', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  preview(): void {
    // Get a sample invoice ID or create preview data
    // For now, we'll show a message that preview requires an existing invoice
    // In a real implementation, you might want to create a sample invoice or use the latest invoice
    this.snackBar.open('Preview feature: Use the preview button on an existing invoice to see template settings applied.', 'Close', {
      duration: 5000,
    });
  }

  uploadLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Invalid file type. Only JPEG, PNG, and SVG images are allowed.', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.snackBar.open('File size exceeds 5MB limit.', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }

      // Upload to server
      this.saving = true;
      this.settingsService.uploadInvoiceLogo(file).subscribe({
        next: (result) => {
          // Store the logo URL path in form
          this.form.patchValue({ logoUrl: result.logoUrl });
          // Load the newly uploaded logo with authentication
          this.loadLogoWithAuth(result.logoUrl);
          this.saving = false;
          this.snackBar.open('Logo uploaded successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.saving = false;
          const errorMessage = error?.error?.message || 'Failed to upload logo';
          this.snackBar.open(errorMessage, 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
    }
  }

  removeLogo(): void {
    this.form.patchValue({ logoUrl: '' });
    this.logoDataUrl = null;
    this.snackBar.open('Logo removed. Click Save to apply changes.', 'Close', {
      duration: 3000,
    });
  }

  onLogoError(event: Event): void {
    // Handle logo loading error - hide the broken image
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  get showCustomPaymentTerms(): boolean {
    return this.form.get('defaultPaymentTerms')?.value === 'Custom';
  }

  get showCustomColor(): boolean {
    return this.form.get('colorScheme')?.value === 'custom';
  }
}

