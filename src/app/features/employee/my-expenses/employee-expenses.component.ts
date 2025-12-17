import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { startWith, switchMap, takeUntil } from 'rxjs/operators';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-employee-expenses',
  templateUrl: './employee-expenses.component.html',
  styleUrls: ['./employee-expenses.component.scss'],
})
export class EmployeeExpensesComponent implements OnInit, OnDestroy {
  expenses: Expense[] = [];
  loading = false;

  readonly filters;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly expensesService: ExpensesService,
    private readonly authService: AuthService,
  ) {
    this.filters = this.fb.group({
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit(): void {
    combineLatest([
      this.authService.currentUser$,
      this.filters.valueChanges.pipe(
        startWith(this.filters.getRawValue()),
      ),
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([user]) => {
          if (!user) {
            return [];
          }
          const filterValues = this.filters.getRawValue();
          this.loading = true;
          
          // Convert Date objects to ISO date strings for API
          const formatDate = (date: any): string | undefined => {
            if (!date) return undefined;
            if (date && typeof date === 'object' && date.getTime && typeof date.getTime === 'function') {
              return new Date(date).toISOString().substring(0, 10);
            }
            return date;
          };
          
          return this.expensesService.listExpenses({
            createdBy: user.id,
            startDate: formatDate(filterValues.startDate),
            endDate: formatDate(filterValues.endDate),
          });
        }),
      )
      .subscribe((expenses) => {
        this.loading = false;
        // Sort by date descending (latest first)
        const sorted = (expenses as Expense[] ?? []).sort((a, b) => {
          const dateA = new Date(a.expenseDate).getTime();
          const dateB = new Date(b.expenseDate).getTime();
          return dateB - dateA; // Descending order
        });
        this.expenses = sorted;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}

