import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { PayrollService, SalaryProfile, CreateSalaryProfilePayload, SalaryComponentPayload } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-salary-profile-form-dialog',
  templateUrl: './salary-profile-form-dialog.component.html',
  styleUrls: ['./salary-profile-form-dialog.component.scss'],
})
export class SalaryProfileFormDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  readonly isEdit: boolean;
  private subscriptions: Subscription[] = [];

  readonly componentTypes = [
    { value: 'allowance', label: 'Allowance' },
    { value: 'deduction', label: 'Deduction' },
    { value: 'overtime', label: 'Overtime' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'commission', label: 'Commission' },
  ];

  readonly calculationTypes = [
    { value: 'fixed', label: 'Fixed Amount' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'hourly', label: 'Hourly Rate' },
  ];

  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<SalaryProfileFormDialogComponent>,
    private readonly payrollService: PayrollService,
    @Inject(MAT_DIALOG_DATA) public data: SalaryProfile | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      employeeName: [data?.employeeName || data?.user?.name || '', Validators.required],
      email: [data?.email || data?.user?.email || '', [Validators.email]],
      basicSalary: [data?.basicSalary ? parseFloat(data.basicSalary) : null, [Validators.required, Validators.min(0)]],
      currency: [data?.currency || 'AED', Validators.required],
      effectiveDate: [data?.effectiveDate || '', Validators.required],
      endDate: [data?.endDate || ''],
      salaryComponents: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (this.data?.salaryComponents && this.data.salaryComponents.length > 0) {
      this.data.salaryComponents.forEach((comp) => {
        this.addComponent(comp);
      });
    }
  }

  get salaryComponents(): FormArray {
    return this.form.get('salaryComponents') as FormArray;
  }

  addComponent(component?: any): void {
    const componentGroup = this.fb.group({
      componentType: [component?.componentType || 'allowance', Validators.required],
      name: [component?.name || '', Validators.required],
      calculationType: [component?.calculationType || 'fixed', Validators.required],
      amount: [component?.amount ? parseFloat(component.amount) : null],
      percentage: [component?.percentage ? parseFloat(component.percentage) : null],
      hourlyRate: [component?.hourlyRate ? parseFloat(component.hourlyRate) : null],
      isTaxable: [component?.isTaxable !== undefined ? component.isTaxable : true],
      priority: [component?.priority || 0, [Validators.min(0)]],
    });

    // Add validators based on calculation type
    const calcTypeCtrl = componentGroup.get('calculationType');
    if (calcTypeCtrl) {
      const sub = calcTypeCtrl.valueChanges.subscribe((calcType: string) => {
        const amountCtrl = componentGroup.get('amount');
        const percentageCtrl = componentGroup.get('percentage');
        const hourlyRateCtrl = componentGroup.get('hourlyRate');

        // Reset validators and clear values
        amountCtrl?.clearValidators();
        percentageCtrl?.clearValidators();
        hourlyRateCtrl?.clearValidators();

        if (calcType === 'fixed') {
          amountCtrl?.setValidators([Validators.required, Validators.min(0)]);
          percentageCtrl?.setValue(null, { emitEvent: false });
          hourlyRateCtrl?.setValue(null, { emitEvent: false });
        } else if (calcType === 'percentage') {
          percentageCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
          amountCtrl?.setValue(null, { emitEvent: false });
          hourlyRateCtrl?.setValue(null, { emitEvent: false });
        } else if (calcType === 'hourly') {
          hourlyRateCtrl?.setValidators([Validators.required, Validators.min(0)]);
          amountCtrl?.setValue(null, { emitEvent: false });
          percentageCtrl?.setValue(null, { emitEvent: false });
        }

        amountCtrl?.updateValueAndValidity({ emitEvent: false });
        percentageCtrl?.updateValueAndValidity({ emitEvent: false });
        hourlyRateCtrl?.updateValueAndValidity({ emitEvent: false });
      });
      this.subscriptions.push(sub);
    }

    // Set initial validators
    const calcType = component?.calculationType || componentGroup.get('calculationType')?.value;
    if (calcType === 'fixed') {
      componentGroup.get('amount')?.setValidators([Validators.required, Validators.min(0)]);
    } else if (calcType === 'percentage') {
      componentGroup.get('percentage')?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
    } else if (calcType === 'hourly') {
      componentGroup.get('hourlyRate')?.setValidators([Validators.required, Validators.min(0)]);
    }
    componentGroup.get('amount')?.updateValueAndValidity({ emitEvent: false });
    componentGroup.get('percentage')?.updateValueAndValidity({ emitEvent: false });
    componentGroup.get('hourlyRate')?.updateValueAndValidity({ emitEvent: false });

    this.salaryComponents.push(componentGroup);
  }

  removeComponent(index: number): void {
    this.salaryComponents.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    // Format dates if they are Date objects
    let effectiveDate = formValue.effectiveDate;
    if (effectiveDate instanceof Date) {
      effectiveDate = effectiveDate.toISOString().split('T')[0];
    }
    let endDate = formValue.endDate;
    if (endDate instanceof Date) {
      endDate = endDate.toISOString().split('T')[0];
    }

    const payload: CreateSalaryProfilePayload = {
      employeeName: formValue.employeeName || undefined,
      email: formValue.email || undefined,
      basicSalary: formValue.basicSalary,
      currency: formValue.currency,
      effectiveDate: effectiveDate,
      endDate: endDate || undefined,
      salaryComponents: formValue.salaryComponents
        .filter((comp: any) => comp.name && comp.componentType && comp.calculationType)
        .map((comp: any) => {
          const component: SalaryComponentPayload = {
            componentType: comp.componentType,
            name: comp.name,
            calculationType: comp.calculationType,
            isTaxable: comp.isTaxable,
            priority: comp.priority || 0,
          };

          if (comp.calculationType === 'fixed') {
            component.amount = comp.amount;
          } else if (comp.calculationType === 'percentage') {
            component.percentage = comp.percentage;
          } else if (comp.calculationType === 'hourly') {
            component.hourlyRate = comp.hourlyRate;
          }

          return component;
        }),
    };

    const operation = this.isEdit
      ? this.payrollService.updateSalaryProfile(this.data!.id, payload)
      : this.payrollService.createSalaryProfile(payload);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}

