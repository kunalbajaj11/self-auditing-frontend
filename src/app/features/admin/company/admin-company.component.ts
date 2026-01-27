import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Organization } from '../../../core/models/organization.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-company',
  templateUrl: './admin-company.component.html',
  styleUrls: ['./admin-company.component.scss'],
})
export class AdminCompanyComponent implements OnInit {
  organization: Organization | null = null;
  loading = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly organizationService: OrganizationService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      vatNumber: [''],
      currency: ['AED', [Validators.required]],
      contactPerson: [''],
      contactEmail: ['', [Validators.email]],
      address: [''],
      bankAccountHolder: [''],
      bankName: [''],
      bankAccountNumber: [''],
      bankIban: [''],
      bankBranch: [''],
      bankSwiftCode: [''],
    });
  }

  ngOnInit(): void {
    this.loadOrganization();
  }

  save(): void {
    if (this.form.invalid || !this.organization) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const payload = this.normalizePayload(this.form.getRawValue());
    this.organizationService.updateMyOrganization(payload).subscribe({
      next: (org) => {
        this.loading = false;
        this.organization = org;
        this.snackBar.open('Company profile updated', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(
          'Failed to update company profile, please try again.',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  private loadOrganization(): void {
    this.organizationService.getMyOrganization().subscribe((org) => {
      this.organization = org;
      this.form.patchValue({
        name: org.name,
        vatNumber: org.vatNumber ?? '',
        currency: org.currency ?? 'AED',
        contactPerson: org.contactPerson ?? '',
        contactEmail: org.contactEmail ?? '',
        address: org.address ?? '',
        bankAccountHolder: org.bankAccountHolder ?? '',
        bankName: org.bankName ?? '',
        bankAccountNumber: org.bankAccountNumber ?? '',
        bankIban: org.bankIban ?? '',
        bankBranch: org.bankBranch ?? '',
        bankSwiftCode: org.bankSwiftCode ?? '',
      });
    });
  }

  private normalizePayload(value: any): Partial<Organization> {
    return {
      name: value.name ?? '',
      vatNumber: value.vatNumber ?? undefined,
      currency: value.currency ?? undefined,
      contactPerson: value.contactPerson ?? undefined,
      contactEmail: value.contactEmail ?? undefined,
      address: value.address ?? undefined,
      bankAccountHolder: value.bankAccountHolder ?? undefined,
      bankName: value.bankName ?? undefined,
      bankAccountNumber: value.bankAccountNumber ?? undefined,
      bankIban: value.bankIban ?? undefined,
      bankBranch: value.bankBranch ?? undefined,
      bankSwiftCode: value.bankSwiftCode ?? undefined,
    };
  }
}

