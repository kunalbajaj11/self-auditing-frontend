import { Pipe, PipeTransform, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { OrganizationContextService } from '../../core/services/organization-context.service';

/** Renders amounts like `INR 1,234.56` using cached org currency. `pure: false` so it updates after Shell refresh. */
@Pipe({
  name: 'orgMoney',
  pure: false,
  standalone: true,
})
export class OrgMoneyPipe implements PipeTransform {
  private readonly ctx = inject(OrganizationContextService);
  private readonly decimal = inject(DecimalPipe);

  transform(
    value: number | string | null | undefined,
    digitsInfo: string = '1.2-2',
    locale: string = 'en-US',
  ): string {
    const code = this.ctx.currency();
    if (value === null || value === undefined || value === '') {
      return `${code} ${this.decimal.transform(0, digitsInfo, locale) ?? '0.00'}`;
    }
    const n = typeof value === 'string' ? Number(value) : value;
    const formatted = this.decimal.transform(n, digitsInfo, locale);
    return `${code} ${formatted ?? String(n)}`;
  }
}
