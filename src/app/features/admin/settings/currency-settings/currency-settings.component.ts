import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OrganizationService } from '../../../../core/services/organization.service';
import { SettingsService, ExchangeRate, CurrencySettings } from '../../../../core/services/settings.service';
import { ExchangeRateFormDialogComponent } from './exchange-rate-form-dialog.component';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isBase: boolean;
}

@Component({
  selector: 'app-currency-settings',
  templateUrl: './currency-settings.component.html',
  styleUrls: ['./currency-settings.component.scss'],
})
export class CurrencySettingsComponent implements OnInit {
  loading = false;
  saving = false;
  exchangeRates: ExchangeRate[] = [];
  currencies: Currency[] = [];

  readonly form;
  readonly commonCurrencies = [
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
  ];

  readonly exchangeRateSources = [
    { value: 'manual', label: 'Manual Entry' },
    { value: 'api', label: 'API (Fixer.io/ExchangeRate-API)' },
    { value: 'auto', label: 'Auto Update Daily' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly organizationService: OrganizationService,
    private readonly settingsService: SettingsService,
  ) {
    this.form = this.fb.group({
      // Base Currency
      baseCurrency: ['AED', [Validators.required]],
      
      // Exchange Rate Settings
      exchangeRateSource: ['api', [Validators.required]],
      autoUpdateRates: [true],
      updateFrequency: ['daily'], // daily, weekly, monthly
      
      // FX Gain/Loss
      trackFxGainLoss: [true],
      fxGainLossAccount: [''],
      
      // Currency Display
      currencyDisplayFormat: ['symbol'], // symbol, code, both
      showCurrencyOnInvoices: [true],
      showExchangeRateOnInvoices: [false],
      
      // Rounding
      currencyRounding: ['2', [Validators.required]], // decimal places
      roundingMethod: ['standard'], // standard, up, down
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadCurrencies();
    this.loadExchangeRates();
  }

  private loadSettings(): void {
    this.loading = true;
    this.organizationService.getMyOrganization().subscribe({
      next: (org) => {
        this.form.patchValue({
          baseCurrency: org.baseCurrency || org.currency || 'AED',
        });
      },
      error: () => {},
    });

    this.settingsService.getCurrencySettings().subscribe({
      next: (settings) => {
        this.form.patchValue({
          exchangeRateSource: settings.currencyExchangeRateSource ?? 'api',
          autoUpdateRates: settings.currencyAutoUpdateRates ?? true,
          updateFrequency: settings.currencyUpdateFrequency ?? 'daily',
          trackFxGainLoss: settings.currencyTrackFxGainLoss ?? true,
          fxGainLossAccount: settings.currencyFxGainLossAccount ?? '',
          currencyDisplayFormat: settings.currencyDisplayFormat ?? 'symbol',
          currencyRounding: settings.currencyRounding?.toString() ?? '2',
          roundingMethod: settings.currencyRoundingMethod ?? 'standard',
          showCurrencyOnInvoices: settings.currencyShowOnInvoices ?? true,
          showExchangeRateOnInvoices: settings.currencyShowExchangeRate ?? false,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadCurrencies(): void {
    this.organizationService.getMyOrganization().subscribe({
      next: (org) => {
        const baseCurrency = org.baseCurrency || org.currency || 'AED';
        this.currencies = this.commonCurrencies
          .filter(c => ['AED', 'USD', 'EUR', 'GBP', 'SAR'].includes(c.code))
          .map(c => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
            isActive: true,
            isBase: c.code === baseCurrency,
          }));
      },
    });
  }

  private loadExchangeRates(): void {
    this.settingsService.getExchangeRates().subscribe({
      next: (rates) => {
        this.exchangeRates = rates;
      },
      error: () => {
        this.exchangeRates = [];
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload: Partial<CurrencySettings> = {
      currencyExchangeRateSource: this.form.get('exchangeRateSource')?.value,
      currencyAutoUpdateRates: this.form.get('autoUpdateRates')?.value,
      currencyUpdateFrequency: this.form.get('updateFrequency')?.value,
      currencyTrackFxGainLoss: this.form.get('trackFxGainLoss')?.value,
      currencyFxGainLossAccount: this.form.get('fxGainLossAccount')?.value || null,
      currencyDisplayFormat: this.form.get('currencyDisplayFormat')?.value,
      currencyRounding: parseInt(this.form.get('currencyRounding')?.value || '2'),
      currencyRoundingMethod: this.form.get('roundingMethod')?.value,
      currencyShowOnInvoices: this.form.get('showCurrencyOnInvoices')?.value,
      currencyShowExchangeRate: this.form.get('showExchangeRateOnInvoices')?.value,
    };

    this.settingsService.updateCurrencySettings(payload).subscribe({
      next: () => {
        // Also update base currency in organization
        const baseCurrency = this.form.get('baseCurrency')?.value;
        if (baseCurrency) {
          this.organizationService.updateMyOrganization({ baseCurrency }).subscribe();
        }
        this.saving = false;
        this.snackBar.open('Currency settings saved successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save currency settings', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  addCurrency(): void {
    // For now, add from common currencies list
    // In production, you might want a dialog to select from all available currencies
    const availableCurrencies = this.commonCurrencies.filter(
      c => !this.currencies.some(existing => existing.code === c.code)
    );
    
    if (availableCurrencies.length === 0) {
      this.snackBar.open('All common currencies are already added', 'Close', { duration: 3000 });
      return;
    }

    // Add first available currency (in production, show a selection dialog)
    const currency = availableCurrencies[0];
    this.currencies = [...this.currencies, {
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      isActive: true,
      isBase: false,
    }];
    this.snackBar.open(`${currency.name} added`, 'Close', { duration: 2000 });
  }

  toggleCurrency(currency: Currency): void {
    currency.isActive = !currency.isActive;
    // Currency toggling is handled locally, no API call needed
  }

  setBaseCurrency(currency: Currency): void {
    this.currencies.forEach(c => c.isBase = false);
    currency.isBase = true;
    this.form.patchValue({ baseCurrency: currency.code });
    this.organizationService.updateMyOrganization({ baseCurrency: currency.code }).subscribe({
      next: () => {
        this.snackBar.open('Base currency updated', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Failed to update base currency', 'Close', { duration: 3000, panelClass: ['snack-error'] });
      },
    });
  }

  addExchangeRate(): void {
    const dialogRef = this.dialog.open(ExchangeRateFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.settingsService.createExchangeRate(result).subscribe({
          next: (created) => {
            this.exchangeRates = [...this.exchangeRates, created];
            this.snackBar.open('Exchange rate added', 'Close', { duration: 2000 });
          },
          error: () => {
            this.snackBar.open('Failed to add exchange rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
          },
        });
      }
    });
  }

  editExchangeRate(rate: ExchangeRate): void {
    const dialogRef = this.dialog.open(ExchangeRateFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: rate,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && rate.id) {
        if (result.rate !== undefined) {
          this.settingsService.updateExchangeRate(rate.id, result.rate).subscribe({
            next: (updated) => {
              const index = this.exchangeRates.findIndex(r => r.id === rate.id);
              if (index >= 0) {
                this.exchangeRates[index] = updated;
                this.exchangeRates = [...this.exchangeRates];
              }
              this.snackBar.open('Exchange rate updated', 'Close', { duration: 2000 });
            },
            error: () => {
              this.snackBar.open('Failed to update exchange rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
            },
          });
        }
      }
    });
  }

  deleteExchangeRate(rate: ExchangeRate): void {
    if (!rate.id) return;
    if (!confirm(`Delete exchange rate ${rate.fromCurrency} to ${rate.toCurrency}?`)) return;

    this.settingsService.deleteExchangeRate(rate.id).subscribe({
      next: () => {
        this.exchangeRates = this.exchangeRates.filter(r => r.id !== rate.id);
        this.snackBar.open('Exchange rate deleted', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Failed to delete exchange rate', 'Close', { duration: 3000, panelClass: ['snack-error'] });
      },
    });
  }

  updateRatesFromAPI(): void {
    this.loading = true;
    this.settingsService.updateExchangeRatesFromAPI().subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Exchange rates updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadExchangeRates();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to update exchange rates', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  getCurrencyName(code: string): string {
    const currency = this.commonCurrencies.find(c => c.code === code);
    return currency ? currency.name : code;
  }
}

