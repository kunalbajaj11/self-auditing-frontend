import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaxForm } from '../../../core/models/tax-form.model';
import { TaxFormsService } from '../../../core/services/tax-forms.service';

@Component({
  selector: 'app-tax-form-detail-dialog',
  templateUrl: './tax-form-detail-dialog.component.html',
  styleUrls: ['./tax-form-detail-dialog.component.scss'],
})
export class TaxFormDetailDialogComponent {
  form: TaxForm;
  filingReference = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TaxForm,
    private readonly dialogRef: MatDialogRef<TaxFormDetailDialogComponent>,
    private readonly taxFormsService: TaxFormsService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = data;
  }

  markAsFiled(): void {
    if (!this.filingReference.trim()) {
      this.snackBar.open('Please enter filing reference', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.taxFormsService.markFormAsFiled(this.form.id, this.filingReference).subscribe({
      next: () => {
        this.snackBar.open('Form marked as filed', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error marking form as filed:', error);
        this.snackBar.open('Error marking form as filed', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

