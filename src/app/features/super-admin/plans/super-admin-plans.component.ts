import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { PlansService } from '../../../core/services/plans.service';
import { PlanFormDialogComponent } from './plan-form-dialog.component';
import { SubscriptionPlan } from '../../../core/models/plan.model';

@Component({
  selector: 'app-super-admin-plans',
  templateUrl: './super-admin-plans.component.html',
  styleUrls: ['./super-admin-plans.component.scss'],
})
export class SuperAdminPlansComponent implements OnInit {
  readonly columns = [
    'name',
    'limits',
    'pricing',
    'createdAt',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<SubscriptionPlan>([]);
  loading = false;
  error: string | null = null;

  constructor(
    private readonly plansService: PlansService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  refresh(): void {
    this.loadPlans();
  }

  createPlan(): void {
    const dialogRef = this.dialog.open(PlanFormDialogComponent, {
      width: '480px',
      data: null,
    });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.snackBar.open('Plan created successfully', 'Close', {
          duration: 3000,
        });
        this.loadPlans();
      }
    });
  }

  editPlan(plan: SubscriptionPlan): void {
    const dialogRef = this.dialog.open(PlanFormDialogComponent, {
      width: '480px',
      data: plan,
    });
    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.snackBar.open('Plan updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadPlans();
      }
    });
  }

  deletePlan(plan: SubscriptionPlan): void {
    const confirmed = confirm(
      `Delete plan "${plan.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    this.plansService.deletePlan(plan.id).subscribe({
      next: () => {
        this.snackBar.open('Plan removed', 'Close', { duration: 3000 });
        this.loadPlans();
      },
      error: () => {
        this.snackBar.open(
          'Failed to delete plan. Remove any associations first.',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  private loadPlans(): void {
    this.loading = true;
    this.error = null;
    this.plansService.listPlans().subscribe({
      next: (plans) => {
        this.loading = false;
        this.dataSource.data = plans;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load plans.';
      },
    });
  }
}

