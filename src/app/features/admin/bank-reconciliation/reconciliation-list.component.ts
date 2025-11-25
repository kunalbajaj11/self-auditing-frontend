import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { BankReconciliationService } from '../../../core/services/bank-reconciliation.service';
import { ReconciliationRecord } from '../../../core/models/reconciliation.model';
import { LicenseService } from '../../../core/services/license.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-reconciliation-list',
  templateUrl: './reconciliation-list.component.html',
  styleUrls: ['./reconciliation-list.component.scss'],
})
export class ReconciliationListComponent implements OnInit {
  readonly columns = ['date', 'period', 'matched', 'unmatched', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<ReconciliationRecord>([]);
  loading = false;
  isEnterprise$: Observable<boolean>;

  constructor(
    private readonly reconciliationService: BankReconciliationService,
    private readonly router: Router,
    private readonly licenseService: LicenseService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
  }

  ngOnInit(): void {
    this.loadReconciliations();
  }

  loadReconciliations(): void {
    this.isEnterprise$.subscribe((isEnterprise) => {
      if (!isEnterprise) {
        this.loading = false;
        return;
      }
      this.loading = true;
      this.reconciliationService.listReconciliations().subscribe({
        next: (records) => {
          this.dataSource.data = records;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
    });
  }

  viewDetail(record: ReconciliationRecord): void {
    this.router.navigate(['/admin/bank-reconciliation', record.id]);
  }

  uploadNew(): void {
    this.router.navigate(['/admin/bank-reconciliation/upload']);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatCurrency(value: string): string {
    const num = parseFloat(value);
    return `AED ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

