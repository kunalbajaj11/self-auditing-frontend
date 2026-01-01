import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PayrollService, PayrollRun, PayrollEntry } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-payroll-run-detail-dialog',
  templateUrl: './payroll-run-detail-dialog.component.html',
  styleUrls: ['./payroll-run-detail-dialog.component.scss'],
})
export class PayrollRunDetailDialogComponent implements OnInit {
  loading = false;
  payrollRun: PayrollRun | null = null;
  displayedColumns = ['employee', 'basicSalary', 'grossSalary', 'deductions', 'netSalary', 'payslipStatus', 'actions'];

  constructor(
    private readonly dialogRef: MatDialogRef<PayrollRunDetailDialogComponent>,
    private readonly payrollService: PayrollService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { payrollRunId: string },
  ) {}

  ngOnInit(): void {
    this.loadPayrollRun();
  }

  loadPayrollRun(): void {
    this.loading = true;
    this.payrollService.getPayrollRun(this.data.payrollRunId).subscribe({
      next: (run) => {
        this.loading = false;
        this.payrollRun = run;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load payroll run details', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        this.dialogRef.close();
      },
    });
  }

  getEmployeeName(entry: PayrollEntry): string {
    return entry.user?.name || 'N/A';
  }

  getEmployeeEmail(entry: PayrollEntry): string {
    return entry.user?.email || '';
  }

  generatePayslip(entry: PayrollEntry): void {
    this.loading = true;
    this.payrollService.generatePayslip(entry.id).subscribe({
      next: (blob) => {
        this.loading = false;
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payslip-${entry.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        // Reload payroll run to update payslip status
        this.loadPayrollRun();
        
        this.snackBar.open('Payslip generated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to generate payslip', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  sendPayslipEmail(entry: PayrollEntry): void {
    if (!entry.payslipGenerated) {
      this.snackBar.open('Please generate payslip first', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    this.payrollService.sendPayslipEmail(entry.id).subscribe({
      next: () => {
        this.loading = false;
        // Reload payroll run to update email status
        this.loadPayrollRun();
        this.snackBar.open('Payslip email sent successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to send payslip email', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  sendAllPayslipEmails(): void {
    if (!this.payrollRun?.payrollEntries || this.payrollRun.payrollEntries.length === 0) {
      this.snackBar.open('No payroll entries found', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    const entriesWithoutPayslips = this.payrollRun.payrollEntries.filter(
      (entry) => !entry.payslipGenerated,
    );

    if (entriesWithoutPayslips.length > 0) {
      this.snackBar.open(
        `Please generate payslips for ${entriesWithoutPayslips.length} employee(s) first`,
        'Close',
        {
          duration: 4000,
          panelClass: ['snack-error'],
        },
      );
      return;
    }

    this.loading = true;
    this.payrollService.sendBulkPayslipEmails(this.payrollRun.id).subscribe({
      next: (result) => {
        this.loading = false;
        // Reload payroll run to update email status
        this.loadPayrollRun();
        this.snackBar.open(
          `Sent ${result.sent} of ${result.total} payslip emails${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
          'Close',
          {
            duration: 5000,
            panelClass: result.failed > 0 ? ['snack-warn'] : [],
          },
        );
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to send payslip emails', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  processPayrollRun(): void {
    if (!this.payrollRun) return;
    
    if (this.payrollRun.status !== 'draft') {
      this.snackBar.open('Only draft payroll runs can be processed', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    this.payrollService.processPayrollRun(this.payrollRun.id).subscribe({
      next: () => {
        this.loading = false;
        this.loadPayrollRun();
        this.snackBar.open('Payroll run processed successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to process payroll run', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

