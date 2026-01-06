import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComplianceService } from '../../../core/services/compliance.service';
import {
  ComplianceDeadline,
  ComplianceType,
  DeadlineStatus,
  ComplianceSummary,
} from '../../../core/models/compliance.model';
import { CreateDeadlineDialogComponent } from './create-deadline-dialog.component';

@Component({
  selector: 'app-admin-compliance',
  templateUrl: './admin-compliance.component.html',
  styleUrls: ['./admin-compliance.component.scss'],
})
export class AdminComplianceComponent implements OnInit {
  readonly columns = [
    'complianceType',
    'period',
    'dueDate',
    'status',
    'filingFrequency',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<ComplianceDeadline>([]);
  loading = false;
  summary: ComplianceSummary | null = null;
  viewMode: 'calendar' | 'deadlines' | 'summary' = 'deadlines';

  form: FormGroup;
  complianceTypes = Object.values(ComplianceType);

  constructor(
    private readonly fb: FormBuilder,
    private readonly complianceService: ComplianceService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      complianceType: [''],
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit(): void {
    this.loadDeadlines();
    this.loadSummary();
  }

  loadDeadlines(): void {
    this.loading = true;
    const startDate = this.form.get('startDate')?.value || undefined;
    const endDate = this.form.get('endDate')?.value || undefined;
    const complianceType = this.form.get('complianceType')?.value || undefined;

    this.complianceService.getDeadlines(startDate, endDate, complianceType).subscribe({
      next: (deadlines) => {
        this.dataSource.data = deadlines;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading deadlines:', error);
        this.snackBar.open('Error loading deadlines', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  loadSummary(): void {
    const startDate = this.form.get('startDate')?.value || undefined;
    const endDate = this.form.get('endDate')?.value || undefined;

    this.complianceService.getComplianceSummary(startDate, endDate).subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: (error) => {
        console.error('Error loading summary:', error);
      },
    });
  }

  loadUpcoming(): void {
    this.loading = true;
    this.complianceService.getUpcomingDeadlines(30).subscribe({
      next: (deadlines) => {
        this.dataSource.data = deadlines;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading upcoming deadlines:', error);
        this.snackBar.open('Error loading upcoming deadlines', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  loadOverdue(): void {
    this.loading = true;
    this.complianceService.getOverdueDeadlines().subscribe({
      next: (deadlines) => {
        this.dataSource.data = deadlines;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading overdue deadlines:', error);
        this.snackBar.open('Error loading overdue deadlines', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateDeadlineDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadDeadlines();
        this.loadSummary();
      }
    });
  }

  updateStatus(deadline: ComplianceDeadline, status: DeadlineStatus): void {
    this.complianceService.updateDeadlineStatus(deadline.id, status).subscribe({
      next: () => {
        this.snackBar.open('Status updated', 'Close', { duration: 3000 });
        this.loadDeadlines();
        this.loadSummary();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.snackBar.open('Error updating status', 'Close', { duration: 3000 });
      },
    });
  }

  getComplianceTypeLabel(type: ComplianceType): string {
    const labels: Record<ComplianceType, string> = {
      [ComplianceType.VAT_RETURN]: 'VAT Return',
      [ComplianceType.TDS_RETURN]: 'TDS Return',
      [ComplianceType.EPF_CHALLAN]: 'EPF Challan',
      [ComplianceType.ESI_CHALLAN]: 'ESI Challan',
      [ComplianceType.PROFESSIONAL_TAX]: 'Professional Tax',
      [ComplianceType.GSTR_1]: 'GSTR-1',
      [ComplianceType.GSTR_3B]: 'GSTR-3B',
      [ComplianceType.ANNUAL_RETURN]: 'Annual Return',
    };
    return labels[type] || type;
  }

  getStatusColor(status: DeadlineStatus): string {
    const colors: Record<DeadlineStatus, string> = {
      [DeadlineStatus.PENDING]: 'gray',
      [DeadlineStatus.UPCOMING]: 'orange',
      [DeadlineStatus.DUE_TODAY]: 'red',
      [DeadlineStatus.OVERDUE]: 'red',
      [DeadlineStatus.FILED]: 'green',
      [DeadlineStatus.EXTENDED]: 'blue',
    };
    return colors[status] || 'gray';
  }

  isOverdue(deadline: ComplianceDeadline): boolean {
    if (deadline.status === DeadlineStatus.FILED) {
      return false;
    }
    const dueDate = new Date(deadline.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }
}

