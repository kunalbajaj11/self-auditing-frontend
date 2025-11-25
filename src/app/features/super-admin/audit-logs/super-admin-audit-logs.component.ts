import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuditLogsService, AuditLogItem } from '../../../core/services/audit-logs.service';
import { SuperAdminService, OrganizationUsage } from '../../../core/services/super-admin.service';

@Component({
  selector: 'app-super-admin-audit-logs',
  templateUrl: './super-admin-audit-logs.component.html',
  styleUrls: ['./super-admin-audit-logs.component.scss'],
})
export class SuperAdminAuditLogsComponent implements OnInit {
  readonly columns = ['timestamp', 'organization', 'user', 'entity', 'action'] as const;
  readonly dataSource = new MatTableDataSource<AuditLogItem>([]);

  organizations: OrganizationUsage[] = [];
  loading = false;
  error: string | null = null;

  readonly filters;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auditLogsService: AuditLogsService,
    private readonly superAdminService: SuperAdminService,
  ) {
    this.filters = this.fb.group({
      organizationId: [''],
      entityType: [''],
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadLogs());
  }

  refresh(): void {
    this.loadLogs();
  }

  private loadOrganizations(): void {
    this.superAdminService.usage().subscribe({
      next: (usage) => {
        this.organizations = usage;
        if (!this.filters.value.organizationId && usage.length) {
          this.filters.patchValue({ organizationId: usage[0].id }, { emitEvent: false });
          this.loadLogs();
        }
      },
      error: () => {
        this.error = 'Failed to load organization list';
      },
    });
  }

  private loadLogs(): void {
    const { organizationId, entityType, startDate, endDate } = this.filters.getRawValue();
    if (!organizationId) {
      this.dataSource.data = [];
      return;
    }

    this.loading = true;
    this.error = null;

    this.auditLogsService
      .listForOrganization(organizationId, {
        entityType: entityType ?? undefined,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      })
      .subscribe({
        next: (logs) => {
          this.loading = false;
          // Sort by timestamp descending (latest first)
          const sorted = logs.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA; // Descending order
          });
          this.dataSource.data = sorted;
        },
        error: () => {
          this.loading = false;
          this.error = 'Unable to load audit logs for the selected organization.';
        },
      });
  }
}

