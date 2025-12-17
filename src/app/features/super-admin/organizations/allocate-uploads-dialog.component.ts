import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { UploadUsage } from '../../../core/models/license-key.model';

export interface AllocateUploadsDialogData {
  organizationId: string;
  organizationName: string;
  licenseId: string;
  currentUsage: UploadUsage;
}

@Component({
  selector: 'app-allocate-uploads-dialog',
  templateUrl: './allocate-uploads-dialog.component.html',
  styleUrls: ['./allocate-uploads-dialog.component.scss'],
})
export class AllocateUploadsDialogComponent {
  loading = false;
  readonly form;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: AllocateUploadsDialogData,
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<AllocateUploadsDialogComponent>,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      additionalUploads: [
        0,
        [Validators.required, Validators.min(0), Validators.max(100000)],
      ],
    });
  }

  get currentUsage() {
    return this.data.currentUsage;
  }

  get totalAfterAllocation() {
    const additional = this.form.get('additionalUploads')?.value || 0;
    return this.currentUsage.totalAllowed + additional;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const additionalUploads = this.form.get('additionalUploads')?.value || 0;
    if (additionalUploads <= 0) {
      this.snackBar.open(
        'Please enter a positive number of uploads to allocate',
        'Close',
        { duration: 3000 },
      );
      return;
    }

    this.loading = true;
    this.licenseKeysService
      .allocateUploads(this.data.licenseId, { additionalUploads })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open(
            `Successfully allocated ${additionalUploads} additional uploads`,
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          const message =
            error?.error?.message ??
            'Failed to allocate uploads. Please try again.';
          this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

