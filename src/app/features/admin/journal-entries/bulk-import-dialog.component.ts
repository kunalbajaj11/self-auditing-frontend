import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  JournalEntriesService,
  CreateJournalEntryPayload,
} from '../../../core/services/journal-entries.service';
import { ACCOUNT_METADATA } from '../../../core/services/journal-entries.service';

const VALID_ACCOUNTS = new Set([
  'cash',
  'bank',
  'accounts_receivable',
  'vat_receivable',
  'prepaid_expenses',
  'accounts_payable',
  'vat_payable',
  'customer_advances',
  'share_capital',
  'owner_shareholder_account',
  'sales_revenue',
  'general_expense',
]);

function isValidAccount(code: string): boolean {
  if (code.startsWith('ledger:')) {
    const uuid = code.slice(7);
    return /^[a-f0-9-]{36}$/i.test(uuid);
  }
  return VALID_ACCOUNTS.has(code);
}

interface ParsedRow {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  entryDate: string;
  description?: string;
  error?: string;
}

@Component({
  selector: 'app-bulk-import-dialog',
  templateUrl: './bulk-import-dialog.component.html',
  styleUrls: ['./bulk-import-dialog.component.scss'],
})
export class BulkImportDialogComponent {
  csvText = '';
  parsedRows: ParsedRow[] = [];
  loading = false;
  parseError: string | null = null;

  readonly csvFormat = `debitAccount,creditAccount,amount,entryDate,description
bank,owner_shareholder_account,100000,2025-01-01,Opening balance - Bank
cash,owner_shareholder_account,5000,2025-01-01,Opening balance - Cash`;

  constructor(
    private readonly dialogRef: MatDialogRef<BulkImportDialogComponent>,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly snackBar: MatSnackBar,
  ) {}

  parseCsv(): void {
    this.parseError = null;
    this.parsedRows = [];

    const trimmed = this.csvText.trim();
    if (!trimmed) {
      return;
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      this.parseError = 'CSV must have a header row and at least one data row.';
      return;
    }

    const header = lines[0].toLowerCase();
    const hasHeader =
      header.includes('debitaccount') &&
      header.includes('creditaccount') &&
      header.includes('amount') &&
      header.includes('entrydate');

    const dataStart = hasHeader ? 1 : 0;
    const rows: ParsedRow[] = [];

    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i];
      const parts = this.parseCsvLine(line);

      if (parts.length < 4) {
        rows.push({
          debitAccount: '',
          creditAccount: '',
          amount: 0,
          entryDate: '',
          error: `Row ${i + 1}: Invalid format. Expected: debitAccount,creditAccount,amount,entryDate[,description]`,
        });
        continue;
      }

      const debitAccount = parts[0].trim();
      const creditAccount = parts[1].trim();
      const amountStr = parts[2].trim();
      const entryDate = parts[3].trim();
      const description = parts[4]?.trim() || '';

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        rows.push({
          debitAccount,
          creditAccount,
          amount: 0,
          entryDate,
          description: description || undefined,
          error: `Row ${i + 1}: Invalid amount "${amountStr}"`,
        });
        continue;
      }

      if (!isValidAccount(debitAccount)) {
        rows.push({
          debitAccount,
          creditAccount,
          amount,
          entryDate,
          description: description || undefined,
          error: `Row ${i + 1}: Invalid debit account "${debitAccount}"`,
        });
        continue;
      }

      if (!isValidAccount(creditAccount)) {
        rows.push({
          debitAccount,
          creditAccount,
          amount,
          entryDate,
          description: description || undefined,
          error: `Row ${i + 1}: Invalid credit account "${creditAccount}"`,
        });
        continue;
      }

      if (debitAccount === creditAccount) {
        rows.push({
          debitAccount,
          creditAccount,
          amount,
          entryDate,
          description: description || undefined,
          error: `Row ${i + 1}: Debit and credit accounts cannot be the same`,
        });
        continue;
      }

      if (debitAccount === 'retained_earnings' || creditAccount === 'retained_earnings') {
        rows.push({
          debitAccount,
          creditAccount,
          amount,
          entryDate,
          description: description || undefined,
          error: `Row ${i + 1}: Use owner_shareholder_account instead of retained_earnings for opening balances`,
        });
        continue;
      }

      const dateMatch = entryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        rows.push({
          debitAccount,
          creditAccount,
          amount,
          entryDate,
          description: description || undefined,
          error: `Row ${i + 1}: Invalid date format. Use YYYY-MM-DD`,
        });
        continue;
      }

      rows.push({
        debitAccount,
        creditAccount,
        amount,
        entryDate,
        description: description || undefined,
      });
    }

    this.parsedRows = rows;
    const errorCount = rows.filter((r) => r.error).length;
    if (errorCount > 0) {
      this.parseError = `${errorCount} row(s) have errors. Fix them before importing.`;
    }
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === ',' && !inQuotes) || c === '\t') {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  get validRows(): ParsedRow[] {
    return this.parsedRows.filter((r) => !r.error);
  }

  get hasValidRows(): boolean {
    return this.validRows.length > 0;
  }

  get canSubmit(): boolean {
    return this.hasValidRows && this.validRows.length <= 500 && !this.parseError;
  }

  getAccountLabel(code: string): string {
    if (!code) return '—';
    if (code.startsWith('ledger:')) {
      return code;
    }
    const meta = (ACCOUNT_METADATA as Record<string, { name: string }>)[code];
    return meta?.name ?? code;
  }

  submit(): void {
    if (!this.canSubmit) return;

    const entries: CreateJournalEntryPayload[] = this.validRows.map((r) => ({
      debitAccount: r.debitAccount,
      creditAccount: r.creditAccount,
      amount: r.amount,
      entryDate: r.entryDate,
      description: r.description,
    }));

    this.loading = true;
    this.journalEntriesService.bulkCreateEntries(entries).subscribe({
      next: (result) => {
        this.loading = false;
        this.snackBar.open(
          `${result.created.length} journal entries imported successfully`,
          'Close',
          { duration: 4000 },
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          'Failed to import journal entries';
        this.snackBar.open(msg, 'Close', {
          duration: 6000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  loadTemplate(): void {
    this.csvText = this.csvFormat;
    this.parseCsv();
  }
}
