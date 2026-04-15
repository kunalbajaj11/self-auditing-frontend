import { Pipe, PipeTransform, inject } from '@angular/core';
import { OrganizationContextService } from '../../core/services/organization-context.service';

/** Current org currency code (e.g. INR). `pure: false` so it updates after Shell refresh. */
@Pipe({
  name: 'orgCurrencyCode',
  pure: false,
  standalone: true,
})
export class OrgCurrencyCodePipe implements PipeTransform {
  private readonly ctx = inject(OrganizationContextService);

  transform(_value?: unknown): string {
    return this.ctx.currency();
  }
}
