import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { PayrollService, SalaryProfile } from '../../../core/services/payroll.service';
import { SalaryProfileFormDialogComponent } from './salary-profile-form-dialog.component';

@Component({
  selector: 'app-admin-salary-profiles',
  templateUrl: './admin-salary-profiles.component.html',
  styleUrls: ['./admin-salary-profiles.component.scss'],
})
export class AdminSalaryProfilesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly columns = ['user', 'basicSalary', 'currency', 'effectiveDate', 'isActive', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<SalaryProfile>([]);
  loading = false;

  constructor(
    private readonly payrollService: PayrollService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadSalaryProfiles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadSalaryProfiles(): void {
    this.loading = true;
    this.payrollService.listSalaryProfiles().subscribe({
      next: (profiles) => {
        this.loading = false;
        this.dataSource.data = profiles;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load salary profiles', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openDialog(profile?: SalaryProfile): void {
    const dialogRef = this.dialog.open(SalaryProfileFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: profile ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          profile ? 'Salary profile updated' : 'Salary profile created',
          'Close',
          { duration: 3000 },
        );
        this.loadSalaryProfiles();
      }
    });
  }
}

