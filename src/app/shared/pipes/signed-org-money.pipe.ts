import { Pipe, PipeTransform, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { OrganizationContextService } from '../../core/services/organization-context.service';

/** e.g. `+INR 1,234.56` or `-INR 100.00` */
@Pipe({
  name: 'signedOrgMoney',
  pure: false,
  standalone: true,
})
export class SignedOrgMoneyPipe implements PipeTransform {
  private readonly ctx = inject(OrganizationContextService);
  private readonly decimal = inject(DecimalPipe);

  transform(
    value: number | string | null | undefined,
    digitsInfo: string = '1.2-2',
    locale: string = 'en-US',
  ): string {
    const n = value === null || value === undefined || value === '' ? 0 : Number(value);
    const sign = n >= 0 ? '+' : '-';
    const code = this.ctx.currency();
    const formatted = this.decimal.transform(Math.abs(n), digitsInfo, locale);
    return `${sign}${code} ${formatted ?? Math.abs(n).toFixed(2)}`;
  }
}
