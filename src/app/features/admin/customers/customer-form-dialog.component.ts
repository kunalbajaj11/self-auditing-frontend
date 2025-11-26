import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CustomersService, Customer } from '../../../core/services/customers.service';

@Component({
  selector: 'app-customer-form-dialog',
  templateUrl: './customer-form-dialog.component.html',
  styleUrls: ['./customer-form-dialog.component.scss'],
})
export class CustomerFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CustomerFormDialogComponent>,
    private readonly customersService: CustomersService,
    @Inject(MAT_DIALOG_DATA) public data: Customer | null,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      displayName: [''],
      customerTrn: [''],
      address: [''],
      city: [''],
      country: [''],
      phone: [''],
      email: ['', Validators.email],
      contactPerson: [''],
      preferredCurrency: ['AED'],
      paymentTerms: [null, [this.numberValidator]],
      isActive: [true],
      notes: [''],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        displayName: this.data.displayName || '',
        customerTrn: this.data.customerTrn || '',
        address: this.data.address || '',
        city: this.data.city || '',
        country: this.data.country || '',
        phone: this.data.phone || '',
        email: this.data.email || '',
        contactPerson: this.data.contactPerson || '',
        preferredCurrency: this.data.preferredCurrency || 'AED',
        paymentTerms: this.data.paymentTerms || null,
        isActive: this.data.isActive,
        notes: this.data.notes || '',
      });
    }
  }

  numberValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    const num = Number(control.value);
    return !isNaN(num) && num >= 0 && num <= 365
      ? null
      : { invalidNumber: { value: control.value } };
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    const payload = this.form.value;
    
    // Clean up empty strings
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    const operation = this.data
      ? this.customersService.updateCustomer(this.data.id, payload)
      : this.customersService.createCustomer(payload);

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
}

