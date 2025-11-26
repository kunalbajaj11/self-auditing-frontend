import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';

@Component({
  selector: 'app-vendor-form-dialog',
  templateUrl: './vendor-form-dialog.component.html',
  styleUrls: ['./vendor-form-dialog.component.scss'],
})
export class VendorFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<VendorFormDialogComponent>,
    private readonly vendorsService: VendorsService,
    @Inject(MAT_DIALOG_DATA) public data: Vendor | null,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      displayName: [''],
      vendorTrn: [''],
      category: [''],
      address: [''],
      city: [''],
      country: [''],
      phone: [''],
      email: ['', Validators.email],
      website: [''],
      contactPerson: [''],
      preferredCurrency: ['AED'],
      paymentTerms: [null, [this.numberValidator]],
      notes: [''],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        displayName: this.data.displayName || '',
        vendorTrn: this.data.vendorTrn || '',
        category: this.data.category || '',
        address: this.data.address || '',
        city: this.data.city || '',
        country: this.data.country || '',
        phone: this.data.phone || '',
        email: this.data.email || '',
        website: this.data.website || '',
        contactPerson: this.data.contactPerson || '',
        preferredCurrency: this.data.preferredCurrency || 'AED',
        paymentTerms: this.data.paymentTerms || null,
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
      this.form.markAllAsTouched();
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
      ? this.vendorsService.updateVendor(this.data.id, payload)
      : this.vendorsService.createVendor(payload);

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

