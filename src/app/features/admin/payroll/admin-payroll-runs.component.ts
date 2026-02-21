import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { PayrollService, PayrollRun } from '../../../core/services/payroll.service';
import { PayrollRunFormDialogComponent } from './payroll-run-form-dialog.component';
import { PayrollRunDetailDialogComponent } from './payroll-run-detail-dialog.component';

@Component({
  selector: 'app-admin-payroll-runs',
  templateUrl: './admin-payroll-runs.component.html',
  styleUrls: ['./admin-payroll-runs.component.scss'],
})
export class AdminPayrollRunsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly columns = ['payrollPeriod', 'payDate', 'status', 'totalNetAmount', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<PayrollRun>([]);
  loading = false;

  constructor(
    private readonly payrollService: PayrollService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadPayrollRuns();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadPayrollRuns(): void {
    this.loading = true;
    this.payrollService.listPayrollRuns().subscribe({
      next: (runs) => {
        this.loading = false;
        this.dataSource.data = runs;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load payroll runs', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openDialog(run?: PayrollRun): void {
    const dialogRef = this.dialog.open(PayrollRunFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: run ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          run ? 'Payroll run updated' : 'Payroll run created',
          'Close',
          { duration: 3000 },
        );
        this.loadPayrollRuns();
      }
    });
  }

  viewDetails(run: PayrollRun): void {
    this.dialog.open(PayrollRunDetailDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { payrollRunId: run.id },
    });
  }
}

