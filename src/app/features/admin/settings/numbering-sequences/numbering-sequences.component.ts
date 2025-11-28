import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettingsService, NumberingSequence, NumberingSettings } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-numbering-sequences',
  templateUrl: './numbering-sequences.component.html',
  styleUrls: ['./numbering-sequences.component.scss'],
})
export class NumberingSequencesComponent implements OnInit {
  loading = false;
  saving = false;
  sequences: NumberingSequence[] = [];

  readonly form;
  readonly sequenceTypes = [
    { value: 'invoice', label: 'Sales Invoice', icon: 'receipt', defaultPrefix: 'INV' },
    { value: 'credit_note', label: 'Credit Note', icon: 'note', defaultPrefix: 'CN' },
    { value: 'quote', label: 'Quote/Estimate', icon: 'description', defaultPrefix: 'QTE' },
    { value: 'purchase_order', label: 'Purchase Order', icon: 'shopping_cart', defaultPrefix: 'PO' },
    { value: 'payment_receipt', label: 'Payment Receipt', icon: 'payment', defaultPrefix: 'REC' },
    { value: 'expense', label: 'Expense', icon: 'receipt_long', defaultPrefix: 'EXP' },
  ];

  readonly resetPeriods = [
    { value: 'never', label: 'Never Reset' },
    { value: 'yearly', label: 'Reset Yearly' },
    { value: 'quarterly', label: 'Reset Quarterly' },
    { value: 'monthly', label: 'Reset Monthly' },
  ];

  readonly formatExamples = {
    invoice: 'INV-{YYYY}-{NNNNN}',
    credit_note: 'CN-{YYYY}-{NNNNN}',
    quote: 'QTE-{MMYY}-{NNNN}',
    purchase_order: 'PO-{YYYY}-{NNNNN}',
    payment_receipt: 'REC-{YYYYMMDD}-{NNN}',
    expense: 'EXP-{YYYY}-{NNNNN}',
  };

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly settingsService: SettingsService,
  ) {
    this.form = this.fb.group({
      // Global settings
      useSequentialNumbering: [true],
      allowManualNumbering: [false],
      warnOnDuplicateNumbers: [true],
    });
  }

  ngOnInit(): void {
    this.loadSequences();
  }

  private loadSequences(): void {
    this.loading = true;
    this.settingsService.getNumberingSettings().subscribe({
      next: (data) => {
        this.form.patchValue({
          useSequentialNumbering: data.settings.numberingUseSequential ?? true,
          allowManualNumbering: data.settings.numberingAllowManual ?? false,
          warnOnDuplicateNumbers: data.settings.numberingWarnDuplicates ?? true,
        });

        // Load or create sequences
        if (data.sequences.length > 0) {
          this.sequences = data.sequences;
        } else {
          // Initialize default sequences if none exist
          this.sequences = this.sequenceTypes.map(type => ({
            type: type.value as any,
            prefix: type.defaultPrefix,
            suffix: '',
            nextNumber: 1,
            numberLength: 5,
            resetPeriod: 'never' as any,
            isActive: true,
            format: this.formatExamples[type.value as keyof typeof this.formatExamples],
          }));
        }
        this.loading = false;
      },
      error: () => {
        // Initialize defaults on error
        this.sequences = this.sequenceTypes.map(type => ({
          type: type.value as any,
          prefix: type.defaultPrefix,
          suffix: '',
          nextNumber: 1,
          numberLength: 5,
          resetPeriod: 'never' as any,
          isActive: true,
          format: this.formatExamples[type.value as keyof typeof this.formatExamples],
        }));
        this.loading = false;
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload: Partial<NumberingSettings> = {
      numberingUseSequential: this.form.get('useSequentialNumbering')?.value,
      numberingAllowManual: this.form.get('allowManualNumbering')?.value,
      numberingWarnDuplicates: this.form.get('warnOnDuplicateNumbers')?.value,
    };

    this.settingsService.updateNumberingSettings(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Numbering settings saved successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save numbering settings', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  saveSequence(sequence: NumberingSequence): void {
    const payload: Partial<NumberingSequence> = {
      prefix: sequence.prefix,
      suffix: sequence.suffix,
      nextNumber: sequence.nextNumber,
      numberLength: sequence.numberLength,
      resetPeriod: sequence.resetPeriod,
      format: sequence.format,
      isActive: sequence.isActive,
    };

    this.settingsService.updateNumberingSequence(sequence.type, payload).subscribe({
      next: (updated) => {
        const index = this.sequences.findIndex(s => s.type === sequence.type);
        if (index >= 0) {
          this.sequences[index] = updated;
          this.sequences = [...this.sequences];
        }
        this.snackBar.open('Sequence saved', 'Close', {
          duration: 2000,
        });
      },
      error: () => {
        this.snackBar.open('Failed to save sequence', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  editSequence(sequence: NumberingSequence): void {
    // For now, editing is done inline
    // In production, you might want a dialog
    this.snackBar.open('Edit sequence fields directly and click Save', 'Close', {
      duration: 3000,
    });
  }

  resetSequence(sequence: NumberingSequence): void {
    if (confirm(`Reset ${this.getSequenceLabel(sequence.type)} numbering to 1?`)) {
      this.settingsService.resetNumberingSequence(sequence.type).subscribe({
        next: (updated) => {
          const index = this.sequences.findIndex(s => s.type === sequence.type);
          if (index >= 0) {
            this.sequences[index] = updated;
            this.sequences = [...this.sequences];
          }
          this.snackBar.open('Sequence reset successfully', 'Close', {
            duration: 2000,
          });
        },
        error: () => {
          this.snackBar.open('Failed to reset sequence', 'Close', {
            duration: 3000,
            panelClass: ['snack-error'],
          });
        },
      });
    }
  }

  toggleSequence(sequence: NumberingSequence): void {
    sequence.isActive = !sequence.isActive;
    this.saveSequence(sequence);
  }

  previewFormat(sequence: NumberingSequence): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const number = String(sequence.nextNumber).padStart(sequence.numberLength, '0');
    
    let format = sequence.format || `${sequence.prefix}-{NNNNN}`;
    format = format.replace('{YYYY}', String(year));
    format = format.replace('{MMYY}', month + String(year).slice(-2));
    format = format.replace('{YYYYMMDD}', year + month + day);
    format = format.replace('{NNNNN}', number);
    format = format.replace('{NNNN}', number.slice(-4));
    format = format.replace('{NNN}', number.slice(-3));
    
    return format;
  }

  getSequenceLabel(type: string): string {
    return this.sequenceTypes.find(t => t.value === type)?.label || type;
  }

  getSequenceIcon(type: string): string {
    return this.sequenceTypes.find(t => t.value === type)?.icon || 'label';
  }

  updateFormat(sequence: NumberingSequence): void {
    // Auto-generate format based on prefix, suffix, and number length
    const parts: string[] = [];
    if (sequence.prefix) parts.push(sequence.prefix);
    parts.push(`{NNNNN}`);
    if (sequence.suffix) parts.push(sequence.suffix);
    sequence.format = parts.join('-');
  }
}

