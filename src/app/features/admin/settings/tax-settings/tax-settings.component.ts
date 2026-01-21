import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OrganizationService } from '../../../../core/services/organization.service';
import { SettingsService, TaxRate, TaxSettings } from '../../../../core/services/settings.service';
import { TaxRateFormDialogComponent } from './tax-rate-form-dialog.component';

@Component({
  selector: 'app-tax-settings',
  templateUrl: './tax-settings.component.html',
  styleUrls: ['./tax-settings.component.scss'],
})
export class TaxSettingsComponent implements OnInit {
  loading = false;
  saving = false;
  taxRates: TaxRate[] = [];

  readonly form;
  readonly taxTypes = [
    { value: 'standard', label: 'Standard Rate' },
    { value: 'reduced', label: 'Reduced Rate' },
    { value: 'zero', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly organizationService: OrganizationService,
    private readonly settingsService: SettingsService,
  ) {
    this.form = this.fb.group({
      // Organization Tax Info
      vatNumber: [''],
      taxRegistrationNumber: [''],
      taxRegistrationDate: [''],
      taxAuthority: ['Federal Tax Authority'],
      
      // Tax Calculation
      taxCalculationMethod: ['exclusive', [Validators.required]], // inclusive or exclusive
      defaultTaxRate: ['5', [Validators.required]],
      roundingMethod: ['standard'], // standard, up, down
      
      // Tax Reporting
      taxReportingPeriod: ['monthly'], // monthly, quarterly, annually
      taxYearEnd: ['12-31'],
      
      // Reverse Charge
      enableReverseCharge: [false],
      reverseChargeRate: ['5'],
      
      // Tax Codes
      defaultTaxCode: [''],
      
      // Settings
      showTaxOnInvoices: [true],
      showTaxBreakdown: [true],
      calculateTaxOnShipping: [true],
      calculateTaxOnDiscounts: [false],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadTaxRates();
  }

  private loadSettings(): void {
    this.loading = true;
    this.organizationService.getMyOrganization().subscribe({
      next: (org) => {
        this.form.patchValue({
          vatNumber: org.vatNumber || '',
        });
      },
      error: () => {},
    });

    this.settingsService.getTaxSettings().subscribe({
      next: (settings) => {
        this.form.patchValue({
          taxRegistrationNumber: settings.taxRegistrationNumber ?? '',
          taxRegistrationDate: settings.taxRegistrationDate ?? '',
          taxAuthority: settings.taxAuthority ?? 'Federal Tax Authority',
          taxCalculationMethod: settings.taxCalculationMethod ?? 'exclusive',
          defaultTaxRate: settings.taxDefaultRate?.toString() ?? '5',
          roundingMethod: settings.taxRoundingMethod ?? 'standard',
          defaultTaxCode: settings.taxDefaultCode ?? '',
          taxReportingPeriod: settings.taxReportingPeriod ?? 'monthly',
          taxYearEnd: settings.taxYearEnd ?? '',
          enableReverseCharge: settings.taxEnableReverseCharge ?? false,
          reverseChargeRate: settings.taxReverseChargeRate?.toString() ?? '5',
          calculateTaxOnShipping: settings.taxCalculateOnShipping ?? true,
          calculateTaxOnDiscounts: settings.taxCalculateOnDiscounts ?? false,
          showTaxOnInvoices: settings.taxShowOnInvoices ?? true,
          showTaxBreakdown: settings.taxShowBreakdown ?? true,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadTaxRates(): void {
    this.settingsService.getTaxRates().subscribe({
      next: (rates) => {
        this.taxRates = rates;
      },
      error: () => {
        // If no rates exist, initialize with defaults
        this.taxRates = [];
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload: Partial<TaxSettings> = {
      taxRegistrationNumber: this.form.get('taxRegistrationNumber')?.value || null,
      taxRegistrationDate: this.form.get('taxRegistrationDate')?.value || null,
      taxAuthority: this.form.get('taxAuthority')?.value,
      taxCalculationMethod: this.form.get('taxCalculationMethod')?.value,
      taxDefaultRate: parseFloat(this.form.get('defaultTaxRate')?.value || '5'),
      taxRoundingMethod: this.form.get('roundingMethod')?.value,
      taxDefaultCode: this.form.get('defaultTaxCode')?.value || null,
      taxReportingPeriod: this.form.get('taxReportingPeriod')?.value,
      taxYearEnd: this.form.get('taxYearEnd')?.value || null,
      taxEnableReverseCharge: this.form.get('enableReverseCharge')?.value,
      taxReverseChargeRate: this.form.get('enableReverseCharge')?.value
        ? parseFloat(this.form.get('reverseChargeRate')?.value || '5')
        : null,
      taxCalculateOnShipping: this.form.get('calculateTaxOnShipping')?.value,
      taxCalculateOnDiscounts: this.form.get('calculateTaxOnDiscounts')?.value,
      taxShowOnInvoices: this.form.get('showTaxOnInvoices')?.value,
      taxShowBreakdown: this.form.get('showTaxBreakdown')?.value,
    };

    this.settingsService.updateTaxSettings(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Tax settings saved successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save tax settings', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  addTaxRate(): void {
    const dialogRef = this.dialog.open(TaxRateFormDialogComponent, {
      width: '500px',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.settingsService.createTaxRate(result).subscribe({
          next: (created) => {
            this.taxRates = [...this.taxRates, created];
            this.snackBar.open('Tax rate created', 'Close', { duration: 2000 });
          },
          error: () => {
            this.snackBar.open('Failed to create tax rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
          },
        });
      }
    });
  }

  editTaxRate(rate: TaxRate): void {
    const dialogRef = this.dialog.open(TaxRateFormDialogComponent, {
      width: '500px',
      data: rate,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && rate.id) {
        this.settingsService.updateTaxRate(rate.id, result).subscribe({
          next: (updated) => {
            const index = this.taxRates.findIndex(r => r.id === rate.id);
            if (index >= 0) {
              this.taxRates[index] = updated;
              this.taxRates = [...this.taxRates];
            }
            this.snackBar.open('Tax rate updated', 'Close', { duration: 2000 });
          },
          error: () => {
            this.snackBar.open('Failed to update tax rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
          },
        });
      }
    });
  }

  deleteTaxRate(rate: TaxRate): void {
    if (!rate.id) {
      this.taxRates = this.taxRates.filter(r => r !== rate);
      return;
    }
    if (!confirm(`Delete tax rate "${rate.name}"?`)) return;

    this.settingsService.deleteTaxRate(rate.id).subscribe({
      next: () => {
        this.taxRates = this.taxRates.filter(r => r.id !== rate.id);
        this.snackBar.open('Tax rate deleted', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Failed to delete tax rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
      },
    });
  }

  toggleTaxRate(rate: TaxRate): void {
    if (!rate.id) return;
    rate.isActive = !rate.isActive;
    this.settingsService.updateTaxRate(rate.id, { isActive: rate.isActive }).subscribe({
      error: () => {
        rate.isActive = !rate.isActive; // Revert on error
        this.snackBar.open('Failed to update tax rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
      },
    });
  }
}

